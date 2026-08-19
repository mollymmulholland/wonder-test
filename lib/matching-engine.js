// Wonder Matching Engine v1.1
// Matching is based on the latent person model, never archetype labels.

const ENGINE_VERSION='wonder-match-v1.1';
const VALUE_DIMS=['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_knowledge','value_service','value_influence','value_beauty','value_loyalty'];
const RELATIONSHIP_DIMS=['autonomy_need','closeness_need','reassurance_need','vulnerability_openness'];
const INTERACTION_DIMS=['conflict_directness','repair_orientation','reciprocity_sensitivity','trust_baseline'];
const COGNITIVE_DIMS=['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness'];

function clamp01(n){return Math.max(0,Math.min(1,Number(n)||0));}
function similarity(a=0,b=0){return clamp01(1-Math.min(2,Math.abs(Number(a)-Number(b)))/2);}
function dimensions(model={}){return model.dimensions||model.scores||{};}
function coverage(model={}){
  if(Number.isFinite(model.coverage))return clamp01(model.coverage);
  if(Number.isFinite(model.confidence?.coverage))return clamp01(model.confidence.coverage);
  const evidence=model.evidence||model.confidence?.evidence||{};
  const vals=Object.values(evidence).map(Number).filter(n=>Number.isFinite(n));
  if(!vals.length)return .25;
  return clamp01(vals.filter(n=>n>0).length/Math.max(vals.length,1));
}
function confidenceFor(a,b){return Math.round(((coverage(a)+coverage(b))/2)*100)/100;}

function orientationAllows(profile={},other={}){
  if(!profile.interested_in||!other.gender)return true;
  if(profile.interested_in==='Everyone')return true;
  if(profile.interested_in==='Men')return other.gender==='Man';
  if(profile.interested_in==='Women')return other.gender==='Woman';
  return true;
}

function hardCompatibility(a={},b={}){
  const reasons=[];
  if(!orientationAllows(a,b)||!orientationAllows(b,a))reasons.push('orientation');

  if(a.relationship_structure&&b.relationship_structure&&a.relationship_structure!==b.relationship_structure){
    const flexible=new Set(['Open / unsure']);
    if(!flexible.has(a.relationship_structure)&&!flexible.has(b.relationship_structure))reasons.push('relationship_structure');
  }

  if(a.relationship_intention&&b.relationship_intention){
    const flexible=new Set(['Open to discovering']);
    const committed=new Set(['Life partnership / marriage','Long-term relationship']);
    const mismatch=committed.has(a.relationship_intention)!==committed.has(b.relationship_intention);
    if(mismatch&&!flexible.has(a.relationship_intention)&&!flexible.has(b.relationship_intention))reasons.push('relationship_intention');
  }

  const noKids=new Set(['Do not want children','Have children and do not want more']);
  const wantKids=new Set(['Want children','Have children and want more']);
  if(a.children&&b.children&&((noKids.has(a.children)&&wantKids.has(b.children))||(wantKids.has(a.children)&&noKids.has(b.children))))reasons.push('children');

  return{pass:reasons.length===0,reasons};
}

function averageSimilarity(a,b,dims){
  const vals=[];
  for(const d of dims){if(a[d]!=null&&b[d]!=null)vals.push(similarity(a[d],b[d]));}
  return vals.length?vals.reduce((s,n)=>s+n,0)/vals.length:null;
}

function relationshipFit(a,b){
  const pieces=[];
  const closenessDiff=Math.abs((a.closeness_need||0)-(b.closeness_need||0));
  const autonomyDiff=Math.abs((a.autonomy_need||0)-(b.autonomy_need||0));
  const reassuranceDiff=Math.abs((a.reassurance_need||0)-(b.reassurance_need||0));
  const vulnerabilityDiff=Math.abs((a.vulnerability_openness||0)-(b.vulnerability_openness||0));
  pieces.push(1-Math.min(1,closenessDiff*.7));
  pieces.push(1-Math.min(1,autonomyDiff*.7));
  pieces.push(1-Math.min(1,reassuranceDiff*.75));
  pieces.push(1-Math.min(1,vulnerabilityDiff*.5));

  // Certain complements can work better than pure similarity.
  if((a.autonomy_need>.35&&b.closeness_need>.7)||(b.autonomy_need>.35&&a.closeness_need>.7))pieces.push(.62);
  if((a.reassurance_need>.55&&b.stress_withdrawal>.5)||(b.reassurance_need>.55&&a.stress_withdrawal>.5))pieces.push(.38);
  return pieces.reduce((s,n)=>s+clamp01(n),0)/pieces.length;
}

function interactionFit(a,b){
  const pieces=[];
  const add=(v,w)=>{if(v!=null)pieces.push({v,w});};
  add(similarity(a.repair_orientation,b.repair_orientation),1.5);
  add(similarity(a.conflict_directness,b.conflict_directness),1.1);
  add(similarity(a.trust_baseline,b.trust_baseline),.75);
  add(similarity(a.reciprocity_sensitivity,b.reciprocity_sensitivity),.75);

  // Explicitly penalize pairings where one person's stress response is likely to activate the other's attachment needs.
  if(a.reassurance_need>.5&&b.stress_withdrawal>.45)add(.35,1.1);
  if(b.reassurance_need>.5&&a.stress_withdrawal>.45)add(.35,1.1);
  if(a.conflict_directness>.55&&b.stress_withdrawal>.55)add(.48,.7);
  if(b.conflict_directness>.55&&a.stress_withdrawal>.55)add(.48,.7);
  if(!pieces.length)return null;
  const total=pieces.reduce((s,p)=>s+p.w,0);
  return pieces.reduce((s,p)=>s+p.v*p.w,0)/total;
}

function buildRationale(values,relationship,interaction,cognitive,a,b){
  const strengths=[],tensions=[];
  if(values>.8)strengths.push('Your underlying values are unusually aligned.');
  if(relationship>.8)strengths.push('Your preferred balance of closeness and independence looks naturally compatible.');
  if(interaction>.8)strengths.push('Your conflict and repair patterns are likely to make misunderstandings easier to recover from.');
  if(cognitive>.82)strengths.push('You are likely to recognize each other’s way of making sense of complexity.');
  if(Math.abs((a.closeness_need||0)-(b.closeness_need||0))>.75)tensions.push('You may want substantially different amounts of emotional contact.');
  if(Math.abs((a.autonomy_need||0)-(b.autonomy_need||0))>.75)tensions.push('Independence may mean very different things to each of you.');
  if(interaction<.55)tensions.push('Conflict or repair may require unusually explicit communication.');
  if(values<.58)tensions.push('Some high-priority values may pull your lives in different directions.');
  return{strengths,tensions};
}

function compatibility(a,b){
  const hard=hardCompatibility(a.profile||{},b.profile||{});
  const confidence=confidenceFor(a.model||{},b.model||{});
  if(!hard.pass)return{eligible:false,score:0,confidence,hard_conflicts:hard.reasons,components:{},rationale:{strengths:[],tensions:[]}};

  const av=dimensions(a.model),bv=dimensions(b.model);
  const values=averageSimilarity(av,bv,VALUE_DIMS);
  const relationship=relationshipFit(av,bv);
  const interaction=interactionFit(av,bv);
  const cognitive=averageSimilarity(av,bv,COGNITIVE_DIMS);

  const weighted=[[values,.35],[relationship,.30],[interaction,.25],[cognitive,.10]].filter(([v])=>v!=null);
  const denom=weighted.reduce((s,[,w])=>s+w,0)||1;
  const raw=weighted.reduce((s,[v,w])=>s+(v*w),0)/denom;
  const score=Math.round(clamp01(raw)*100);
  return{
    eligible:true,
    score,
    confidence,
    hard_conflicts:[],
    components:{values,relationship,interaction,cognitive},
    rationale:buildRationale(values??.5,relationship??.5,interaction??.5,cognitive??.5,av,bv),
    engine_version:ENGINE_VERSION
  };
}

module.exports={ENGINE_VERSION,VALUE_DIMS,RELATIONSHIP_DIMS,INTERACTION_DIMS,COGNITIVE_DIMS,hardCompatibility,compatibility};