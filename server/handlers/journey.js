const {secureApi}=require('../../lib/api-security');
const {authRequest,rest}=require('../../lib/supabase-server');
const {readState}=require('../../lib/journey-store');
const J=require('../../public-shared/journey');
const connections=require('../../lib/connection-store');
const live=user=>process.env.WONDER_COHORT_ACTIVE==='true'&&user.app_metadata?.wonder_cohort==='dallas-beta';
module.exports=async(req,res)=>{
 if(!secureApi(req,res))return;
 const {user,token}=await authRequest(req);if(!user?.id)return res.status(401).json({error:'Please sign in.'});
 const b=req.body||{};
 try{
  const current=await readState(user.id,token,{create:b.action==='load'});
  if(!current)return res.status(409).json({error:'Open your account before making this change.'});
  if(current.deleted)return res.status(410).json({error:'This account is no longer active.'});
  if(b.action==='load')return res.status(200).json({state:current,connection:live(user)?await connections.view(user.id):null,live_introductions:live(user)});
  if(b.action==='export'){
   const tables=['profiles','birth_data','assessment_sessions','assessment_responses_v2','person_model_snapshots','mirror_reports','journal_entries','ai_conversations','ai_messages','mirror_feedback'];const records={};
   for(const table of tables){records[table]=[];for(let offset=0;;offset+=500){const rows=await rest(`/${table}?user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=500&offset=${offset}`,{accessToken:token});records[table].push(...rows);if(rows.length<500)break;if(offset>50000)throw new Error('Export needs a background job');}}
   return res.status(200).json({exported_at:new Date().toISOString(),journey:current,records});
  }
  if(b.action==='change'){
   if(!Number.isInteger(b.expected_version)||b.expected_version!==current.version)return res.status(409).json({error:'Another tab or device changed this record. Your text is still here. Export your draft, then reload to review the newer version.'});
   if(['delete','block'].includes(b.event?.type))return res.status(403).json({error:'Use the dedicated account or connection control.'});
   if(b.event?.type==='availability'&&b.event.payload?.value==='available'&&!live(user))return res.status(409).json({error:'Introductions are awaiting cohort activation, portrait moderation, and release verification.'});
   if(b.event?.type==='availability'&&b.event.payload?.value==='available'&&current.moderation?.photoApproved!==true)return res.status(409).json({error:'Your portrait photograph must be reviewed before introductions can become available.'});
   const next=J.privateEvent(current,b.event||{});
   const rows=await rest(`/wonder_private_journey?user_id=eq.${encodeURIComponent(user.id)}&version=eq.${current.version}`,{admin:true,method:'PATCH',prefer:'return=representation',body:{state:next,version:next.version,updated_at:new Date().toISOString()}});
   if(!rows.length)return res.status(409).json({error:'Another device saved first. Your draft has not been discarded. Reload to review the newer version.'});
   return res.status(200).json({state:next});
  }
  if(b.action==='connection'){if(!live(user))return res.status(409).json({error:'Live mutual introductions and messaging are not enabled. No action was sent.'});return res.status(200).json({connection:await connections.update(user.id,b.id,b.expected_version,b.event||{})});}
  if(b.action==='delete_account')return res.status(503).json({error:'Deletion is not enabled until the full retention and derivative-removal procedure is verified. Nothing has been deleted. Export your data and pause introductions meanwhile.'});
  return res.status(400).json({error:'Unknown action.'});
 }catch(e){return res.status(e.status&&[400,403,409,410].includes(e.status)?e.status:503).json({error:e.status&&[400,403,409,410].includes(e.status)?e.message:'Your private space could not be loaded or saved. Keep your draft and retry; setup may still be pending.'});}
};
