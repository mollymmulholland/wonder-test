'use strict';

const {health:modelHealth}=require('../lib/wonder-model-gateway');
const {candidate,PROMOTION_GATES}=require('../lib/wonder-mind-model-registry');

const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL = String(RAW_SUPABASE_URL || '').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLIC = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_TOKEN = process.env.WONDER_ADMIN_TOKEN;

function maskEmail(email='') {const [name,domain]=String(email).split('@');if(!domain)return null;const head=name?name.slice(0,2):'';return `${head}${name&&name.length>2?'***':''}@${domain}`;}
async function request(path,key,options={}){const response=await fetch(`${SUPABASE_URL}${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(options.headers||{})}});const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{data=text;}return{ok:response.ok,status:response.status,data,headers:response.headers};}
async function sb(path,options={}){const r=await request(path,SUPABASE_SECRET,options);if(!r.ok){const err=new Error(`Supabase ${r.status}`);err.status=r.status;err.data=r.data;throw err;}return r;}
function mean(xs=[]){const v=xs.map(Number).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}

async function runSmokeTest(){
  const email=`wonder-smoke-${Date.now()}@example.com`,password=`WonderSmoke-${Math.random().toString(36).slice(2)}!9`;let userId=null;
  try{const created=await sb('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true})});userId=created.data?.id||created.data?.user?.id||null;if(!userId)throw new Error('Smoke user was not created.');await new Promise(resolve=>setTimeout(resolve,250));const profile=await sb(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,created_at`);return{auth_create:true,trigger_profile_created:Array.isArray(profile.data)&&profile.data.length===1};}
  finally{if(userId)await request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`,SUPABASE_SECRET,{method:'DELETE'});}
}

async function wonderMindDiagnostics(){
  const [model,regions,sources,knowledge,runs,events,memories,versions,evidenceAudits,driftMetrics,runEvidence,decisionOutcomes,decisionMetrics]=await Promise.all([
    modelHealth(),sb('/rest/v1/wonder_mind_regions?is_active=eq.true&select=id'),sb('/rest/v1/wonder_mind_sources?select=id'),sb('/rest/v1/wonder_mind_knowledge?status=eq.active&select=id'),
    sb('/rest/v1/wonder_mind_inference_runs?select=id,status,created_at&order=created_at.desc&limit=20'),sb('/rest/v1/wonder_mind_events?select=id,processing_status&order=created_at.desc&limit=100'),sb('/rest/v1/wonder_mind_memory?superseded_by=is.null&select=id,independent_source_count,contamination_score'),
    sb('/rest/v1/wonder_mind_model_versions?select=version,status,substrate,base_model,constitution_version,cognitive_architecture_version,configuration,evaluation_summary,activated_at&order=created_at.desc&limit=8'),
    sb('/rest/v1/wonder_mind_evidence_audits?select=independent_source_count,contamination_score,confidence_ceiling,flags,created_at&order=created_at.desc&limit=100'),
    sb('/rest/v1/wonder_mind_drift_metrics?select=metric_name,domain,value,baseline_value,delta,status,sample_size,created_at&order=created_at.desc&limit=30'),
    sb('/rest/v1/wonder_mind_run_evidence?select=id,run_id,family&order=created_at.desc&limit=500'),
    sb('/rest/v1/wonder_mind_decision_outcomes?select=id,chosen_was_recommended,observed_utility,attribution_confidence,quality_label,utility_error,regret_signal,surprise,created_at&order=created_at.desc&limit=100'),
    sb('/rest/v1/wonder_mind_decision_policy_metrics?select=policy_version,domain,sample_size,mean_observed_utility,mean_regret_signal,mean_absolute_utility_error,recommended_outcome_utility,nonrecommended_outcome_utility,overconfidence_rate,created_at&order=created_at.desc&limit=10')
  ]);
  const count=x=>Array.isArray(x.data)?x.data.length:0,failedRuns=(runs.data||[]).filter(r=>r.status==='failed').length,failedEvents=(events.data||[]).filter(e=>e.processing_status==='failed').length;
  const selected=candidate(),modelVersions=versions.data||[],candidateVersion=modelVersions.find(v=>v.configuration?.candidate_id===selected.id)||null,evalSummary=candidateVersion?.evaluation_summary||{},constitutionalEvalPassed=evalSummary.status==='passed'||evalSummary.promotable===true;
  const audits=evidenceAudits.data||[],avgContamination=mean(audits.map(a=>a.contamination_score)),avgIndependence=mean(audits.map(a=>a.independent_source_count)),invalidRefRuns=audits.filter(a=>Array.isArray(a.flags)&&a.flags.includes('invalid_evidence_refs')).length;
  const epistemicIntegrity=audits.length===0?'observing':(avgContamination<=.45&&invalidRefRuns===0?'healthy':'warning');
  const latestDrift={};for(const m of driftMetrics.data||[])if(!latestDrift[`${m.metric_name}:${m.domain}`])latestDrift[`${m.metric_name}:${m.domain}`]=m;
  const decisionRows=decisionOutcomes.data||[],attributable=decisionRows.filter(r=>Number(r.attribution_confidence)>=.4),decisionLearning={status:attributable.length>=20?'learning':(decisionRows.length?'observing':'not_started'),recent_outcomes:decisionRows.length,attributable_outcomes:attributable.length,mean_observed_utility:mean(attributable.map(r=>r.observed_utility)),mean_regret_signal:mean(attributable.map(r=>r.regret_signal)),mean_absolute_utility_error:mean(attributable.map(r=>Math.abs(Number(r.utility_error)||0))),overconfident_recommendations:attributable.filter(r=>r.quality_label==='overconfident_recommendation').length,latest_metric_snapshot:(decisionMetrics.data||[])[0]||null};
  const readiness={cognitive_architecture:count(regions)===17,research_corpus:count(sources)>=50&&count(knowledge)>=30,event_memory_layer:true,provenance_ledger:true,epistemic_integrity:epistemicIntegrity,decision_learning_layer:true,self_hosted_inference:Boolean(model.ok&&model.modelAvailable!==false),constitutional_evaluation:constitutionalEvalPassed,production_ready:Boolean(count(regions)===17&&count(sources)>=50&&count(knowledge)>=30&&model.ok&&model.modelAvailable!==false&&constitutionalEvalPassed&&failedRuns===0&&epistemicIntegrity!=='warning')};
  return{status:readiness.production_ready?'ready':'building',readiness,model,selected_candidate:selected,promotion_gates:PROMOTION_GATES,evaluation:evalSummary,epistemic_integrity:{status:epistemicIntegrity,recent_audits:audits.length,mean_contamination:avgContamination,mean_independent_sources:avgIndependence,invalid_reference_runs:invalidRefRuns,latest_drift:latestDrift},decision_learning:decisionLearning,counts:{regions:count(regions),sources:count(sources),knowledge:count(knowledge),active_memories:count(memories),recent_runs:count(runs),recent_failed_runs:failedRuns,recent_failed_events:failedEvents,recent_evidence_rows:count(runEvidence),decision_outcomes:decisionRows.length},model_versions:modelVersions};
}

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Method not allowed.'});}
  const token=String(req.query?.token||'');if(!ADMIN_TOKEN||!token||token!==ADMIN_TOKEN)return res.status(401).json({ok:false,error:'Unauthorized.'});
  if(!SUPABASE_URL||!SUPABASE_SECRET)return res.status(500).json({ok:false,error:'Supabase admin environment is incomplete.'});
  try{
    const smoke=req.query?.action==='smoke'?await runSmokeTest():null,publicHealth=SUPABASE_PUBLIC?await request('/auth/v1/settings',SUPABASE_PUBLIC):{ok:false,status:null,data:null};
    const [usersResp,profilesResp,birthResp,assessmentResp,mind]=await Promise.all([sb('/auth/v1/admin/users?page=1&per_page=20'),sb('/rest/v1/profiles?select=user_id,first_name,current_city,onboarding_complete,created_at&order=created_at.desc&limit=20'),sb('/rest/v1/birth_data?select=user_id,date_of_birth,place_of_birth,created_at&order=created_at.desc&limit=20'),sb('/rest/v1/assessment_responses?select=user_id,question_id,created_at&order=created_at.desc&limit=200'),wonderMindDiagnostics()]);
    const rawUsers=Array.isArray(usersResp.data?.users)?usersResp.data.users:(Array.isArray(usersResp.data)?usersResp.data:[]),users=rawUsers.map(u=>({id:u.id,email:maskEmail(u.email),created_at:u.created_at,email_confirmed:!!u.email_confirmed_at,phone_present:!!u.phone})),assessments=Array.isArray(assessmentResp.data)?assessmentResp.data:[],assessmentCounts=assessments.reduce((acc,row)=>{acc[row.user_id]=(acc[row.user_id]||0)+1;return acc;},{});
    return res.status(200).json({ok:true,smoke,environment:{supabase_url_present:!!SUPABASE_URL,public_key_present:!!SUPABASE_PUBLIC,secret_present:!!SUPABASE_SECRET,admin_token_present:!!ADMIN_TOKEN,normalized_url_changed:String(RAW_SUPABASE_URL||'')!==SUPABASE_URL,wonder_model_url_present:!!process.env.WONDER_MODEL_BASE_URL,wonder_model_name:process.env.WONDER_MODEL_NAME||null,wonder_model_candidate:process.env.WONDER_MODEL_CANDIDATE||'qwen3-32b'},public_auth:{reachable:!!publicHealth.ok,status:publicHealth.status,email_signup_enabled:publicHealth.data?.external?.email??null,phone_signup_enabled:publicHealth.data?.external?.phone??null},wonder_mind:mind,auth_users:users,profiles:Array.isArray(profilesResp.data)?profilesResp.data:[],birth_data:Array.isArray(birthResp.data)?birthResp.data:[],assessment_counts:assessmentCounts});
  }catch(error){return res.status(500).json({ok:false,error:error.message||'Diagnostics failed.',supabase_status:error.status||null,detail:error.data||null});}
};
