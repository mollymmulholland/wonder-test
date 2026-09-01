'use strict';

const ALWAYS={
  'epistemic-immune':.95,'ethics-consent-safety':.95,'meta-cognitive-executive':1,'language-interpretation':.9,'temporal-memory':.72
};
const BASE={
  assessment:{'self-identity':.9,'values-meaning':.85,'attachment-regulation':.72,'culture-context':.58,'development-becoming':.65},
  mirror:{'self-identity':.95,'narrative-symbolic':.82,'values-meaning':.72,'development-becoming':.72,'culture-context':.5},
  journal:{'self-identity':.8,'narrative-symbolic':.9,'temporal-memory':.9,'development-becoming':.65,'culture-context':.55},
  chat:{'self-identity':.7,'narrative-symbolic':.62,'recognition-empathy':.68,'development-becoming':.6},
  match:{'values-meaning':.9,'attachment-regulation':.68,'recognition-empathy':.8,'attraction-desire':.76,'dyadics-relationship':.95,'culture-context':.62,'development-becoming':.72,'motive-reciprocity':.7},
  post_date:{'recognition-empathy':.94,'attraction-desire':.86,'attachment-regulation':.72,'dyadics-relationship':1,'development-becoming':.76,'temporal-memory':.9,'motive-reciprocity':.65},
  relationship:{'motive-reciprocity':.86,'attachment-regulation':.82,'recognition-empathy':.86,'dyadics-relationship':1,'development-becoming':.78,'temporal-memory':.68}
};
const SIGNALS=[
  ['attraction-desire',/attract|chemistry|desire|physical|sexual|erotic|kiss|spark/i,.28,'attraction/desire language'],
  ['attachment-regulation',/anxious|avoid|secure|reassur|distance|withdraw|cling|abandon|space/i,.28,'regulation/attachment language'],
  ['recognition-empathy',/understood|seen|listen|validate|care|curious|remembered|noticed/i,.3,'recognition/responsiveness language'],
  ['values-meaning',/value|meaning|purpose|belief|moral|family|life i want|religion|principle/i,.26,'values/meaning language'],
  ['dyadics-relationship',/conflict|repair|recipro|effort|commit|relationship|date|together|dynamic/i,.3,'dyadic-process language'],
  ['motive-reciprocity',/fair|recipro|effort|give|take|sacrifice|entitled|boundary/i,.26,'reciprocity language'],
  ['narrative-symbolic',/story|pattern|always|never|childhood|past|chapter|identity|dream|symbol/i,.24,'narrative language'],
  ['self-identity',/who i am|myself|identity|personality|trait|authentic|perform/i,.24,'self-model language'],
  ['culture-context',/culture|family background|class|religion|community|immigra|gender norm|social context/i,.28,'context language'],
  ['development-becoming',/grow|become|future|potential|flourish|actualiz|change|better version/i,.28,'development language']
];

function route({runType='chat',message='',maxRegions=12}={}){
  const scores=new Map(),reasons=new Map();
  const add=(slug,score,reason)=>{scores.set(slug,Math.min(1,(scores.get(slug)||0)+score));const rs=reasons.get(slug)||[];if(reason&&!rs.includes(reason))rs.push(reason);reasons.set(slug,rs);};
  Object.entries(ALWAYS).forEach(([s,v])=>add(s,v,'mandatory executive consultation'));
  Object.entries(BASE[runType]||BASE.chat).forEach(([s,v])=>add(s,v,`base route for ${runType}`));
  SIGNALS.forEach(([s,re,w,r])=>{if(re.test(message))add(s,w,r);});
  const ranked=[...scores.entries()].map(([slug,score])=>({slug,score:Number(score.toFixed(3)),reasons:reasons.get(slug)||[]})).sort((a,b)=>b.score-a.score);
  const mandatory=new Set(Object.keys(ALWAYS));
  const selected=ranked.filter((r,i)=>i<maxRegions||mandatory.has(r.slug));
  return {selected,all:ranked};
}

module.exports={route,BASE,ALWAYS,SIGNALS};
