'use strict';

const {rest}=require('./supabase-server');

const HALF_LIFE_BY_STABILITY={ephemeral:14,provisional:45,contextual:120,stable:365};
const CLASS_MAX={observation:.98,validated_inference:.90,pattern_hypothesis:.78,speculation:.55,philosophical_lens:.65,prediction:.90,judgment:.88};

function clamp(n,lo=0,hi=1){n=Number(n);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo;}
function slugify(s=''){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,96);}
function memoryKey(update={}){return slugify(update.memory_key||`${update.region_slug||'self'}-${update.claim||''}`);}
function halfLife(stability){return HALF_LIFE_BY_STABILITY[stability]||45;}
function classCeiling(cls){return CLASS_MAX[cls]||.75;}
function decayConfidence(confidence,lastTouchedAt,stability,now=Date.now()){
  const touched=new Date(lastTouchedAt||0).getTime();
  if(!touched||touched>=now)return clamp(confidence);
  const days=(now-touched)/86400000,hl=halfLife(stability);
  const retained=Math.pow(.5,days/hl);
  const floor=stability==='stable'?.35:stability==='contextual'?.22:.10;
  return Math.max(floor,clamp(confidence)*retained);
}
function supportGain(oldConfidence,newConfidence,evidenceCount){
  const prior=clamp(oldConfidence),signal=clamp(newConfidence),diminish=1/Math.sqrt(Math.max(1,evidenceCount));
  return clamp(prior+(signal-prior)*(.35*diminish));
}
function challengePenalty(confidence,contradictionCount,severity=.25){return clamp(confidence-(severity/Math.sqrt(Math.max(1,contradictionCount))));}

async function reviseBelief({userId,runId,eventId,update,regionId,purposes=[]}){
  const key=memoryKey(update); if(!key)return null;
  const existing=(await rest(`/wonder_mind_memory?user_id=eq.${encodeURIComponent(userId)}&memory_key=eq.${encodeURIComponent(key)}&superseded_by=is.null&select=*&order=created_at.desc&limit=1`,{admin:true}))[0]||null;
  const now=new Date().toISOString();
  const desiredConfidence=Math.min(classCeiling(update.epistemic_class),clamp(update.confidence));
  if(!existing){
    const rows=await rest('/wonder_mind_memory?select=*',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,memory_type:'inference',memory_key:key,region_id:regionId||null,claim:update.claim,epistemic_class:update.epistemic_class,confidence:desiredConfidence,stability:update.stability||'provisional',evidence_count:1,contradiction_count:0,salience:clamp(update.salience??.5),evidence_event_ids:eventId?[eventId]:[],allowed_uses:purposes,sensitivity:'private',last_supported_at:now,decay_half_life_days:halfLife(update.stability)}});
    const memory=rows[0];
    await recordRevision({userId,runId,memoryId:memory.id,type:'created',previous:null,current:memory,eventIds:eventId?[eventId]:[],rationale:{memory_key:key}});
    return memory;
  }

  const sameClaim=slugify(existing.claim)===slugify(update.claim);
  if(sameClaim){
    const nextConfidence=Math.min(classCeiling(update.epistemic_class),supportGain(existing.confidence,desiredConfidence,(existing.evidence_count||1)+1));
    const evidenceIds=[...new Set([...(existing.evidence_event_ids||[]),...(eventId?[eventId]:[])])].slice(-100);
    await rest(`/wonder_mind_memory?id=eq.${existing.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{confidence:nextConfidence,evidence_count:(existing.evidence_count||1)+1,evidence_event_ids:evidenceIds,last_supported_at:now,updated_at:now,salience:Math.max(clamp(existing.salience),clamp(update.salience??.5))}});
    await recordRevision({userId,runId,memoryId:existing.id,type:'reinforced',previous:existing,current:{...existing,confidence:nextConfidence},eventIds:eventId?[eventId]:[],rationale:{memory_key:key}});
    return {...existing,confidence:nextConfidence};
  }

  const contradictionCount=(existing.contradiction_count||0)+1;
  const penalized=challengePenalty(existing.confidence,contradictionCount,.28);
  await rest(`/wonder_mind_memory?id=eq.${existing.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{confidence:penalized,contradiction_count:contradictionCount,last_challenged_at:now,updated_at:now}});

  const replacementRows=await rest('/wonder_mind_memory?select=*',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,memory_type:'inference',memory_key:key,region_id:regionId||existing.region_id||null,claim:update.claim,epistemic_class:update.epistemic_class,confidence:Math.min(desiredConfidence,.72),stability:update.stability||'provisional',evidence_count:1,contradiction_count:0,salience:clamp(update.salience??existing.salience??.5),evidence_event_ids:eventId?[eventId]:[],allowed_uses:purposes,sensitivity:'private',last_supported_at:now,decay_half_life_days:halfLife(update.stability)}});
  const replacement=replacementRows[0];
  await rest(`/wonder_mind_memory?id=eq.${existing.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{superseded_by:replacement.id,updated_at:now}});
  await recordRevision({userId,runId,memoryId:existing.id,type:'superseded',previous:existing,current:replacement,eventIds:eventId?[eventId]:[],rationale:{memory_key:key,contradiction_count:contradictionCount}});
  return replacement;
}

async function recordRevision({userId,runId,memoryId,type,previous,current,eventIds=[],rationale={}}){
  await rest('/wonder_mind_belief_revisions',{method:'POST',admin:true,prefer:'return=minimal',body:{user_id:userId,memory_id:memoryId,run_id:runId||null,revision_type:type,previous_claim:previous?.claim||null,new_claim:current?.claim||null,previous_confidence:previous?.confidence??null,new_confidence:current?.confidence??null,evidence_event_ids:eventIds,rationale}});
}

async function reconcileMemoryUpdates({userId,runId,eventId,updates=[],regionBySlug={},purposes=[]}){
  const changed=[];
  for(const update of updates.slice(0,8)){
    const memory=await reviseBelief({userId,runId,eventId,update,regionId:regionBySlug[update.region_slug]||null,purposes});
    if(memory)changed.push(memory);
  }
  return changed;
}

async function runDecayCycle({userId=null,limit=500}={}){
  const model=(await rest('/wonder_mind_model_versions?status=eq.active&select=id&order=activated_at.desc&limit=1',{admin:true}))[0]||null;
  const cycle=(await rest('/wonder_mind_learning_cycles?select=*',{method:'POST',admin:true,prefer:'return=representation',body:{cycle_type:'decay',model_version_id:model?.id||null,status:'running'}}))[0];
  try{
    const userFilter=userId?`&user_id=eq.${encodeURIComponent(userId)}`:'';
    const memories=await rest(`/wonder_mind_memory?superseded_by=is.null${userFilter}&select=*&order=updated_at.asc&limit=${Math.max(1,Math.min(2000,limit))}`,{admin:true});
    let changed=0;const now=Date.now();
    for(const m of memories){
      const last=m.last_supported_at||m.updated_at||m.created_at;
      const next=decayConfidence(m.confidence,last,m.stability,now);
      if(next < Number(m.confidence)-.03){
        const ts=new Date().toISOString();
        await rest(`/wonder_mind_memory?id=eq.${m.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{confidence:next,updated_at:ts}});
        await recordRevision({userId:m.user_id,runId:null,memoryId:m.id,type:'decayed',previous:m,current:{...m,confidence:next},rationale:{half_life_days:m.decay_half_life_days||halfLife(m.stability)}});
        changed++;
      }
    }
    await rest(`/wonder_mind_learning_cycles?id=eq.${cycle.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{status:'completed',completed_at:new Date().toISOString(),processed_count:memories.length,changed_count:changed,metrics:{decay_threshold:.03}}});
    return {processed:memories.length,changed};
  }catch(error){
    await rest(`/wonder_mind_learning_cycles?id=eq.${cycle.id}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{status:'failed',completed_at:new Date().toISOString(),error:{message:String(error.message||'').slice(0,1000)}}}).catch(()=>{});
    throw error;
  }
}

function brier(predictions=[]){if(!predictions.length)return null;return predictions.reduce((s,p)=>s+Math.pow(Number(p.probability)-Number(p.outcome),2),0)/predictions.length;}
function reliabilityBuckets(predictions=[]){
  const bins=Array.from({length:10},(_,i)=>({lo:i/10,hi:(i+1)/10,n:0,forecast:0,outcome:0}));
  for(const p of predictions){const prob=clamp(p.probability),idx=Math.min(9,Math.floor(prob*10));const b=bins[idx];b.n++;b.forecast+=prob;b.outcome+=Number(p.outcome);}
  return bins.filter(b=>b.n).map(b=>({range:[b.lo,b.hi],n:b.n,mean_forecast:b.forecast/b.n,observed_rate:b.outcome/b.n,gap:(b.forecast-b.outcome)/b.n}));
}

async function calculateCalibration({modelVersionId=null,domain='matching'}={}){
  const filter=modelVersionId?`&wonder_mind_inference_runs.model_version_id=eq.${encodeURIComponent(modelVersionId)}`:'';
  // PostgREST embedded joins are intentionally avoided here; prediction rows already reference their run.
  const predictions=await rest(`/wonder_mind_predictions?resolved=eq.true&outcome=not.is.null&select=id,run_id,prediction_type,probability,outcome,resolved_at&order=resolved_at.desc&limit=5000`,{admin:true});
  let filtered=predictions;
  if(modelVersionId){
    const runIds=[...new Set(predictions.map(p=>p.run_id).filter(Boolean))];
    if(runIds.length){
      const encoded=encodeURIComponent(`(${runIds.join(',')})`);
      const runs=await rest(`/wonder_mind_inference_runs?id=in.${encoded}&model_version_id=eq.${encodeURIComponent(modelVersionId)}&select=id`,{admin:true});
      const allowed=new Set(runs.map(r=>r.id));filtered=predictions.filter(p=>allowed.has(p.run_id));
    } else filtered=[];
  }
  const score=brier(filtered),buckets=reliabilityBuckets(filtered),now=new Date().toISOString();
  if(score!=null)await rest('/wonder_mind_calibration_metrics',{method:'POST',admin:true,prefer:'return=minimal',body:{model_version_id:modelVersionId||null,metric_name:'brier_score',domain,sample_size:filtered.length,value:score,breakdown:{reliability:buckets},window_end:now}});
  return {sampleSize:filtered.length,brierScore:score,reliability:buckets};
}

module.exports={reconcileMemoryUpdates,runDecayCycle,calculateCalibration,decayConfidence,memoryKey,brier,reliabilityBuckets};
