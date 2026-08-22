// Wonder Matching Engine v2.0
// Compatibility is not sameness. Hard constraints gate first; then Wonder asks whether
// two people can support each other's values, relational needs, interaction patterns,
// and meaningful cross-element tensions.

const ENGINE_VERSION='wonder-match-v2.0';
const VALUE_DIMS=['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_knowledge','value_service','value_influence','value_beauty','value_loyalty'];
const COGNITIVE_DIMS=['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness'];

function clamp01(n){return Math.max(0,Math.min(1,Number(n)||0));}
function similarity(a=0,b=0){return clamp01(1-Math.min(2,Math.abs(Number(a)-Number(b)))/2);}
function dimensions(model={}){return model.dimensions||model.scores||{};}
function coverage(model={}){if(Number.isFinite(model.coverage))return clamp01(model.coverage);if(Number.isFinite(model.confidence?.coverage))return clamp01(model.confidence.coverage);const evidence=model.evidence||model.confidence?.evidence||{};const vals=Object.values(evidence).map(Number).filter(Number.isFinite);return vals.length?clamp01(vals.filter(n=>n>0).length/vals.length):.25;}
function confidenceFor(a,b){return Math.round(((coverage(a)+coverage(b))/2)*100)/100;}
function avg(vals){const v=vals.filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}
function weighted(parts){const usable=parts.filter(p=>Number.isFinite(p.value)&&p.weight>0);const den=usable.reduce((s,p)=>s+p.weight,0);return den?usable.reduce((s,p)=>s+p.value*p.weight,0)/den:null;}

function ageFromDob(dob){if(!dob)return null;const d=new Date(`${dob}T12:00:00Z`);if(Number.isNaN(d.getTime()))return null;const now=new Date();let age=now.getUTCFullYear()-d.getUTCFullYear();const md=now.getUTCMonth()-d.getUTCMonth();if(md<0||(md===0&&now.getUTCDate()<d.getUTCDate()))age--;return age;}
function parseAgeRange(value){const nums=String(value||'').match(/\d{2}/g)?.map(Number)||[];if(!nums.length)return null;if(nums.length===1)return{min:nums[0],max:nums[0]};return{min:Math.min(nums[0],nums[1]),max:Math.max(nums[0],nums[1])};}
function parseDistance(value){const v=String(value||'').trim();if(!v)return null;if(/anywhere/i.test(v))return{type:'anywhere',miles:Infinity};if(/same country/i.test(v))return{type:'country',miles:Infinity};const n=Number(v.match(/[\d.]+/)?.[0]);return Number.isFinite(n)?{type:'radius',miles:n}:null;}
function haversineMiles(a,b){if(!a||!b||!Number.isFinite(Number(a.lat))||!Number.isFinite(Number(a.lng))||!Number.isFinite(Number(b.lat))||!Number.isFinite(Number(b.lng)))return null;const R=3958.7613,toRad=x=>x*Math.PI/180;const dLat=toRad(Number(b.lat)-Number(a.lat)),dLng=toRad(Number(b.lng)-Number(a.lng));const x=Math.sin(dLat/2)**2+Math.cos(toRad(Number(a.lat)))*Math.cos(toRad(Number(b.lat)))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function orientationAllows(profile={},other={}){if(!profile.interested_in||!other.gender)return true;if(profile.interested_in==='Everyone')return true;if(profile.interested_in==='Men')return other.gender==='Man';if(profile.interested_in==='Women')return other.gender==='Woman';return true;}

function hardCompatibility(a={},b={}){
 const reasons=[],details={};if(!orientationAllows(a,b)||!orientationAllows(b,a))reasons.push('orientation');
 if(a.relationship_structure&&b.relationship_structure&&a.relationship_structure!==b.relationship_structure){const flexible=new Set(['Open / unsure']);if(!flexible.has(a.relationship_structure)&&!flexible.has(b.relationship_structure))reasons.push('relationship_structure');}
 if(a.relationship_intention&&b.relationship_intention){const flexible=new Set(['Open to discovering']);const committed=new Set(['Life partnership / marriage','Long-term relationship']);if(committed.has(a.relationship_intention)!==committed.has(b.relationship_intention)&&!flexible.has(a.relationship_intention)&&!flexible.has(b.relationship_intention))reasons.push('relationship_intention');}
 const noKids=new Set(['Do not want children','Have children and do not want more']),wantKids=new Set(['Want children','Have children and want more']);if(a.children&&b.children&&((noKids.has(a.children)&&wantKids.has(b.children))||(wantKids.has(a.children)&&noKids.has(b.children))))reasons.push('children');
 const aRange=parseAgeRange(a.age_range),bRange=parseAgeRange(b.age_range),aAge=a._age??ageFromDob(a.date_of_birth),bAge=b._age??ageFromDob(b.date_of_birth);details.ages={self:aAge,candidate:bAge};if(aRange&&Number.isFinite(bAge)&&(bAge<aRange.min||bAge>aRange.max))reasons.push('age_range');if(bRange&&Number.isFinite(aAge)&&(aAge<bRange.min||aAge>bRange.max))reasons.push('mutual_age_range');
 const distance=haversineMiles(a.location_data,b.location_data);details.distance_miles=distance==null?null:Math.round(distance*10)/10;for(const [owner,other] of [[a,b],[b,a]]){const pref=parseDistance(owner.max_distance);if(!pref)continue;if(pref.type==='country'&&owner.location_data?.country_code&&other.location_data?.country_code&&owner.location_data.country_code!==other.location_data.country_code){reasons.push('distance_country');break;}if(pref.type==='radius'&&distance!=null&&distance>pref.miles){reasons.push('distance');break;}}
 return{pass:reasons.length===0,reasons:[...new Set(reasons)],details};
}

function valueAlignment(a,b){
 const vals=[];for(const d of VALUE_DIMS){if(a[d]==null||b[d]==null)continue;const importance=Math.max(.35,(Math.abs(a[d])+Math.abs(b[d]))/2);vals.push({score:similarity(a[d],b[d]),weight:importance});}
 return weighted(vals.map(x=>({value:x.score,weight:x.weight})))??.5;
}

// Directional support: score how well B's pattern can accommodate A's need, then reverse it.
function supportOneWay(needs,supporter){const parts=[];
 const need=(k)=>Number(needs[k]||0),sup=(k)=>Number(supporter[k]||0),add=(value,weight,label)=>parts.push({value:clamp01(value),weight,label});
 if(need('closeness_need')>.15)add(1-Math.max(0,need('closeness_need')-sup('closeness_need'))*.75,1.2,'closeness');
 if(need('autonomy_need')>.15)add(1-Math.max(0,need('autonomy_need')-sup('autonomy_need'))*.7,1.1,'autonomy');
 if(need('reassurance_need')>.15){let v=.72+(sup('repair_orientation')*.18)+(sup('closeness_need')*.12)-(Math.max(0,sup('stress_withdrawal'))*.35);add(v,1.35,'reassurance support');}
 if(need('vulnerability_openness')>.15){let v=.72+(sup('trust_baseline')*.14)+(sup('repair_orientation')*.18)-(Math.max(0,sup('conflict_directness')-.55)*.18);add(v,1,'vulnerability safety');}
 if(need('reciprocity_sensitivity')>.15){let v=.7+(sup('repair_orientation')*.16)+(sup('closeness_need')*.1)-(Math.max(0,sup('stress_withdrawal'))*.2);add(v,.85,'reciprocity');}
 return parts.length?weighted(parts):.62;
}
function relationalSupport(a,b){const ab=supportOneWay(a,b),ba=supportOneWay(b,a);return{score:avg([ab,ba]),a_supported_by_b:ab,b_supported_by_a:ba};}

function interactionFit(a,b){const parts=[];
 const add=(value,weight)=>parts.push({value:clamp01(value),weight});
 add(similarity(a.repair_orientation,b.repair_orientation),1.35);
 // Directness need not be identical. Moderate difference can work if repair is strong.
 const directDiff=Math.abs((a.conflict_directness||0)-(b.conflict_directness||0));let direct=1-Math.min(1,directDiff*.52);const repairAvg=((a.repair_orientation||0)+(b.repair_orientation||0))/2;if(directDiff>.45&&repairAvg>.35)direct=Math.min(1,direct+.12);add(direct,1);
 add(similarity(a.trust_baseline,b.trust_baseline),.55);add(similarity(a.reciprocity_sensitivity,b.reciprocity_sensitivity),.55);
 if((a.reassurance_need>.45&&b.stress_withdrawal>.4)||(b.reassurance_need>.45&&a.stress_withdrawal>.4))add(.28,1.35);
 if((a.closeness_need>.4&&b.stress_withdrawal>.5)||(b.closeness_need>.4&&a.stress_withdrawal>.5))add(.38,1.1);
 return weighted(parts)??.5;
}

function productiveComplementarity(a,b){const parts=[];
 // Complementarity is rewarded only inside bounded ranges; extremes are not romanticized.
 const bounded=(x)=>Math.abs(Number(x)||0)<.78;
 const pair=(x,y,idealDiff=.28)=>{if(!bounded(x)||!bounded(y))return .45;const diff=Math.abs((x||0)-(y||0));return clamp01(1-Math.abs(diff-idealDiff)*1.25);};
 parts.push(pair(a.social_initiation,b.social_initiation,.32));
 parts.push(pair(a.cognitive_systemizing,b.cognitive_contextual,.25));
 parts.push(pair(b.cognitive_systemizing,a.cognitive_contextual,.25));
 // Similarity is safer than complementarity for emotional intensity and structure extremes.
 parts.push(similarity(a.emotional_intensity,b.emotional_intensity));
 parts.push(similarity(a.structure_preference,b.structure_preference));
 return avg(parts)??.5;
}

function crossPatterns(person={}){return person.mirror?.cross_element_patterns||person.model?.mirror_basis?.cross_element_patterns||person.cross_element_patterns||[];}
function patternSupport(pattern,owner,supporter){const a=dimensions(owner.model||{}),b=dimensions(supporter.model||{});const key=String(pattern?.key||'');
 if(key==='closeness_autonomy')return avg([supportOneWay(a,b),similarity(a.autonomy_need,b.autonomy_need)]);
 if(key==='autonomy_reassurance')return avg([supportOneWay(a,b),1-Math.max(0,(b.stress_withdrawal||0))*0.45]);
 if(key==='closeness_withdrawal')return avg([supportOneWay(a,b),clamp01(.72+(b.repair_orientation||0)*.18-(b.stress_withdrawal||0)*.28)]);
 if(key==='freedom_stability')return avg([similarity(a.value_freedom,b.value_freedom),similarity(a.value_stability,b.value_stability)]);
 if(key==='achievement_meaning')return avg([similarity(a.value_achievement,b.value_achievement),similarity(a.value_meaning,b.value_meaning)]);
 if(key==='family_autonomy')return avg([similarity(a.value_family,b.value_family),supportOneWay(a,b)]);
 return .6;
}
function tensionSupport(a,b){const pa=crossPatterns(a),pb=crossPatterns(b),pieces=[];for(const p of pa.slice(0,4))pieces.push(patternSupport(p,a,b));for(const p of pb.slice(0,4))pieces.push(patternSupport(p,b,a));return pieces.length?avg(pieces):.62;}

function cognitiveFit(a,b){const sim=avg(COGNITIVE_DIMS.map(d=>a[d]!=null&&b[d]!=null?similarity(a[d],b[d]):NaN));const cross=avg([similarity(a.cognitive_systemizing,b.cognitive_contextual),similarity(b.cognitive_systemizing,a.cognitive_contextual)]);return avg([sim??.5,cross??.5]);}

function conviction(score,confidence,components){let band='exploratory';if(score>=.82&&confidence>=.68)band='strong';else if(score>=.72&&confidence>=.55)band='promising';else if(score<.58)band='weak';const weak=Object.entries(components).filter(([,v])=>Number.isFinite(v)&&v<.5).map(([k])=>k);if(weak.length>=2&&band==='strong')band='promising';return band;}
function buildRationale(c,a,b,hard){const strengths=[],tensions=[];if(c.values>.8)strengths.push('The lives you are each trying to build appear unusually aligned.');if(c.relational_support>.78)strengths.push('Your needs for closeness, autonomy, and reassurance look mutually supportable rather than merely similar.');if(c.interaction>.78)strengths.push('Your conflict and repair patterns give this connection a strong path back after misunderstanding.');if(c.tension_support>.76)strengths.push('Each person appears capable of making room for an important tension in the other rather than forcing one side of it to disappear.');if(c.complementarity>.75)strengths.push('There is enough difference here to create expansion without the differences becoming obvious friction.');if(hard.details?.distance_miles!=null&&hard.details.distance_miles<15)strengths.push('Your lives are geographically easy to bring into the same room.');if(c.relational_support<.52)tensions.push('At least one person may repeatedly need something the other does not naturally provide.');if(c.interaction<.52)tensions.push('Conflict or repair could become costly unless both people communicate unusually explicitly.');if(c.values<.58)tensions.push('Some high-priority life values may pull the relationship in different directions.');if(c.tension_support<.5)tensions.push('One person’s internal push-pull may be amplified rather than supported by the other person’s style.');return{strengths,tensions};}

function compatibility(a,b){
 const hard=hardCompatibility(a.profile||{},b.profile||{}),confidence=confidenceFor(a.model||{},b.model||{});if(!hard.pass)return{eligible:false,score:0,confidence,conviction:'ineligible',hard_conflicts:hard.reasons,hard_details:hard.details,components:{},rationale:{strengths:[],tensions:[]},engine_version:ENGINE_VERSION};
 const av=dimensions(a.model),bv=dimensions(b.model);const rel=relationalSupport(av,bv);
 const components={values:valueAlignment(av,bv),relational_support:rel.score,interaction:interactionFit(av,bv),tension_support:tensionSupport(a,b),complementarity:productiveComplementarity(av,bv),cognitive:cognitiveFit(av,bv)};
 const raw=weighted([{value:components.values,weight:.27},{value:components.relational_support,weight:.25},{value:components.interaction,weight:.20},{value:components.tension_support,weight:.14},{value:components.complementarity,weight:.08},{value:components.cognitive,weight:.06}]);
 const score=clamp01(raw??.5),band=conviction(score,confidence,components),rationale=buildRationale(components,a,b,hard);
 return{eligible:true,score:Math.round(score*100),confidence,conviction:band,hard_conflicts:[],hard_details:hard.details,components:{...components,a_supported_by_b:rel.a_supported_by_b,b_supported_by_a:rel.b_supported_by_a},rationale,engine_version:ENGINE_VERSION};
}

module.exports={ENGINE_VERSION,VALUE_DIMS,COGNITIVE_DIMS,ageFromDob,parseAgeRange,parseDistance,haversineMiles,hardCompatibility,compatibility};