// Wonder relational learning adapter.
// Uses only a user's own Layer 2 relational-self hypotheses to modestly reweight
// matching attention. Never turns one user's report into an objective trait of another.

function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)||0));}
function hypotheses(snapshot){return Array.isArray(snapshot?.hypotheses)?snapshot.hypotheses.filter(h=>Number(h.confidence||0)>=.45):[];}

function priorities(snapshot){
  const out={relational_support:0,interaction:0,tension_support:0,complementarity:0,notes:[]};
  for(const h of hypotheses(snapshot)){
    const c=clamp(h.confidence,0,1);
    if(h.id==='felt_seen_recurring'){out.relational_support+=.012*c;out.interaction+=.01*c;out.notes.push('Repeated experience of feeling insufficiently seen raises attention to relational support and repair.');}
    if(h.id==='attraction_safety_separation'){out.relational_support+=.014*c;out.interaction+=.014*c;out.notes.push('Attraction and felt safety have separated before, so Wonder gives slightly more weight to support and repair.');}
    if(h.id==='ease_recurring'){out.interaction+=.01*c;out.complementarity+=.008*c;out.notes.push('Relational ease has repeated across positive experiences, so Wonder preserves room for ease alongside growth.');}
    if(h.id==='curiosity_not_continuation'){out.complementarity-=.006*c;out.notes.push('Curiosity alone has not reliably predicted continuation, so novelty/complementarity receives slightly less weight.');}
    if(String(h.id||'').startsWith('continuation_')){
      const metric=h.basis?.metric;if(metric==='felt_safe'||metric==='felt_seen'||metric==='ease'){out.relational_support+=.008*c;out.interaction+=.006*c;}if(metric==='curiosity')out.complementarity+=.004*c;
      out.notes.push('Observed continuation patterns are being used as low-weight calibration evidence.');
    }
  }
  return out;
}

function applyRelationalLearning(result,selfSnapshot,otherSnapshot){
  if(!result?.eligible)return result;
  const a=priorities(selfSnapshot),b=priorities(otherSnapshot),components=result.components||{};
  const fields=['relational_support','interaction','tension_support','complementarity'];let delta=0;
  for(const k of fields){const value=Number(components[k]);if(!Number.isFinite(value))continue;const emphasis=(Number(a[k]||0)+Number(b[k]||0))/2;delta+=(value-.62)*emphasis*100;}
  // Relational learning is deliberately capped to +/- 3 score points in the MVP.
  delta=clamp(delta,-3,3);const learnedScore=Math.round(clamp(Number(result.score||0)+delta,0,100));
  return{...result,score:learnedScore,learning:{applied:Math.abs(delta)>=.1,delta:Number(delta.toFixed(2)),self_evidence:hypotheses(selfSnapshot).length,other_evidence:hypotheses(otherSnapshot).length,notes:[...new Set([...a.notes,...b.notes])].slice(0,4)}};
}

module.exports={priorities,applyRelationalLearning};