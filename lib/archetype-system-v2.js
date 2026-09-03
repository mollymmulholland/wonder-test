// Wonder Archetype System v2.0
// Original composite model. Big Five-like traits are the empirical backbone; Jung/MBTI-like
// preferences, PI-inspired behavioral drives, and interpersonal motives add interpretive layers.
// This is not an MBTI, Predictive Index, Big Five, Jungian, or clinical assessment.

const VERSION='wonder-archetypes-v2.0';
const clamp=(n,min=-1,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const avg=(...xs)=>{const v=xs.flat().filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0};
const pos=n=>(clamp(n)+1)/2;
const inv=n=>-clamp(n);

function deriveFoundations(model={}){
 const d=model.dimensions||model.scores||{};
 const g=k=>Number(d[k]||0);
 const big5={
  openness:avg(g('novelty_orientation'),g('ambiguity_tolerance'),g('cognitive_contextual'),g('value_knowledge'),g('value_meaning'),g('value_beauty')),
  conscientiousness:avg(g('structure_preference'),g('decisiveness'),g('competence_identity'),g('value_stability'),g('stress_control')),
  extraversion:avg(g('social_initiation'),g('recognition_need')*.45,g('belonging_need')*.35),
  agreeableness:avg(g('repair_orientation'),g('trust_baseline'),g('stress_accommodation'),g('value_loyalty'),g('belonging_need')),
  emotional_sensitivity:avg(g('emotional_intensity'),g('reassurance_need'),g('reciprocity_sensitivity'),inv(g('trust_baseline'))*.35)
 };
 // Continuous preference axes. Positive values indicate the second pole named in the key.
 const jung={
  extraversion:avg(g('social_initiation'),g('recognition_need')*.25),
  intuition:avg(g('cognitive_contextual'),g('ambiguity_tolerance'),g('novelty_orientation'),g('value_meaning'),inv(g('structure_preference'))*.2),
  feeling:avg(g('closeness_need'),g('belonging_need'),g('emotional_intensity'),g('value_loyalty'),inv(g('cognitive_systemizing'))*.25),
  perceiving:avg(g('ambiguity_tolerance'),g('novelty_orientation'),inv(g('structure_preference')),inv(g('decisiveness'))*.45)
 };
 // PI-inspired behavioral drives. Names are Wonder's own and are not PI scores.
 const behavior={
  agency:avg(g('autonomy_need'),g('decisiveness'),g('value_influence'),g('conflict_directness'),g('competence_identity')),
  social_reach:avg(g('social_initiation'),g('recognition_need'),g('belonging_need')),
  pace_stability:avg(g('value_stability'),g('structure_preference'),inv(g('novelty_orientation'))),
  precision:avg(g('structure_preference'),g('cognitive_systemizing'),g('competence_identity'),g('decisiveness')*.4),
  objectivity:avg(g('cognitive_systemizing'),g('decisiveness'),inv(g('emotional_intensity'))*.45)
 };
 const motives={
  intimacy:avg(g('closeness_need'),g('vulnerability_openness'),g('reciprocity_sensitivity'),g('value_loyalty')),
  autonomy:avg(g('autonomy_need'),g('value_freedom'),g('distinctiveness_need')),
  influence:avg(g('value_influence'),g('recognition_need'),g('competence_identity'),g('decisiveness')),
  discovery:avg(g('novelty_orientation'),g('value_knowledge'),g('ambiguity_tolerance')),
  security:avg(g('value_stability'),g('value_family'),g('trust_baseline'),g('structure_preference')),
  meaning:avg(g('value_meaning'),g('cognitive_contextual'),g('value_service')),
  beauty:avg(g('value_beauty'),g('emotional_intensity'),g('distinctiveness_need')),
  belonging:avg(g('belonging_need'),g('value_family'),g('closeness_need'))
 };
 return{big5,jung,behavior,motives};
}

const A=(essence,elements,prototype,signature,relational)=>({essence,elements,prototype,signature,relational});
const ARCHETYPES={
 Architect:A('Builds coherence from complexity.',['Earth','Air'],{cognitive_systemizing:.82,structure_preference:.68,competence_identity:.72,decisiveness:.48,value_achievement:.42},{'big5.conscientiousness':.7,'behavior.precision':.82,'behavior.agency':.42,'jung.perceiving':-.55},{gift:'structure and follow-through',need:'respect plus emotional access',shadow:'control can substitute for vulnerability'}),
 Seer:A('Perceives patterns beneath the obvious.',['Air','Ether','Water'],{cognitive_contextual:.82,ambiguity_tolerance:.65,value_meaning:.68,value_knowledge:.58,vulnerability_openness:.35},{'big5.openness':.8,'jung.intuition':.82,'motives.meaning':.78,'behavior.precision':-.15},{gift:'nuance and perception',need:'depth without premature certainty',shadow:'interpretation can replace direct communication'}),
 Explorer:A('Expands through encounter, movement, and possibility.',['Air','Fire'],{novelty_orientation:.86,value_freedom:.76,autonomy_need:.48,ambiguity_tolerance:.48,social_initiation:.28},{'big5.openness':.78,'jung.perceiving':.72,'motives.discovery':.88,'behavior.pace_stability':-.62},{gift:'expansion and play',need:'freedom that still has relational substance',shadow:'novelty can become avoidance'}),
 Sovereign:A('Creates direction and consequential outcomes.',['Fire','Earth'],{value_influence:.72,competence_identity:.78,decisiveness:.72,stress_control:.55,autonomy_need:.42,conflict_directness:.38},{'behavior.agency':.88,'big5.conscientiousness':.58,'motives.influence':.84,'jung.perceiving':-.42},{gift:'agency and protection',need:'mutual respect and a strong counterpart',shadow:'agency can become control'}),
 Alchemist:A('Transforms intensity into meaning and change.',['Fire','Water','Ether'],{emotional_intensity:.7,value_meaning:.82,vulnerability_openness:.5,cognitive_contextual:.48,novelty_orientation:.38,value_beauty:.42},{'big5.openness':.76,'big5.emotional_sensitivity':.72,'motives.meaning':.82,'motives.beauty':.58},{gift:'transformation and emotional range',need:'a bond that can hold change',shadow:'intensity can be mistaken for compatibility'}),
 Devotee:A('Organizes life around the depth of the bond.',['Water','Earth'],{closeness_need:.82,value_loyalty:.78,value_family:.58,reciprocity_sensitivity:.68,repair_orientation:.58,vulnerability_openness:.42},{'motives.intimacy':.9,'motives.belonging':.7,'big5.agreeableness':.62,'motives.autonomy':-.28},{gift:'sustained emotional investment',need:'clear reciprocity',shadow:'devotion can become fusion or vigilance'}),
 Guardian:A('Creates safety and continuity around what matters.',['Earth','Water'],{value_stability:.82,structure_preference:.68,value_loyalty:.68,value_family:.62,repair_orientation:.5,trust_baseline:.38},{'motives.security':.9,'behavior.pace_stability':.82,'big5.conscientiousness':.62,'motives.discovery':-.25},{gift:'steadiness and practical care',need:'security with room to evolve',shadow:'protection can become rigidity'}),
 Maverick:A('Protects authorship of the self.',['Fire','Air'],{autonomy_need:.86,value_freedom:.82,distinctiveness_need:.74,novelty_orientation:.48,conflict_directness:.28},{'motives.autonomy':.94,'behavior.agency':.62,'big5.openness':.54,'motives.belonging':-.28},{gift:'independence and originality',need:'intimacy without possession',shadow:'autonomy can become defensive distance'}),
 Diplomat:A('Preserves connection across difference.',['Water','Air'],{repair_orientation:.8,cognitive_contextual:.62,stress_accommodation:.58,trust_baseline:.45,belonging_need:.5,conflict_directness:-.12},{'big5.agreeableness':.84,'jung.feeling':.52,'motives.belonging':.62,'behavior.agency':-.15},{gift:'translation and repair',need:'mutuality rather than endless mediation',shadow:'peacekeeping can become self-erasure'}),
 Catalyst:A('Creates movement in people and situations.',['Fire','Air'],{social_initiation:.68,novelty_orientation:.7,decisiveness:.55,value_influence:.48,emotional_intensity:.35,conflict_directness:.32},{'behavior.agency':.66,'behavior.social_reach':.75,'motives.discovery':.7,'behavior.pace_stability':-.5},{gift:'momentum and activation',need:'a bond that can keep up without becoming chaotic',shadow:'motion can outrun reflection'}),
 Scholar:A('Builds intimacy with truth through disciplined understanding.',['Air','Earth'],{value_knowledge:.88,cognitive_systemizing:.68,ambiguity_tolerance:.42,structure_preference:.4,autonomy_need:.32,social_initiation:-.25},{'big5.openness':.62,'behavior.precision':.58,'jung.extraversion':-.55,'motives.discovery':.62},{gift:'clarity and intellectual depth',need:'space to think and a partner who values inquiry',shadow:'analysis can become distance'}),
 Artisan:A('Makes inner experience tangible through form and beauty.',['Ether','Earth','Water'],{value_beauty:.88,distinctiveness_need:.68,emotional_intensity:.46,cognitive_contextual:.4,value_meaning:.42,novelty_orientation:.25},{'motives.beauty':.9,'big5.openness':.7,'jung.feeling':.32,'behavior.precision':.18},{gift:'sensibility and expression',need:'to be seen beyond output or aesthetics',shadow:'taste can become identity armor'}),
 Steward:A('Takes responsibility for people, systems, and continuity.',['Earth','Ether'],{value_service:.78,value_family:.58,value_stability:.62,repair_orientation:.55,competence_identity:.48,stress_accommodation:.42},{'big5.conscientiousness':.58,'big5.agreeableness':.65,'motives.security':.62,'motives.meaning':.62},{gift:'responsibility and care',need:'shared burden rather than permanent caretaking',shadow:'service can become over-functioning'}),
 Visionary:A('Orients toward futures that do not yet exist.',['Air','Ether','Fire'],{value_meaning:.7,value_influence:.52,novelty_orientation:.58,cognitive_contextual:.62,ambiguity_tolerance:.62,distinctiveness_need:.45},{'jung.intuition':.9,'big5.openness':.86,'motives.meaning':.7,'behavior.pace_stability':-.38},{gift:'possibility and long-range imagination',need:'someone who can engage the future without dismissing the present',shadow:'possibility can outrun execution'}),
 Sentinel:A('Notices risk early and protects what has been entrusted.',['Earth','Air'],{value_stability:.72,structure_preference:.72,reciprocity_sensitivity:.48,trust_baseline:-.12,cognitive_systemizing:.5,stress_control:.4},{'behavior.precision':.72,'motives.security':.75,'big5.conscientiousness':.65,'big5.emotional_sensitivity':.25},{gift:'discernment and prevention',need:'evidence of reliability',shadow:'discernment can become chronic vigilance'}),
 Muse:A('Creates aliveness through presence, feeling, and imaginative attention.',['Water','Fire','Ether'],{value_beauty:.66,emotional_intensity:.62,novelty_orientation:.42,closeness_need:.4,recognition_need:.35,cognitive_contextual:.42},{'motives.beauty':.72,'big5.openness':.7,'behavior.social_reach':.4,'motives.intimacy':.42},{gift:'inspiration and emotional texture',need:'to be known beyond projection',shadow:'being desired can substitute for being understood'}),
 Strategist:A('Reads systems of people and incentives before acting.',['Air','Fire','Earth'],{cognitive_systemizing:.68,cognitive_contextual:.55,decisiveness:.58,value_influence:.48,autonomy_need:.4,emotional_intensity:-.18},{'behavior.objectivity':.72,'behavior.agency':.6,'jung.feeling':-.5,'big5.conscientiousness':.42},{gift:'foresight and calibrated action',need:'trust that does not require surrendering discernment',shadow:'strategy can become guardedness or instrumental thinking'}),
 Connector:A('Builds energy through people, belonging, and exchange.',['Water','Air','Fire'],{social_initiation:.82,belonging_need:.68,closeness_need:.42,recognition_need:.38,trust_baseline:.3,repair_orientation:.3},{'behavior.social_reach':.9,'big5.extraversion':.86,'motives.belonging':.68,'jung.extraversion':.88},{gift:'social vitality and inclusion',need:'depth beneath breadth',shadow:'connection can become dependence on social reflection'}),
 Idealist:A('Organizes choices around what ought to be true.',['Ether','Water','Air'],{value_meaning:.8,value_service:.65,value_loyalty:.42,cognitive_contextual:.48,belonging_need:.38,ambiguity_tolerance:.3},{'motives.meaning':.86,'jung.feeling':.58,'big5.openness':.55,'big5.agreeableness':.5},{gift:'conviction and moral imagination',need:'shared seriousness without total ideological sameness',shadow:'ideals can become disappointment with ordinary humanity'}),
 Pilgrim:A('Uses experience as a path toward self-knowledge.',['Ether','Air','Fire'],{value_meaning:.72,novelty_orientation:.52,autonomy_need:.42,cognitive_contextual:.5,distinctiveness_need:.4,vulnerability_openness:.25},{'motives.meaning':.72,'motives.discovery':.62,'big5.openness':.7,'motives.autonomy':.45},{gift:'growth orientation and reflective curiosity',need:'a relationship that permits becoming',shadow:'searching can become postponement of commitment'})
};

function getPath(obj,path){return path.split('.').reduce((o,k)=>o?.[k],obj);}
function similarity(actual,target){return 1-Math.min(2,Math.abs((Number(actual)||0)-target))/2;}
function signatureSimilarity(foundation,signature={}){let sum=0,w=0;for(const[k,target]of Object.entries(signature)){const weight=Math.max(.15,Math.abs(target));sum+=similarity(getPath(foundation,k),target)*weight;w+=weight;}return w?sum/w:.5;}
function prototypeSimilarity(d={},prototype={}){let sum=0,w=0;for(const[k,target]of Object.entries(prototype)){const weight=Math.max(.15,Math.abs(target));sum+=similarity(d[k],target)*weight;w+=weight;}return w?sum/w:.5;}
function inferArchetypes(model={}){
 const foundations=deriveFoundations(model),d=model.dimensions||model.scores||{};
 const ranked=Object.entries(ARCHETYPES).map(([name,a])=>{const raw=prototypeSimilarity(d,a.prototype),structural=signatureSimilarity(foundations,a.signature),score=.56*raw+.44*structural;return{name,score,essence:a.essence,elements:a.elements,relational:a.relational,fit:{measured:raw,structural}};}).sort((a,b)=>b.score-a.score);
 const gap=Math.max(0,(ranked[0]?.score||0)-(ranked[1]?.score||0)),coverage=Number(model.coverage||0);
 return ranked.map((x,i)=>({...x,confidence:i===0?Math.min(1,.42+coverage*.38+gap*.8):Math.min(1,.35+coverage*.32)}));
}

function blend(archetypes=[]){
 const valid=archetypes.filter(x=>x&&ARCHETYPES[x.name]).slice(0,2);if(!valid.length)return{vector:{},types:[]};
 const a=valid[0],b=valid[1],gap=Math.max(0,Number(a.score||0)-Number(b?.score||0)),wa=b?Math.min(.82,.62+gap*.4):1,wb=b?1-wa:0,vector={};
 for(const [entry,w] of [[a,wa],[b,wb]])if(entry){for(const[k,v]of Object.entries(ARCHETYPES[entry.name].prototype||{}))vector[k]=(vector[k]||0)+Number(v||0)*w;}
 return{vector,types:[{name:a.name,weight:wa,score:a.score},...(b?[{name:b.name,weight:wb,score:b.score}]:[])]};
}

module.exports={VERSION,ARCHETYPES,deriveFoundations,inferArchetypes,blend,prototypeSimilarity,signatureSimilarity};
