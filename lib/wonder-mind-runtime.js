const {rest}=require('./supabase-server');
const {constitutionPrompt,EPISTEMIC_CLASSES,SAGE}=require('./wonder-mind-constitution');
const {generate}=require('./wonder-model-gateway');

const ALWAYS=['epistemic-immune','ethics-consent-safety','meta-cognitive-executive','language-interpretation','temporal-memory'];
const ROUTES={
  assessment:['self-identity','values-meaning','attachment-regulation','culture-context','development-becoming'],
  mirror:['self-identity','narrative-symbolic','values-meaning','development-becoming'],
  journal:['self-identity','narrative-symbolic','temporal-memory','development-becoming','culture-context'],
  chat:['self-identity','narrative-symbolic','recognition-empathy','development-becoming'],
  match:['values-meaning','attachment-regulation','recognition-empathy','attraction-desire','dyadics-relationship','culture-context','development-becoming'],
  post_date:['recognition-empathy','attraction-desire','attachment-regulation','dyadics-relationship','development-becoming','temporal-memory'],
  relationship:['motive-reciprocity','attachment-regulation','recognition-empathy','dyadics-relationship','development-becoming']
};

function uniq(xs){return [...new Set(xs)];}
function inferExtraRoutes(text=''){
  const t=text.toLowerCase(), out=[];
  if(/attract|chemistry|desire|physical|sexual/.test(t))out.push('attraction-desire');
  if(/anxious|avoid|secure|reassur|distance|withdraw|cling/.test(t))out.push('attachment-regulation');
  if(/understood|seen|listen|validate|care|curious/.test(t))out.push('recognition-empathy');
  if(/value|meaning|purpose|belief|moral|family|life i want/.test(t))out.push('values-meaning');
  if(/conflict|repair|recipro|effort|commit|relationship/.test(t))out.push('dyadics-relationship','motive-reciprocity');
  if(/story|pattern|always|never|childhood|past|identity|who i am/.test(t))out.push('narrative-symbolic','self-identity');
  if(/grow|become|future|potential|flourish|actualiz/.test(t))out.push('development-becoming');
  return out;
}

async function loadRegions(slugs){
  const q=encodeURIComponent(`(${slugs.join(',')})`);
  return rest(`/wonder_mind_regions?slug=in.${q}&is_active=eq.true&select=id,slug,name,core_question,purpose,reasons_over,outputs,guardrail,evidence_floor`,{admin:true});
}

async function loadKnowledge(regionIds){
  if(!regionIds.length)return [];
  const q=encodeURIComponent(`(${regionIds.join(',')})`);
  return rest(`/wonder_mind_knowledge?region_id=in.${q}&status=eq.active&select=id,region_id,title,kind,claim,application,evidence_grade,confidence,allowed_uses,counterevidence,alternative_hypotheses&order=confidence.desc&limit=80`,{admin:true});
}

async function loadUserContext(userId){
  const uid=encodeURIComponent(userId);
  const [models,journal,outcomes,mirror,comm,memory]=await Promise.all([
    rest(`/person_model_snapshots?user_id=eq.${uid}&select=id,model_version,scores,confidence,evidence,archetypes,created_at&order=created_at.desc&limit=1`,{admin:true}),
    rest(`/journal_entries?user_id=eq.${uid}&select=id,body,created_at&order=created_at.desc&limit=4`,{admin:true}),
    rest(`/match_outcomes?user_id=eq.${uid}&select=*&order=created_at.desc&limit=5`,{admin:true}),
    rest(`/mirror_feedback?user_id=eq.${uid}&select=overall_accuracy,accurate_sections,inaccurate_sections,correction,archetype_resonance,created_at&order=created_at.desc&limit=3`,{admin:true}),
    rest(`/wonder_mind_communication_profiles?user_id=eq.${uid}&select=*`,{admin:true}),
    rest(`/wonder_mind_memory?user_id=eq.${uid}&superseded_by=is.null&select=id,memory_type,region_id,claim,epistemic_class,confidence,stability,context,counterevidence,alternative_hypotheses,valid_from,expires_at&order=created_at.desc&limit=30`,{admin:true})
  ]);
  return {personModel:models[0]||null,recentJournal:journal,recentOutcomes:outcomes,mirrorCorrections:mirror,communication:comm[0]||null,memory};
}

async function recordEvent({userId,eventType,payload={},sourceTable=null,sourceId=null,consentScope=['self_understanding']}){
  const rows=await rest('/wonder_mind_events?select=*',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,event_type:eventType,source_table:sourceTable,source_id:sourceId,payload,consent_scope:consentScope,processing_status:'processing'}});
  return rows[0];
}

function safeJson(text){
  try{return JSON.parse(text);}catch{}
  const m=String(text).match(/\{[\s\S]*\}/);
  if(m)try{return JSON.parse(m[0]);}catch{}
  return null;
}

function communicationInstruction(profile){
  if(!profile)return 'Use a measured, warm, precise style. Challenge gently but do not dilute conclusions.';
  return `Adapt expression only: directness=${profile.directness}, warmth=${profile.warmth}, abstraction=${profile.abstraction}, detail=${profile.detail}, question_density=${profile.question_density}, pacing=${profile.preferred_pacing}. Do not change truth, evidence thresholds, or ethics to fit preference.`;
}

function buildSystem({regions,knowledge,context,runType}){
  const regionText=regions.map(r=>`REGION ${r.name}\nQuestion: ${r.core_question}\nPurpose: ${r.purpose}\nGuardrail: ${r.guardrail}\nEvidence floor: ${r.evidence_floor}`).join('\n\n');
  const knowledgeText=knowledge.map(k=>`[${k.evidence_grade}; c=${k.confidence}] ${k.title}: ${k.claim}${k.counterevidence?` Counterevidence: ${k.counterevidence}`:''}`).join('\n');
  return `${constitutionPrompt()}\n\nACTIVE COGNITIVE REGIONS FOR THIS RUN\n${regionText}\n\nRETRIEVED WONDER KNOWLEDGE\n${knowledgeText}\n\nPRIVATE LONGITUDINAL CONTEXT\n${JSON.stringify(context)}\n\nCOMMUNICATION ADAPTATION\n${communicationInstruction(context.communication)}\n\nRUN TYPE: ${runType}\n\nReturn strict JSON only with this shape: {"reply":"user-facing Sage response","epistemic_class":"observation|validated_inference|pattern_hypothesis|speculation|philosophical_lens|prediction|judgment","confidence":0.0,"claim":"one concise internal claim","supporting_evidence":["concise evidence summaries"],"counterevidence":["concise counterevidence"],"alternative_hypotheses":["plausible alternative"],"what_would_change_mind":["new evidence that would materially update this"],"memory_updates":[{"claim":"durable or provisional user model update","epistemic_class":"...","confidence":0.0,"stability":"provisional|contextual|stable","region_slug":"self-identity"}]}. Do not expose hidden reasoning or private database details. Keep internal summaries concise and auditable.`;
}

async function runMind({userId,runType='chat',message='',history=[],payload={}}){
  const event=await recordEvent({userId,eventType:runType,payload:{message,payload}});
  const slugs=uniq([...(ROUTES[runType]||ROUTES.chat),...inferExtraRoutes(message),...ALWAYS]);
  const regions=await loadRegions(slugs);
  const knowledge=await loadKnowledge(regions.map(r=>r.id));
  const context=await loadUserContext(userId);
  const modelVersions=await rest('/wonder_mind_model_versions?status=eq.active&select=id,version&order=activated_at.desc&limit=1',{admin:true});
  const runRows=await rest('/wonder_mind_inference_runs?select=*',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,model_version_id:modelVersions[0]?.id||null,run_type:runType,trigger_event_id:event.id,status:'running',started_at:new Date().toISOString(),input_summary:{message:message.slice(0,1200),history_count:history.length,region_slugs:slugs}}});
  const run=runRows[0];
  try{
    if(regions.length){
      await rest('/wonder_mind_region_activations',{method:'POST',admin:true,prefer:'return=minimal',body:regions.map((r,i)=>({run_id:run.id,region_id:r.id,activation_order:i+1,reason:slugs.includes(r.slug)?'Routed by run type or semantic signal':'Executive consultation',confidence:.6,output:{state:'activated'}}))});
    }
    const messages=[...history.slice(-10).map(m=>({role:m.role==='assistant'||m.role==='wonder'?'assistant':'user',content:String(m.text||m.content||'').slice(0,4000)})),{role:'user',content:message.slice(0,8000)}];
    const generated=await generate({system:buildSystem({regions,knowledge,context,runType}),messages});
    const parsed=safeJson(generated.text)||{reply:generated.text,epistemic_class:'pattern_hypothesis',confidence:.5,claim:'Unstructured model response',supporting_evidence:[],counterevidence:[],alternative_hypotheses:[],what_would_change_mind:[],memory_updates:[]};
    const cls=EPISTEMIC_CLASSES[parsed.epistemic_class]?parsed.epistemic_class:'pattern_hypothesis';
    const cap=EPISTEMIC_CLASSES[cls].maxConfidence;
    const confidence=Math.max(0,Math.min(cap==null?1:cap,Number(parsed.confidence)||.5));
    const judgmentRows=await rest('/wonder_mind_judgments?select=id',{method:'POST',admin:true,prefer:'return=representation',body:{run_id:run.id,user_id:userId,judgment_type:runType,subject_user_id:userId,claim:String(parsed.claim||'').slice(0,4000),confidence,evidence_grade:cls,supporting_evidence:parsed.supporting_evidence||[],counterevidence:parsed.counterevidence||[],alternative_hypotheses:parsed.alternative_hypotheses||[],what_would_change_mind:parsed.what_would_change_mind||[],ethics_clear:true,allowed_uses:['self_understanding','relationship_guidance'],user_facing_explanation:String(parsed.reply||'').slice(0,12000)}});
    const regionBySlug=Object.fromEntries(regions.map(r=>[r.slug,r.id]));
    const memoryUpdates=(Array.isArray(parsed.memory_updates)?parsed.memory_updates:[]).slice(0,5).filter(m=>m?.claim);
    if(memoryUpdates.length){
      await rest('/wonder_mind_memory',{method:'POST',admin:true,prefer:'return=minimal',body:memoryUpdates.map(m=>({user_id:userId,memory_type:'inference',region_id:regionBySlug[m.region_slug]||null,claim:String(m.claim).slice(0,4000),epistemic_class:EPISTEMIC_CLASSES[m.epistemic_class]?m.epistemic_class:'pattern_hypothesis',confidence:Math.max(0,Math.min(.9,Number(m.confidence)||.5)),stability:m.stability||'provisional',evidence_event_ids:[event.id],allowed_uses:['self_understanding','relationship_guidance']}))});
    }
    await rest(`/wonder_mind_inference_runs?id=eq.${run.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{status:'completed',completed_at:new Date().toISOString(),epistemic_state:{class:cls,confidence,alternatives:parsed.alternative_hypotheses||[],what_would_change_mind:parsed.what_would_change_mind||[]},ethics_state:{cleared:true,constitution:'wonder_constitution_v1'},executive_state:{regions:slugs},output:{reply:parsed.reply,judgment_id:judgmentRows[0]?.id||null,model:generated.model,usage:generated.usage}}});
    await rest(`/wonder_mind_events?id=eq.${event.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{processing_status:'processed',updated_at:new Date().toISOString()}});
    return {reply:parsed.reply,runId:run.id,confidence,epistemicClass:cls};
  }catch(error){
    await Promise.allSettled([
      rest(`/wonder_mind_inference_runs?id=eq.${run.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{status:'failed',completed_at:new Date().toISOString(),error:{code:error.code||'RUNTIME_ERROR',message:error.message}}}),
      rest(`/wonder_mind_events?id=eq.${event.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{processing_status:'failed',updated_at:new Date().toISOString()}})
    ]);
    throw error;
  }
}

module.exports={runMind,recordEvent,inferExtraRoutes,ROUTES,SAGE};