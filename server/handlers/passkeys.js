const crypto=require('node:crypto');
const S=require('../../lib/supabase-server');
const {secureApi,cleanText}=require('../../lib/api-security');
const {allowAuth,callbackUrl}=require('../../lib/auth-flows');
const {reauthenticate,adminAuth,claimUsername,fail}=require('../../lib/account-security');
const UUID=/^[0-9a-f-]{36}$/;
function ceremonyCookie(req) {return /(?:^|;\s*)wonder_ceremony=([0-9a-f-]{36})(?:;|$)/.exec(req.headers.cookie||'')?.[1];}
function setCeremony(res,id,seconds=300){const previous=res.getHeader('Set-Cookie')||[];res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:[previous]),`wonder_ceremony=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`]);}
async function storeChallenge(res,options,kind,origin,userId=null) {
  const id=crypto.randomUUID();
  await S.rest('/wonder_passkey_challenges',{admin:true,method:'POST',body:{id,kind,origin,rp_id:new URL(origin).hostname,challenge:options.challenge,user_id:userId,expires_at:new Date(Date.now()+300000).toISOString()}});
  setCeremony(res,id);
  return options;
}
async function consume(req,kind,origin,userId) {
  const id=ceremonyCookie(req);if(!id||!UUID.test(id))throw fail('This device request expired. Try again.');
  const [row]=await S.rest(`/wonder_passkey_challenges?id=eq.${id}&kind=eq.${kind}&origin=eq.${encodeURIComponent(origin)}&expires_at=gt.${new Date().toISOString()}${userId?'&user_id=eq.'+userId:''}`,{admin:true,method:'DELETE',prefer:'return=representation'});
  if(!row)throw fail('This device request expired or was already used. Try again.');
  return row;
}
module.exports=async(req,res)=>{
  if(!secureApi(req,res))return;
  const b=req.body||{};
  try {
    if(!await allowAuth(req,'passkeys',null))return res.status(429).json({error:'Please wait before trying again.'});
    await S.rest(`/wonder_passkey_challenges?expires_at=lt.${new Date().toISOString()}`,{admin:true,method:'DELETE'});
    const origin=new URL(callbackUrl(req)).origin,rpID=new URL(origin).hostname;
    const W=await import('@simplewebauthn/server');
    if(b.action==='authentication_options'){
      const options=await W.generateAuthenticationOptions({rpID,userVerification:'required',timeout:60000});
      return res.status(200).json({options:await storeChallenge(res,options,'authentication',origin)});
    }
    if(b.action==='authentication_verify'){
      const challenge=await consume(req,'authentication',origin);
      if(typeof b.response?.id!=='string'||!/^[A-Za-z0-9_-]{1,1400}$/.test(b.response.id))throw fail('The device response is invalid.');
      const [key]=await S.rest(`/wonder_passkeys?credential_id=eq.${b.response.id}&rp_id=eq.${rpID}&select=*`,{admin:true});
      if(!key)throw fail('This passkey is not registered for this WONDER address.',403);
      const result=await W.verifyAuthenticationResponse({response:b.response,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,credential:{id:key.credential_id,publicKey:new Uint8Array(Buffer.from(key.public_key,'base64url')),counter:Number(key.counter),transports:key.transports}});
      if(!result.verified)throw fail('The device could not verify this request.',403);
      const changed=await S.rest(`/wonder_passkeys?credential_id=eq.${key.credential_id}&counter=eq.${key.counter}`,{admin:true,method:'PATCH',prefer:'return=representation',body:{counter:result.authenticationInfo.newCounter,last_used_at:new Date().toISOString()}});
      if(!changed.length)throw fail('This passkey changed. Try again.',409);
      const [deleting]=await S.rest(`/wonder_account_deletions?user_id=eq.${key.user_id}&select=user_id`,{admin:true});if(deleting)throw fail('This account is being deleted.',403);
      const data=await adminAuth(`/admin/users/${key.user_id}`,undefined,'GET'),user=data.user||data;
      if(!user.email_confirmed_at)throw fail('Confirm your email before using a passkey.',403);
      // A server-verified assertion is exchanged for the existing Supabase session system.
      // generate_link does not deliver an email. Tokens never enter browser-visible JSON.
      const link=await adminAuth('/admin/generate_link',{type:'magiclink',email:user.email});
      if(link.user?.id!==key.user_id||!link.hashed_token)throw new Error('Session exchange unavailable');
      const session=await S.jsonFetch(`${S.SUPABASE_URL}/auth/v1/verify`,{method:'POST',headers:{apikey:S.ANON,'Content-Type':'application/json'},body:JSON.stringify({type:'magiclink',token_hash:link.hashed_token})});
      if(session.user?.id!==key.user_id)throw new Error('Session identity mismatch');
      S.setSessionCookies(res,session);setCeremony(res,'',0);
      return res.status(200).json({user:session.user,token_type:'cookie'});
    }
    const {user}=await S.authRequest(req);if(!user?.id)return res.status(401).json({error:'Sign in first.'});
    if(b.action==='username'){return res.status(200).json({username:await claimUsername(user.id,b.username)});}
    if(b.action==='list'){
      const keys=await S.rest(`/wonder_passkeys?user_id=eq.${user.id}&select=credential_id,label,created_at,last_used_at,rp_id`,{admin:true});
      const [name]=await S.rest(`/wonder_usernames?user_id=eq.${user.id}&select=username`,{admin:true});
      return res.status(200).json({keys,username:name?.username||null,origin});
    }
    if(b.action==='remove'){
      await reauthenticate(user,b.password);
      if(typeof b.id!=='string'||!/^[A-Za-z0-9_-]{1,1400}$/.test(b.id))throw fail('Choose a registered passkey.');
      await S.rest(`/wonder_passkeys?user_id=eq.${user.id}&credential_id=eq.${b.id}`,{admin:true,method:'DELETE'});
      return res.status(200).json({ok:true});
    }
    if(b.action==='registration_options'){
      if(!user.email_confirmed_at)throw fail('Confirm your email first.',403);
      await reauthenticate(user,b.password);
      const keys=await S.rest(`/wonder_passkeys?user_id=eq.${user.id}&rp_id=eq.${rpID}&select=credential_id,transports`,{admin:true});
      if(keys.length>=8)throw fail('Remove an unused passkey before adding another.');
      const options=await W.generateRegistrationOptions({rpName:'WONDER',rpID,userID:new TextEncoder().encode(user.id),userName:user.email,userDisplayName:cleanText(user.user_metadata?.chosen_name,80)||'WONDER member',attestationType:'none',excludeCredentials:keys.map(k=>({id:k.credential_id,transports:k.transports})),authenticatorSelection:{residentKey:'required',userVerification:'required',authenticatorAttachment:'platform'}});
      return res.status(200).json({options:await storeChallenge(res,options,'registration',origin,user.id)});
    }
    if(b.action==='registration_verify'){
      const challenge=await consume(req,'registration',origin,user.id);
      const result=await W.verifyRegistrationResponse({response:b.response,expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
      if(!result.verified||!result.registrationInfo)throw fail('The device could not be registered.');
      const info=result.registrationInfo,c=info.credential;
      await S.rest('/wonder_passkeys',{admin:true,method:'POST',body:{user_id:user.id,credential_id:c.id,public_key:Buffer.from(c.publicKey).toString('base64url'),counter:c.counter,transports:c.transports||[],rp_id:rpID,label:cleanText(b.label,80)||'Personal device',backed_up:info.credentialBackedUp}});
      setCeremony(res,'',0);return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:'Unknown device action.'});
  }catch(e){return res.status([400,403,409].includes(e.status)?e.status:503).json({error:[400,403,409].includes(e.status)?e.message:'Device sign-in could not complete. Use your email or username and password.'});}
};
