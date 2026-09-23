const {secureApi,cleanText}=require('../../lib/api-security');
const {authRequest,rest}=require('../../lib/supabase-server');
const {requireDiscovery}=require('../../lib/journey-store');
const {allowAuth}=require('../../lib/auth-flows');
const Runtime=require('../../lib/mirror-runtime');
const J=require('../../public-shared/journey');
module.exports=async(req,res)=>{
 if(!secureApi(req,res))return;
 const {user,token}=await authRequest(req);if(!user?.id)return res.status(401).json({error:'Sign in to speak with your Mirror.'});
 try{
  const current=await requireDiscovery(user.id,token),b=req.body||{},action=b.action||'reflect';
  await rest(`/wonder_agent_proposals?user_id=eq.${user.id}&expires_at=lt.${new Date().toISOString()}`,{admin:true,method:'DELETE'});
  if(action==='status')return res.status(200).json({live:!!Runtime.configuration(),retention:'No application chat history is stored. Only reviewed memories persist.'});
  if(!await allowAuth(req,'mirror',user.id))return res.status(429).json({error:'Please pause before sending another request.'});
  if(['apply','decline'].includes(action)){
   if(!/^[0-9a-f-]{36}$/.test(b.id||''))return res.status(400).json({error:'Choose a current proposal.'});
   if(action==='decline'){await rest(`/wonder_agent_proposals?user_id=eq.${user.id}&id=eq.${b.id}`,{admin:true,method:'DELETE'});return res.status(200).json({ok:true});}
   const [p]=await rest(`/wonder_agent_proposals?user_id=eq.${user.id}&id=eq.${b.id}&expires_at=gt.${new Date().toISOString()}`,{admin:true});
   if(!p||p.expected_version!==current.version)return res.status(409).json({error:'Your context changed or this proposal expired. Review a fresh proposal before remembering it.'});
   const next=J.privateEvent(current,{type:'memory',payload:{body:b.body,context:b.context,source:'Reviewed Mirror proposal',remember:b.remember===true,matching:b.matching===true,id:p.id}});
   await rest('/rpc/wonder_accept_proposal',{admin:true,method:'POST',body:{p_user:user.id,p_proposal:p.id,p_version:current.version,p_state:next}});
   return res.status(200).json({state:next});
  }
  if(!['reflect','propose_memory','prepare'].includes(action))return res.status(400).json({error:'Unknown Mirror request.'});
  const message=cleanText(b.message,6001);if(!message||message.length>6000)return res.status(400).json({error:'Write a message of up to 6,000 characters.'});
  const selected=b.process_context===true?cleanText(b.context?.text,12000):'';
  const reply=await Runtime.reflect({message,selected,history:Array.isArray(b.history)?b.history:[],task:action==='propose_memory'?'memory':action==='prepare'?'preparation':'reflect'});
  if(action==='propose_memory'){
   const proposal=Runtime.memoryProposal(reply);
   const [record]=await rest('/wonder_agent_proposals',{admin:true,method:'POST',prefer:'return=representation',body:{user_id:user.id,expected_version:current.version,proposal,expires_at:new Date(Date.now()+3600000).toISOString()}});
   return res.status(200).json({proposal:{...proposal,id:record.id},retained:'Proposal expires after one hour; no memory is active.'});
  }
  return res.status(200).json({reply,retained:false,context_used:selected?'selected material and this conversation':'this conversation only'});
 }catch(e){return res.status(e.status===403?403:503).json({error:e.status===403||e.status===503?e.message:'Your Mirror could not respond or apply this proposal. Your text is still here; no new memory was confirmed.'});}
};
