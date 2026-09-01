'use strict';

const EPISTEMIC_CLASSES=['observation','validated_inference','pattern_hypothesis','speculation','philosophical_lens','prediction','judgment'];
const STABILITIES=['ephemeral','provisional','contextual','stable'];
const REGION_SLUGS=['self-identity','values-meaning','motive-reciprocity','attachment-regulation','recognition-empathy','attraction-desire','dyadics-relationship','narrative-symbolic','culture-context','development-becoming','temporal-memory','epistemic-immune','ethics-consent-safety','meta-cognitive-executive','learning-calibration','language-interpretation','future-domain-adapter'];
const PREDICTION_TYPES=['second_date_interest','felt_understood','conversational_ease','revealed_attraction','emotional_safety','intellectual_stimulation','experienced_values_fit','relationship_continuation'];

const RESPONSE_JSON_SCHEMA={
  name:'wonder_mind_cognition',strict:true,
  schema:{type:'object',additionalProperties:false,required:['reply','epistemic_class','confidence','claim','supporting_evidence','counterevidence','alternative_hypotheses','what_would_change_mind','memory_updates','predictions'],properties:{
    reply:{type:'string',minLength:1,maxLength:12000},epistemic_class:{type:'string',enum:EPISTEMIC_CLASSES},confidence:{type:'number',minimum:0,maximum:1},claim:{type:'string',minLength:1,maxLength:4000},
    supporting_evidence:{type:'array',maxItems:12,items:{type:'string',maxLength:1000}},counterevidence:{type:'array',maxItems:12,items:{type:'string',maxLength:1000}},alternative_hypotheses:{type:'array',maxItems:8,items:{type:'string',maxLength:1000}},what_would_change_mind:{type:'array',maxItems:8,items:{type:'string',maxLength:1000}},
    memory_updates:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:['memory_key','claim','epistemic_class','confidence','stability','region_slug','salience'],properties:{
      memory_key:{type:'string',minLength:3,maxLength:96,pattern:'^[a-z0-9][a-z0-9-]*$'},claim:{type:'string',minLength:1,maxLength:4000},epistemic_class:{type:'string',enum:EPISTEMIC_CLASSES},confidence:{type:'number',minimum:0,maximum:1},stability:{type:'string',enum:STABILITIES},region_slug:{type:'string',enum:REGION_SLUGS},salience:{type:'number',minimum:0,maximum:1}
    }}},
    predictions:{type:'array',maxItems:6,items:{type:'object',additionalProperties:false,required:['prediction_type','probability','horizon','target_definition','evidence'],properties:{prediction_type:{type:'string',enum:PREDICTION_TYPES},probability:{type:'number',minimum:0.05,maximum:0.95},horizon:{type:'string',maxLength:120},target_definition:{type:'string',minLength:1,maxLength:500},evidence:{type:'array',maxItems:8,items:{type:'string',maxLength:800}}}}}
  }}
};

function text(v,max=4000){return String(v==null?'':v).trim().slice(0,max);}
function list(v,maxItems=8,maxLen=1000){return (Array.isArray(v)?v:[]).map(x=>text(x,maxLen)).filter(Boolean).slice(0,maxItems);}
function clamp(v,lo=0,hi=1,fallback=.5){const n=Number(v);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):fallback;}
function key(v,fallback=''){const raw=text(v||fallback,96).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return raw.slice(0,96)||'provisional-belief';}

function normalizeMindOutput(raw={}){
  const cls=EPISTEMIC_CLASSES.includes(raw.epistemic_class)?raw.epistemic_class:'pattern_hypothesis';
  return {reply:text(raw.reply,12000),epistemic_class:cls,confidence:clamp(raw.confidence),claim:text(raw.claim||raw.reply,4000)||'No substantive claim returned.',supporting_evidence:list(raw.supporting_evidence,12),counterevidence:list(raw.counterevidence,12),alternative_hypotheses:list(raw.alternative_hypotheses,8),what_would_change_mind:list(raw.what_would_change_mind,8),
    memory_updates:(Array.isArray(raw.memory_updates)?raw.memory_updates:[]).slice(0,8).map(m=>({memory_key:key(m?.memory_key,`${m?.region_slug||'self'}-${m?.claim||''}`),claim:text(m?.claim,4000),epistemic_class:EPISTEMIC_CLASSES.includes(m?.epistemic_class)?m.epistemic_class:'pattern_hypothesis',confidence:clamp(m?.confidence),stability:STABILITIES.includes(m?.stability)?m.stability:'provisional',region_slug:REGION_SLUGS.includes(m?.region_slug)?m.region_slug:'self-identity',salience:clamp(m?.salience,0,1,.5)})).filter(m=>m.claim),
    predictions:(Array.isArray(raw.predictions)?raw.predictions:[]).slice(0,6).map(p=>({prediction_type:PREDICTION_TYPES.includes(p?.prediction_type)?p.prediction_type:null,probability:clamp(p?.probability,.05,.95,.5),horizon:text(p?.horizon,120),target_definition:text(p?.target_definition,500),evidence:list(p?.evidence,8,800)})).filter(p=>p.prediction_type&&p.target_definition)};
}

module.exports={EPISTEMIC_CLASSES,STABILITIES,REGION_SLUGS,PREDICTION_TYPES,RESPONSE_JSON_SCHEMA,normalizeMindOutput,clamp};
