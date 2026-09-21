const {secureApi,cleanText}=require('../../lib/api-security');
const S=require('../../lib/supabase-server');
const {readState}=require('../../lib/journey-store');
const {cohort}=require('../../lib/operations');
const {reauthenticate,fail}=require('../../lib/account-security');
const {eraseAccount}=require('../../lib/account-deletion');
const {allowAuth}=require('../../lib/auth-flows');
const J=require('../../public-shared/journey');
const connections=require('../../lib/connection-store');
module.exports=async(req,res)=>{
 if(!secureApi(req,res))return;
 const {user,token}=await S.authRequest(req);if(!user?.id)return res.status(401).json({error:'Please sign in.'});
 const b=req.body||{};
 try{
  const current=await readState(user.id,token,{create:b.action==='load'});
  if(!current)return res.status(409).json({error:'Open your account before making this change.'});
  if(current.deleted)return res.status(410).json({error:'This account is no longer active.'});
  if(b.action==='load'){
   const group=await cohort(user.id),list=await connections.list(user.id);
   return res.status(200).json({state:current,connection:list.find(x=>['proposed','pending','mutual'].includes(x.status))||list[0]||null,connections:list,live_introductions:!!group});
  }
  if(b.action==='refresh_connections')return res.status(200).json({connections:await connections.list(user.id)});
  if(b.action==='seek'){
   if(!await allowAuth(req,'introduction-request',user.id))throw fail('Please wait before checking again.',429);
   return res.status(200).json(await require('../../lib/matching-service').propose(user.id));
  }
  if(b.action==='export'){
   const tables=['profiles','birth_data','assessment_sessions','assessment_responses_v2','person_model_snapshots','mirror_reports','journal_entries','ai_conversations','ai_messages','mirror_feedback'];const records={};
   for(const table of tables){records[table]=[];for(let offset=0;;offset+=500){const rows=await S.rest(`/${table}?user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=500&offset=${offset}`,{accessToken:token});records[table].push(...rows);if(rows.length<500)break;if(offset>50000)throw new Error('Export needs a background job');}}
   return res.status(200).json({exported_at:new Date().toISOString(),journey:current,records});
  }
  if(b.action==='change'){
   if(!Number.isInteger(b.expected_version)||b.expected_version!==current.version)throw fail('Another tab or device changed this record. Your text is still here. Export your draft, then reload to review the newer version.',409);
   if(['delete','block','report'].includes(b.event?.type))throw fail('Use the dedicated account, support, or connection control.',403);
   if(b.event?.type==='review_mirror'){
    const reports=await S.rest(`/person_model_snapshots?user_id=eq.${user.id}&select=id&limit=1`,{admin:true});if(!reports.length)throw fail('Complete discovery and read your first Mirror before marking it reviewed.',409);
   }
   if(b.event?.type==='portrait')b.event.payload={...b.event.payload,photo:current.portrait.photo};
   if(b.event?.type==='availability'&&b.event.payload?.value==='available'){
    if(!await cohort(user.id))throw fail('Your Mirror is available. Introductions will open when your local cohort access is approved.',409);
    if(current.moderation?.photoApproved!==true)throw fail('Your portrait photograph needs review before introductions can become available.',409);
    if(!current.preferences.gender||!current.preferences.meet?.length||!current.preferences.structure||!current.portrait.topics?.length)throw fail('Complete who you wish to meet, relationship structure, and at least one shared portrait interest.',409);
   }
   const next=J.privateEvent(current,b.event||{});
   const rows=await S.rest(`/wonder_private_journey?user_id=eq.${encodeURIComponent(user.id)}&version=eq.${current.version}`,{admin:true,method:'PATCH',prefer:'return=representation',body:{state:next,version:next.version,updated_at:new Date().toISOString()}});
   if(!rows.length)throw fail('Another device saved first. Your draft has not been discarded. Reload to review the newer version.',409);
   // Derived, unaccepted actions cannot survive a permission change or correction.
   if(['consent','correct','forget','delete_journal'].includes(b.event.type))await S.rest(`/wonder_agent_proposals?user_id=eq.${user.id}`,{admin:true,method:'DELETE'});
   return res.status(200).json({state:next});
  }
  if(b.action==='connection')return res.status(200).json({connection:await connections.update(user.id,b.id,b.expected_version,b.event||{})});
  if(b.action==='support'){
   const reason=cleanText(b.reason,3000);if(!reason)throw fail('Describe the concern you want us to review.');
   let subject=null;
   if(b.connection_id){const record=await connections.record(user.id,b.connection_id);if(!record)throw fail('Connection not found.',404);subject=record.pair.members.find(id=>id!==user.id);}
   await S.rest('/wonder_support_requests',{admin:true,method:'POST',body:{reporter_id:user.id,subject_id:subject,connection_id:b.connection_id||null,reason}});
   return res.status(200).json({ok:true});
  }
  if(b.action==='delete_account'){
   if(!await allowAuth(req,'delete-account',user.id))throw fail('Please wait before trying again.',429);
   await reauthenticate(user,b.password);
   try{await eraseAccount(user.id);S.clearSessionCookies(res);return res.status(200).json({ok:true});}
   catch(e){const [receipt]=await S.rest(`/wonder_account_deletions?user_id=eq.${user.id}&select=user_id`,{admin:true});if(!receipt)throw e;S.clearSessionCookies(res);return res.status(202).json({pending:true,message:'Account access is withdrawn. Removal needs an operator retry; the request is in the restricted deletion queue.'});}
  }
  return res.status(400).json({error:'Unknown action.'});
 }catch(e){const code=[400,403,404,409,410,429].includes(e.status)?e.status:503;return res.status(code).json({error:code===503?'Your private space could not be loaded or saved. Keep your draft and retry.':e.message});}
};
