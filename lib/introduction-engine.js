/* A conservative beta ordering rule, not a validated prediction of chemistry. */
const J=require('../public-shared/journey');
const {SECTIONS}=require('./mirror-sections');
const DIMENSIONS=['value_knowledge','value_meaning','value_stability','value_freedom','value_family','value_loyalty','value_beauty','novelty_orientation','structure_preference'];
function excluded(state){const keys=new Set();for(const [id,c] of Object.entries(state.corrections||{})){if(c.fit!=='fits'||!c.matching)for(const k of SECTIONS.find(s=>s[0]===id)?.[2]||DIMENSIONS)keys.add(k);}return keys;}
function evaluate(a,b,sa,sb){
 if(!J.permits(a,b)||!a.portrait.photo||!b.portrait.photo||!a.moderation?.photoApproved||!b.moderation?.photoApproved)return null;
 if(!sa?.scores||!sb?.scores)return null;
 const excludeA=excluded(a),excludeB=excluded(b),used=DIMENSIONS.filter(k=>!excludeA.has(k)&&!excludeB.has(k)&&(sa.confidence?.evidence?.[k]||0)>0&&(sb.confidence?.evidence?.[k]||0)>0&&Number.isFinite(sa.scores[k])&&Number.isFinite(sb.scores[k]));
 // Never replace unknown evidence with an inferred middle score.
 if(used.length<3)return null;
 const distance=used.reduce((sum,k)=>sum+Math.abs(sa.scores[k]-sb.scores[k]),0)/used.length;
 const common=(a.portrait.topics||[]).filter(x=>(b.portrait.topics||[]).includes(x));
 const planning=a.portrait.planning&&a.portrait.planning===b.portrait.planning;
 // Clear shared ground is required as well as reasonably overlapping self-report.
 if(!common.length||distance>0.9)return null;
 const reason=[`You both chose ${a.preferences.intention.toLowerCase()} and meet each other’s required participation preferences.`,`You both chose ${common.join(' and ')} as interests you would like to share.`];
 if(planning)reason.push(`Both shared portraits describe ${a.portrait.planning==='planned'?'enjoying plans made ahead':a.portrait.planning==='flexible'?'leaving room for spontaneity':'a flexible approach to planning'}.`);
 return {
  // Used only for candidate ordering, never displayed as a compatibility percentage.
  rank:(2-distance)+Math.min(common.length,3)*.25+(planning?.15:0),
  evidence:{version:'wonder-introductions-1',dimensions:used,shared_topics:common,mean_distance:distance},
  reason,
  difference:planning?'You have some common ground around plans. Ask what happens when a plan needs to change.':'Your approaches to planning may differ. Ask how much structure makes a weekend enjoyable for each of you.',
  unknown:'Your permitted discovery answers helped us consider this introduction. They cannot establish attraction, emotional comfort, or what it will feel like to meet.'
 };
}
module.exports={evaluate,excluded,DIMENSIONS};
