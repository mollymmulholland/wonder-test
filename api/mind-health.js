'use strict';

const {authUser,rest}=require('../lib/supabase-server');
const {health:modelHealth}=require('../lib/wonder-model-gateway');

function bearer(req){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7):'';}

module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const token=bearer(req);const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required'});
  try{
    const admins=await rest(`/wonder_admins?user_id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`,{accessToken:token});
    if(!admins?.length)return res.status(403).json({error:'Wonder Mind console access required'});
    const [model,regions,sources,knowledge,runs,events,memories]=await Promise.all([
      modelHealth(),
      rest('/wonder_mind_regions?is_active=eq.true&select=id',{admin:true}),
      rest('/wonder_mind_sources?select=id',{admin:true}),
      rest('/wonder_mind_knowledge?status=eq.active&select=id',{admin:true}),
      rest('/wonder_mind_inference_runs?select=id,status,created_at&order=created_at.desc&limit=20',{admin:true}),
      rest('/wonder_mind_events?select=id,processing_status&order=created_at.desc&limit=100',{admin:true}),
      rest('/wonder_mind_memory?superseded_by=is.null&select=id',{admin:true})
    ]);
    const failedRuns=runs.filter(r=>r.status==='failed').length;
    const failedEvents=events.filter(e=>e.processing_status==='failed').length;
    const readiness={
      cognitiveArchitecture:regions.length===17,
      researchCorpus:sources.length>=50&&knowledge.length>=30,
      eventMemoryLayer:true,
      selfHostedInference:Boolean(model.ok&&model.modelAvailable!==false),
      productionReady:Boolean(regions.length===17&&sources.length>=50&&knowledge.length>=30&&model.ok&&model.modelAvailable!==false&&failedRuns===0)
    };
    return res.status(200).json({status:readiness.productionReady?'ready':'building',readiness,model,counts:{regions:regions.length,sources:sources.length,knowledge:knowledge.length,activeMemories:memories.length,recentRuns:runs.length,recentFailedRuns:failedRuns,recentFailedEvents:failedEvents}});
  }catch(err){
    console.error('Wonder Mind health error',{code:err.code,message:err.message});
    return res.status(503).json({error:'Wonder Mind health check failed',code:err.code||'WONDER_MIND_HEALTH_ERROR'});
  }
};
