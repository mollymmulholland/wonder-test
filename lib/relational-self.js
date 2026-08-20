// Wonder Layer 2 relational-self engine.
// Builds hypotheses only about the observer's own repeated relational experience.
// It must never infer an objective trait or reputation about another user.

const METRICS=['felt_safe','felt_seen','curiosity','ease','attraction'];
const LABELS={felt_safe:'feeling safe',felt_seen:'feeling seen',curiosity:'remaining curious',ease:'relational ease',attraction:'attraction'};

function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function avg(rows,key){const vals=rows.map(r=>finite(r[key])).filter(v=>v!=null);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;}
function distinctConnections(rows){return new Set(rows.map(r=>r.other_user_id).filter(Boolean)).size;}
function confidence(evidenceCount,connections){
  const evidence=Math.min(1,evidenceCount/8);
  const breadth=Math.min(1,connections/3);
  return Number((.35*evidence+.65*breadth).toFixed(3));
}
function hypothesis(id,statement,rows,basis){return{id,statement,evidence_count:rows.length,distinct_connections:distinctConnections(rows),confidence:confidence(rows.length,distinctConnections(rows)),basis};}

function buildRelationalSelf(reflections=[]){
  const rows=(reflections||[]).filter(Boolean);
  const connections=distinctConnections(rows);
  const out=[];
  if(rows.length<3)return{hypotheses:[],evidence:{reflection_count:rows.length,distinct_connection_count:connections,threshold_met:false}};

  const continued=rows.filter(r=>r.desire_to_continue===true);
  const stopped=rows.filter(r=>r.desire_to_continue===false);
  if(continued.length>=2&&stopped.length>=1){
    let best=null;
    for(const key of METRICS){const yes=avg(continued,key),no=avg(stopped,key);if(yes==null||no==null)continue;const diff=yes-no;if(!best||Math.abs(diff)>Math.abs(best.diff))best={key,diff,yes,no};}
    if(best&&Math.abs(best.diff)>=1){
      const direction=best.diff>0?'more strongly present when you want to continue':'less strongly present when you want to continue';
      out.push(hypothesis(`continuation_${best.key}`,`Across your reflections so far, ${LABELS[best.key]} appears ${direction}. Wonder is treating this as a relational-self hypothesis, not a rule.`,rows,{metric:best.key,continue_mean:Number(best.yes.toFixed(2)),stop_mean:Number(best.no.toFixed(2))}));
    }
  }

  const attractionSafety=rows.filter(r=>finite(r.attraction)>=5&&finite(r.felt_safe)<=3);
  if(attractionSafety.length>=2){
    out.push(hypothesis('attraction_safety_separation','Wonder has seen more than once that attraction and felt safety did not rise together for you. That may be worth noticing without assuming what it means.',attractionSafety,{pattern:'attraction>=5 and felt_safe<=3'}));
  }

  const highCuriosityNo=rows.filter(r=>finite(r.curiosity)>=5&&r.desire_to_continue===false);
  if(highCuriosityNo.length>=2){
    out.push(hypothesis('curiosity_not_continuation','For you, curiosity does not always mean wanting to continue a connection. Wonder should keep those signals separate.',highCuriosityNo,{pattern:'curiosity>=5 with desire_to_continue=false'}));
  }

  const seenLow=rows.filter(r=>finite(r.felt_seen)<=3);
  if(seenLow.length>=3&&distinctConnections(seenLow)>=2){
    out.push(hypothesis('felt_seen_recurring','Feeling insufficiently seen has appeared across more than one connection. Wonder can explore whether this is a recurring relational need, a selection pattern, or something more situational.',seenLow,{pattern:'felt_seen<=3 across multiple connections'}));
  }

  const easeHigh=rows.filter(r=>finite(r.ease)>=6);
  if(easeHigh.length>=3&&distinctConnections(easeHigh)>=2){
    out.push(hypothesis('ease_recurring','Relational ease repeatedly stands out in your positive experiences. Wonder should keep learning what conditions allow you to feel this much like yourself.',easeHigh,{pattern:'ease>=6 across multiple connections'}));
  }

  return{hypotheses:out.sort((a,b)=>b.confidence-a.confidence),evidence:{reflection_count:rows.length,distinct_connection_count:connections,threshold_met:true}};
}

module.exports={buildRelationalSelf};