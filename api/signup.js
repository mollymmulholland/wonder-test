const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL = String(RAW_SUPABASE_URL || '').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):{}}catch{return {message:text}}
}
async function tokenRequest(grantType,body){
  const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${encodeURIComponent(grantType)}`,{
    method:'POST',
    headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const data=await readJson(response);
  if(!response.ok){const e=new Error(data?.msg||data?.message||data?.error_description||'Unable to sign in.');e.status=response.status;throw e;}
  return data;
}
function sessionPayload(session,extra={}){
  return {
    user:session.user||null,
    access_token:session.access_token||null,
    refresh_token:session.refresh_token||null,
    expires_in:session.expires_in||null,
    token_type:session.token_type||'bearer',
    ...extra
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') {res.setHeader('Allow', 'POST');return res.status(405).json({ error: 'Method not allowed.' });}
  if (!SUPABASE_URL || !SUPABASE_KEY || !SUPABASE_SECRET) return res.status(500).json({ error: 'Supabase is not fully configured on the server.' });

  const body=req.body||{},action=String(body.action||'create');
  try{
    if(action==='refresh'){
      const refreshToken=String(body.refresh_token||'');
      if(!refreshToken)return res.status(400).json({error:'refresh_token is required.'});
      const session=await tokenRequest('refresh_token',{refresh_token:refreshToken});
      return res.status(200).json(sessionPayload(session,{action:'refresh'}));
    }

    const cleanEmail=String(body.email||'').trim().toLowerCase();
    const cleanPassword=String(body.password||'');
    const cleanPhone=String(body.phone||'').trim();
    if(!cleanEmail||cleanPassword.length<8)return res.status(400).json({error:'Enter an email and a password of at least 8 characters.'});

    if(action==='signin'){
      try{
        const session=await tokenRequest('password',{email:cleanEmail,password:cleanPassword});
        return res.status(200).json(sessionPayload(session,{action:'signin'}));
      }catch(e){return res.status(e.status||400).json({error:e.message||'Unable to sign in.'});}
    }

    if(action!=='create')return res.status(400).json({error:'Unknown account action.'});

    const createResponse=await fetch(`${SUPABASE_URL}/auth/v1/admin/users`,{
      method:'POST',
      headers:{apikey:SUPABASE_SECRET,Authorization:`Bearer ${SUPABASE_SECRET}`,'Content-Type':'application/json'},
      body:JSON.stringify({email:cleanEmail,password:cleanPassword,email_confirm:true,user_metadata:{phone:cleanPhone,wonder_preview:true}})
    });
    const created=await readJson(createResponse);
    if(!createResponse.ok){
      const message=String(created?.msg||created?.message||created?.error_description||'Unable to create account.');
      if(/already|registered|exists/i.test(message))return res.status(409).json({error:'An account already exists with this email.',code:'account_exists'});
      return res.status(createResponse.status).json({error:message});
    }

    const session=await tokenRequest('password',{email:cleanEmail,password:cleanPassword});
    return res.status(200).json(sessionPayload(session,{needs_email_confirmation:false,preview_auto_confirmed:true,action:'create',created_user:created||null}));
  }catch(error){
    return res.status(error.status||500).json({error:error.message||'Unable to reach the account service.'});
  }
};