'use strict';

const HARD_PROHIBITIONS=[
  {id:'diagnostic_certainty',test:t=>/\b(you|they|he|she) (have|has|are|is) (bipolar|borderline|narcissistic|a narcissist|autistic|psychotic|sociopathic|a sociopath)\b/i.test(t),reason:'Diagnostic or quasi-diagnostic certainty from consumer data is not permitted.'},
  {id:'coercive_dependency',test:t=>/\b(only i understand you|you only need me|do not trust anyone else|you should depend on me)\b/i.test(t),reason:'Wonder may not cultivate exclusive emotional dependence.'},
  {id:'totalizing_interiority',test:t=>/\b(i know exactly what (he|she|they) (thinks|feels|wants)|this proves (he|she|they) (never|always))\b/i.test(t),reason:'Wonder may not claim complete access to another person’s interior life.'},
  {id:'manipulative_exploitation',test:t=>/\b(make (him|her|them) jealous|withhold affection to|trigger (his|her|their) anxiety|exploit (his|her|their) insecurity)\b/i.test(t),reason:'Wonder may not recommend exploiting vulnerability or attachment dynamics.'}
];

function preflight({message='',runType='chat',payload={}}={}){
  const purpose={
    chat:['self_understanding','relationship_guidance'],journal:['self_understanding'],mirror:['self_understanding'],assessment:['self_understanding'],
    match:['matching'],post_date:['relationship_learning','self_understanding'],relationship:['relationship_guidance','relationship_learning']
  }[runType]||['self_understanding'];
  const thirdPartySubject=Boolean(payload?.objectUserId || payload?.candidateUserId || /\b(what does|what is) (he|she|they) (think|feel|want)\b/i.test(message));
  return {allowed:true,purpose,thirdPartySubject,notes:thirdPartySubject?['Limit claims about another person’s interiority and do not create durable third-party psychological memory.']:[]};
}

function postflight(output,{thirdPartySubject=false}={}){
  const combined=`${output.reply||''}\n${output.claim||''}`;
  const violations=HARD_PROHIBITIONS.filter(p=>p.test(combined)).map(p=>({id:p.id,reason:p.reason}));
  if(thirdPartySubject && /\b(definitely|certainly|obviously)\b/i.test(combined)){
    violations.push({id:'third_party_overcertainty',reason:'High-certainty language about another person requires direct evidence unavailable to Wonder.'});
  }
  return {clear:violations.length===0,violations,constitutionVersion:'wonder_constitution_v1'};
}

function safeAbstention(violations=[]){
  const primary=violations[0]?.reason||'The requested conclusion exceeds what Wonder can responsibly infer.';
  return `I do not think I can responsibly make that claim. ${primary} I can help separate what is directly observable from what is only one plausible interpretation.`;
}

module.exports={preflight,postflight,safeAbstention,HARD_PROHIBITIONS};
