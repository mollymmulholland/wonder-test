// Wonder Matching Engine v1.2
// Hard practical constraints gate candidates before psychometric compatibility.

const ENGINE_VERSION='wonder-match-v1.2';
const VALUE_DIMS=['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_knowledge','value_service','value_influence','value_beauty','value_loyalty'];
const RELATIONSHIP_DIMS=['autonomy_need','closeness_need','reassurance_need','vulnerability_openness'];
const INTERACTION_DIMS=['conflict_directness','repair_orientation','reciprocity_sensitivity','trust_baseline'];
const COGNITIVE_DIMS=['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness'];

function clamp01(n){return Math.max(0,Math.min(1,Number(n)||0));}
function similarity(a=0,b=0){return clamp01(1-Math.min(2,Math.abs(Number(a)-Number(b)))/2);}
function dimensions(model={}){return model.dimensions||model.scores||{};}
function coverage(model={}){if(Number.isFinite(model.coverage))return clamp01(model.coverage);if(Number.isFinite(model.confidence?.coverage))return clamp01(model.confidence.coverage);const evidence=model.evidence||model.confidence?.evidence||{};const vals=Object.values(evidence).map(Number).filter(Number.isFinite);return vals.length?clamp01(vals.filter(n=>n>0).length/vals.length):.25;}
function confidenceFor(a,b){return Math.round(((coverage(a)+coverage(b))/2)*100)/100;}

function ageFromDob(dob){if(!dob)return null;const d=new Date(`${dob}T12:00:00Z`);if(Number.isNaN(d.getTime()))return null;const now=new Date();let age=now.getUTCFullYear()-d.getUTCFullYear();const md=now.getUTCMonth()-d.getUTCMonth();if(md<0||(md===0&&now.getUTCDate()<d.getUTCDate()))age--;return age;}
function parseAgeRange(value){const nums=String(value||'').match(/\d{2}/g)?.map(Number)||[];if(!nums.length)return null;if(nums.length===1)return{min:nums[0],max:nums[0]};return{min:Math.min(nums[0],nums[1]),max:Math.max(nums[0],nums[1])};}
function parseDistance(value){const v=String(value||'').trim();if(!v)return null;if(/anywhere/i.test(v))return{type:'anywhere',miles:Infinity};if(/same country/i.test(v))return{type:'country',miles:Infinity};const n=Number(v.match(/[\d.]+/)?.[0]);return Number.isFinite(n)?{type:'radius',miles:n}:null;}
function haversineMiles(a,b){if(!a||!b||!Number.isFinite(Number(a.lat))||!Number.isFinite(Number(a.lng))||!Number.isFinite(Number(b.lat))||!Number.isFinite(Number(b.lng)))return null;const R=3958.7613,toRad=x=>x*Math.PI/180;const dLat=toRad(Number(b.lat)-Number(a.lat)),dLng=toRad(Number(b.lng)-Number(a.lng));const x=Math.sin(dLat/2)**2+Math.cos(toRad(Number(a.lat)))*Math.cos(toRad(Number(b.lat)))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function orientationAllows(profile={},other={}){if(!profile.interested_in||!other.gender)return true;if(profile.interested_in==='Everyone')return true;if(profile.interested_in==='Men')return other.gender==='Man';if(profile.interested_in==='Women')return other.gender==='Woman';return true;}

function hardCompatibility(a={},b={}){
  const reasons=[];const details={};
  if(!orientationAllows(a,b)||!orientationAllows(b,a))reasons.push('orientation');

  if(a.relationship_structure&&b.relationship_structure&&a.relationship_structure!==b.relationship_structure){const flexible=new Set(['Open / unsure']);if(!flexible.has(a.relationship_structure)&&!flexible.has(b.relationship_structure))reasons.push('relationship_structure');}
  if(a.relationship_intention&&b.relationship_intention){const flexible=new Set(['Open to discovering']);const committed=new Set(['Life partnership / marriage','Long-term relationship']);if(committed.has(a.relationship_intention)!==committed.has(b.relationship_intention)&&!flexible.has(a.relationship_intention)&&!flexible.has(b.relationship_intention))reasons.push('relationship_intention');}

  const noKids=new Set(['Do not want children','Have children and do not want more']);const wantKids=new Set(['Want children','Have children and want more']);
  if(a.children&&b.children&&((noKids.has(a.children)&&wantKids.has(b.children))||(wantKids.has(a.children)&&noKids.has(b.children))))reasons.push('children');

  const aRange=parseAgeRange(a.age_range),bRange=parseAgeRange(b.age_range),aAge=a._age??ageFromDob(a.date_of_birth),bAge=b._age??ageFromDob(b.date_of_birth);
  details.ages={self:aAge,candidate:bAge};
  if(aRange&&Number.isFinite(bAge)&&(bAge<aRange.min||bAge>aRange.max))reasons.push('age_range');
  if(bRange&&Number.isFinite(aAge)&&(aAge<bRange.min||aAge>bRange.max))reasons.push('mutual_age_range');

  const distance=haversineMiles(a.location_data,b.location_data);details.distance_miles=distance==null?null:Math.round(distance*10)/10;
  for(const [owner,other] of [[a,b],[b,a]]){
    const pref=parseDistance(owner.max_distance);if(!pref)continue;
    if(pref.type==='country'&&owner.location_data?.country_code&&other.location_data?.country_code&&owner.location_data.country_code!==other.location_data.country_code){reasons.push('distance_country');break;}
    if(pref.type==='radius'&&distance!=null&&distance>pref.miles){reasons.push('distance');break;}
  }
  return{pass:reasons.length===0,reasons:[...new Set(reasons)],details};
}

function averageSimilarity(a,b,dims){const vals=[];for(const d of dims){if(a[d]!=null&&b[d]!=null)vals.push(similarity(a[d],b[d]));}return vals.length?vals.reduce((s,n)=>s+n,0)/vals.length:null;}
function relationshipFit(a,b){const pieces=[];for(const d of RELATIONSHIP_DIMS){if(a[d]!=null&&b[d]!=null){const diff=Math.abs(a[d]-b[d]);pieces.push(1-Math.min(1,diff*(d==='reassurance_need'?.75:.6)));}}if((a.reassurance_need>.55&&b.stress_withdrawal>.5)||(b.reassurance_need>.55&&a.stress_withdrawal>.5))pieces.push(.38);return pieces.length?pieces.reduce((s,n)=>s+clamp01(n),0)/pieces.length:null;}
function interactionFit(a,b){const pieces=[],add=(v,w)=>{if(v!=null)pieces.push({v,w})};add(similarity(a.repair_orientation,b.repair_orientation),1.5);add(similarity(a.conflict_directness,b.conflict_directness),1.1);add(similarity(a.trust_baseline,b.trust_baseline),.75);add(similarity(a.reciprocity_sensitivity,b.reciprocity_sensitivity),.75);if(a.reassurance_need>.5&&b.stress_withdrawal>.45)add(.35,1.1);if(b.reassurance_need>.5&&a.stress_withdrawal>.45)add(.35,1.1);if(a.conflict_directness>.55&&b.stress_withdrawal>.55)add(.48,.7);if(b.conflict_directness>.55&&a.stress_withdrawal>.55)add(.48,.7);if(!pieces.length)return null;const total=pieces.reduce((s,p)=>s+p.w,0);return pieces.reduce((s,p)=>s+p.v*p.w,0)/total;}
function buildRationale(values,relationship,interaction,cognitive,a,b,hard){const strengths=[],tensions=[];if(values>.8)strengths.push('Your underlying values are unusually aligned.');if(relationship>.8)strengths.push('Your preferred balance of closeness and independence looks naturally compatible.');if(interaction>.8)strengths.push('Your conflict and repair patterns are likely to make misunderstandings easier to recover from.');if(cognitive>.82)strengths.push('You are likely to recognize each other’s way of making sense of complexity.');if(hard.details?.distance_miles!=null&&hard.details.distance_miles<15)strengths.push('Your lives are geographically easy to bring into the same room.');if(Math.abs((a.closeness_need||0)-(b.closeness_need||0))>.75)tensions.push('You may want substantially different amounts of emotional contact.');if(Math.abs((a.autonomy_need||0)-(b.autonomy_need||0))>.75)tensions.push('Independence may mean very different things to each of you.');if(interaction<.55)tensions.push('Conflict or repair may require unusually explicit communication.');if(values<.58)tensions.push('Some high-priority values may pull your lives in different directions.');return{strengths,tensions};}

function compatibility(a,b){
  const hard=hardCompatibility(a.profile||{},b.profile||{});const confidence=confidenceFor(a.model||{},b.model||{});
  if(!hard.pass)return{eligible:false,score:0,confidence,hard_conflicts:hard.reasons,hard_details:hard.details,components:{},rationale:{strengths:[],tensions:[]},engine_version:ENGINE_VERSION};
  const av=dimensions(a.model),bv=dimensions(b.model);const values=averageSimilarity(av,bv,VALUE_DIMS),relationship=relationshipFit(av,bv),interaction=interactionFit(av,bv),cognitive=averageSimilarity(av,bv,COGNITIVE_DIMS);
  const weighted=[[values,.35],[relationship,.30],[interaction,.25],[cognitive,.10]].filter(([v])=>v!=null),denom=weighted.reduce((s,[,w])=>s+w,0)||1,raw=weighted.reduce((s,[v,w])=>s+(v*w),0)/denom;
  return{eligible:true,score:Math.round(clamp01(raw)*100),confidence,hard_conflicts:[],hard_details:hard.details,components:{values,relationship,interaction,cognitive},rationale:buildRationale(values??.5,relationship??.5,interaction??.5,cognitive??.5,av,bv,hard),engine_version:ENGINE_VERSION};
}

module.exports={ENGINE_VERSION,VALUE_DIMS,RELATIONSHIP_DIMS,INTERACTION_DIMS,COGNITIVE_DIMS,ageFromDob,parseAgeRange,parseDistance,haversineMiles,hardCompatibility,compatibility};