// Wonder Matching Engine v1
// Matching is intentionally separate from archetype labels.

const HARD_FIELDS=['gender','interested_in','relationship_intention','relationship_structure','children'];

const ALIGNMENT_DIMENSIONS=[
  'value_family','value_achievement','value_meaning','value_freedom','value_stability','value_knowledge','value_service','value_influence','value_beauty','value_loyalty',
  'novelty_orientation','structure_preference','conflict_directness','repair_orientation','trust_baseline','reciprocity_sensitivity'
];

const NEGOTIATED_DIMENSIONS=[
  'autonomy_need','closeness_need','reassurance_need','vulnerability_openness','social_initiation','emotional_intensity'
];

function clamp01(n){return Math.max(0,Math.min(1,n));}
function similarity(a=0,b=0){return 1-Math.min(2,Math.abs(a-b))/2;}

function hardCompatibility(aProfile={},bProfile={}){
  const reasons=[];
  // These are conservative MVP checks. Missing data does not reject a match.
  if(aProfile.relationship_structure && bProfile.relationship_structure && aProfile.relationship_structure!==bProfile.relationship_structure){
    reasons.push('relationship_structure');
  }
  if(aProfile.relationship_intention && bProfile.relationship_intention){
    const longTerm=new Set(['Life partnership / marriage','Long-term relationship']);
    const aLong=longTerm.has(aProfile.relationship_intention), bLong=longTerm.has(bProfile.relationship_intention);
    if(aLong!==bLong && ![aProfile.relationship_intention,bProfile.relationship_intention].includes('Open to discovering')) reasons.push('relationship_intention');
  }
  // Children should eventually use structured willingness fields rather than a single label.
  const noKids=new Set(['Do not want children','Have children and do not want more']);
  const wantKids=new Set(['Want children','Have children and want more']);
  if(aProfile.children && bProfile.children && ((noKids.has(aProfile.children)&&wantKids.has(bProfile.children))||(wantKids.has(aProfile.children)&&noKids.has(bProfile.children)))) reasons.push('children');
  return {pass:reasons.length===0,reasons};
}

function alignmentScore(a,b,dimensions=ALIGNMENT_DIMENSIONS){
  const vals=[];
  for(const d of dimensions){
    if(a?.[d]==null||b?.[d]==null) continue;
    vals.push(similarity(a[d],b[d]));
  }
  return vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null;
}

function negotiatedScore(a,b){
  const vals=[];
  for(const d of NEGOTIATED_DIMENSIONS){
    if(a?.[d]==null||b?.[d]==null) continue;
    const diff=Math.abs(a[d]-b[d]);
    // Moderate differences can be fine; large mismatches create friction.
    vals.push(diff<=.55 ? 1-(diff*.35) : Math.max(0,1-diff));
  }
  return vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null;
}

function interactionScore(a,b){
  const pieces=[];
  const pair=(x,y,weight=1)=>{if(x!=null&&y!=null)pieces.push({v:similarity(x,y),weight});};
  pair(a.conflict_directness,b.conflict_directness,1.2);
  pair(a.repair_orientation,b.repair_orientation,1.4);
  pair(a.reciprocity_sensitivity,b.reciprocity_sensitivity,.8);
  pair(a.vulnerability_openness,b.vulnerability_openness,.9);
  pair(a.trust_baseline,b.trust_baseline,.8);
  if(!pieces.length)return null;
  const total=pieces.reduce((s,p)=>s+p.weight,0);
  return pieces.reduce((s,p)=>s+p.v*p.weight,0)/total;
}

function confidenceFor(aModel,bModel){
  const a=Object.values(aModel?.confidence||{}), b=Object.values(bModel?.confidence||{});
  if(!a.length||!b.length)return 0;
  const mean=x=>x.reduce((s,n)=>s+n,0)/x.length;
  return clamp01((mean(a)+mean(b))/2);
}

function compatibility(a,b){
  const hard=hardCompatibility(a.profile,b.profile);
  if(!hard.pass) return {eligible:false,score:0,confidence:confidenceFor(a.model,b.model),hard_conflicts:hard.reasons,components:{}};

  const av=a.model?.scores||{}, bv=b.model?.scores||{};
  const values=alignmentScore(av,bv);
  const relationship=negotiatedScore(av,bv);
  const interaction=interactionScore(av,bv);
  const cognitive=alignmentScore(av,bv,['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness']);

  const weighted=[
    [values,.35],
    [relationship,.30],
    [interaction,.25],
    [cognitive,.10]
  ].filter(([v])=>v!=null);
  const denom=weighted.reduce((s,[,w])=>s+w,0)||1;
  const raw=weighted.reduce((s,[v,w])=>s+v*w,0)/denom;
  const confidence=confidenceFor(a.model,b.model);

  const strengths=[]; const tensions=[];
  if(values!=null && values>.78) strengths.push('strong values alignment');
  if(relationship!=null && relationship>.78) strengths.push('compatible closeness and autonomy needs');
  if(interaction!=null && interaction>.78) strengths.push('compatible conflict and repair style');
  if(cognitive!=null && cognitive>.8) strengths.push('similar way of processing complexity');
  if(values!=null && values<.55) tensions.push('meaningful values differences');
  if(relationship!=null && relationship<.55) tensions.push('different closeness or autonomy needs');
  if(interaction!=null && interaction<.55) tensions.push('different conflict or repair patterns');

  return {
    eligible:true,
    score:Math.round(raw*100),
    confidence:Math.round(confidence*100)/100,
    hard_conflicts:[],
    components:{values,relationship,interaction,cognitive},
    rationale:{strengths,tensions}
  };
}

module.exports={HARD_FIELDS,ALIGNMENT_DIMENSIONS,NEGOTIATED_DIMENSIONS,hardCompatibility,compatibility};