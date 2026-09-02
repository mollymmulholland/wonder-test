'use strict';

const {rest}=require('./supabase-server');
const {buildEvidenceProfile}=require('./wonder-mind-evidence');

function row(key,family,{sourceTable=null,sourceId=null,subjectUserId=null,independenceGroup=null,weight=1,metadata={}}={}){
  return {evidence_key:key,family,source_table:sourceTable,source_id:sourceId,subject_user_id:subjectUserId,independence_group:independenceGroup||key,weight,metadata};
}

function buildRunEvidence({userId,message,context={},knowledge=[],sources=[],dyadContext=null}={}){
  const out=[];
  if(String(message||'').trim())out.push(row('message:current','direct_user_report',{subjectUserId:userId,independenceGroup:'current_message',weight:1.0}));
  for(const m of context.personModels||[])out.push(row(`assessment:${m.id}`,'structured_assessment',{sourceTable:'person_model_snapshots',sourceId:m.id,subjectUserId:userId,independenceGroup:`assessment:${m.assessment_session_id||m.id}`,weight:.8,metadata:{model_version:m.model_version}}));
  for(const j of context.recentJournal||[])out.push(row(`journal:${j.id}`,'longitudinal_self_report',{sourceTable:'journal_entries',sourceId:j.id,subjectUserId:userId,independenceGroup:`journal:${j.id}`,weight:.9}));
  for(const o of context.recentOutcomes||[])out.push(row(`outcome:${o.id}`,'observed_outcome',{sourceTable:'match_outcomes',sourceId:o.id,subjectUserId:userId,independenceGroup:`outcome:${o.id}`,weight:1.25}));
  for(const c of context.mirrorCorrections||[])if(c.id)out.push(row(`correction:${c.id}`,'user_correction',{sourceTable:'mirror_feedback',sourceId:c.id,subjectUserId:userId,independenceGroup:`correction:${c.id}`,weight:1.15}));
  for(const m of context.memory||[])out.push(row(`memory:${m.id}`,'prior_model_inference',{sourceTable:'wonder_mind_memory',sourceId:m.id,subjectUserId:userId,independenceGroup:`memory:${m.memory_key||m.id}`,weight:.12,metadata:{memory_key:m.memory_key,contamination_score:m.contamination_score||0}}));
  const sourceById=Object.fromEntries((sources||[]).map(s=>[s.id,s]));
  for(const k of knowledge||[]){const s=sourceById[k.source_id];out.push(row(`knowledge:${k.id}`,'research_construct',{sourceTable:'wonder_mind_knowledge',sourceId:k.id,independenceGroup:`research:${k.source_id||k.id}`,weight:.35,metadata:{source_id:k.source_id||null,evidence_grade:k.evidence_grade,source_title:s?.title||null}}));}
  for(const o of dyadContext?.outcomeHistory||[])if(o.id)out.push(row(`dyad-outcome:${o.id}`,'observed_outcome',{sourceTable:'match_outcomes',sourceId:o.id,subjectUserId:userId,independenceGroup:`outcome:${o.id}`,weight:1.25,metadata:{candidate_user_id:dyadContext?.candidate?.user_id||null}}));
  for(const m of dyadContext?.candidate?.matchingMemories||[])if(m.id)out.push(row(`candidate-memory:${m.id}`,'prior_model_inference',{sourceTable:'wonder_mind_memory',sourceId:m.id,subjectUserId:dyadContext?.candidate?.user_id||null,independenceGroup:`candidate-memory:${m.memory_key||m.id}`,weight:.12,metadata:{purpose_limited:true}}));
  const seen=new Set();return out.filter(x=>{if(seen.has(x.evidence_key))return false;seen.add(x.evidence_key);return true;});
}

async function persistRunEvidence(runId,rows=[]){
  if(!rows.length)return [];
  const body=rows.map(r=>({run_id:runId,...r}));
  return rest('/wonder_mind_run_evidence?select=id,evidence_key,family,independence_group,weight',{method:'POST',admin:true,prefer:'return=representation',body});
}

function evidenceCatalog(rows=[]){return rows.map(r=>`${r.evidence_key} [${r.family}; independence=${r.independence_group}; weight=${r.weight}]`).join('\n');}

function validateEvidenceRefs(refs=[],rows=[]){
  const map=new Map(rows.map(r=>[r.evidence_key,r]));
  const valid=[],invalid=[];
  for(const ref of [...new Set((refs||[]).map(String))].slice(0,20)){const hit=map.get(ref);if(hit)valid.push(hit);else invalid.push(ref);}
  return{valid,invalid};
}

function profileFromRefs(refs,rows,{runType='chat'}={}){
  const {valid,invalid}=validateEvidenceRefs(refs,rows);
  const counts={};for(const r of valid)counts[r.family]=(counts[r.family]||0)+1;
  const p=buildEvidenceProfile({
    runType,
    knowledgeCount:counts.research_construct||0,
    memoryCount:counts.prior_model_inference||0,
    outcomeCount:counts.observed_outcome||0,
    correctionCount:counts.user_correction||0,
    personModelCount:counts.structured_assessment||0,
    journalCount:counts.longitudinal_self_report||0,
    historyCount:0,
    dyadOutcomeCount:0,
    currentMessage:Boolean(counts.direct_user_report)
  });
  const groups=new Set(valid.filter(r=>r.family!=='prior_model_inference'&&r.family!=='research_construct').map(r=>r.independence_group));
  p.independentSourceCount=groups.size;
  if(groups.size===0)p.confidenceCeiling=Math.min(p.confidenceCeiling,.42);
  else if(groups.size===1)p.confidenceCeiling=Math.min(p.confidenceCeiling,.60);
  else if(groups.size===2)p.confidenceCeiling=Math.min(p.confidenceCeiling,.76);
  p.invalidRefs=invalid;
  p.validRefs=valid.map(r=>r.evidence_key);
  return p;
}

module.exports={buildRunEvidence,persistRunEvidence,evidenceCatalog,validateEvidenceRefs,profileFromRefs};
