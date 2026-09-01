'use strict';

const {EPISTEMIC_CLASSES}=require('./wonder-mind-constitution');
const {normalizeMindOutput,clamp}=require('./wonder-mind-schema');

const SUPPORT_REQUIREMENTS={
  observation:{minEvidence:1,requiresAlternative:false,requiresChangeTest:false},
  validated_inference:{minEvidence:1,requiresAlternative:true,requiresChangeTest:true},
  pattern_hypothesis:{minEvidence:1,requiresAlternative:true,requiresChangeTest:true},
  speculation:{minEvidence:0,requiresAlternative:true,requiresChangeTest:true},
  philosophical_lens:{minEvidence:0,requiresAlternative:false,requiresChangeTest:false},
  prediction:{minEvidence:1,requiresAlternative:true,requiresChangeTest:true},
  judgment:{minEvidence:1,requiresAlternative:true,requiresChangeTest:true}
};

function adjudicate(raw,{retrievedEvidenceCount=0,hasLongitudinalEvidence=false,thirdPartySubject=false}={}){
  const out=normalizeMindOutput(raw);
  const definition=EPISTEMIC_CLASSES[out.epistemic_class]||EPISTEMIC_CLASSES.pattern_hypothesis;
  const req=SUPPORT_REQUIREMENTS[out.epistemic_class]||SUPPORT_REQUIREMENTS.pattern_hypothesis;
  const reasons=[];
  let confidence=out.confidence;

  if(definition.maxConfidence!=null && confidence>definition.maxConfidence){
    confidence=definition.maxConfidence;
    reasons.push('class_confidence_cap');
  }
  if(out.supporting_evidence.length<req.minEvidence){
    confidence=Math.min(confidence,.42);
    reasons.push('insufficient_explicit_support');
  }
  if(retrievedEvidenceCount===0 && ['validated_inference','prediction','judgment'].includes(out.epistemic_class)){
    confidence=Math.min(confidence,.5);
    reasons.push('no_retrieved_evidence');
  }
  if(req.requiresAlternative && out.alternative_hypotheses.length===0){
    confidence=Math.min(confidence,.58);
    reasons.push('missing_alternative_hypothesis');
  }
  if(req.requiresChangeTest && out.what_would_change_mind.length===0){
    confidence=Math.min(confidence,.58);
    reasons.push('missing_falsification_condition');
  }
  if(!hasLongitudinalEvidence && out.memory_updates.some(m=>m.stability==='stable')){
    out.memory_updates=out.memory_updates.map(m=>m.stability==='stable'?{...m,stability:'provisional',confidence:Math.min(m.confidence,.65)}:m);
    reasons.push('stable_memory_downgraded_without_longitudinal_support');
  }
  if(thirdPartySubject){
    confidence=Math.min(confidence,.66);
    out.memory_updates=[];
    reasons.push('third_party_interiority_limit');
  }

  out.confidence=clamp(confidence);
  out.memory_updates=out.memory_updates.map(m=>{
    const cap=EPISTEMIC_CLASSES[m.epistemic_class]?.maxConfidence;
    let c=clamp(m.confidence);
    if(cap!=null)c=Math.min(c,cap);
    if(m.epistemic_class==='speculation')c=Math.min(c,.45);
    return {...m,confidence:c};
  });

  return {output:out,epistemicAudit:{adjustments:reasons,finalConfidence:out.confidence,class:out.epistemic_class}};
}

module.exports={adjudicate,SUPPORT_REQUIREMENTS};
