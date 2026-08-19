// Wonder Mirror Engine v1
// Converts the latent person model into a cautious, resonant interpretation.

const LABELS={
 cognitive_systemizing:'structured thinking',cognitive_contextual:'context-sensitive thinking',ambiguity_tolerance:'comfort with ambiguity',decisiveness:'decisiveness',novelty_orientation:'novelty',social_initiation:'social initiation',emotional_intensity:'emotional intensity',structure_preference:'structure',autonomy_need:'autonomy',closeness_need:'closeness',reassurance_need:'relational reassurance',vulnerability_openness:'vulnerability',conflict_directness:'directness in conflict',repair_orientation:'repair',reciprocity_sensitivity:'reciprocity',trust_baseline:'baseline trust',value_family:'family',value_achievement:'achievement',value_meaning:'meaning',value_freedom:'freedom',value_stability:'stability',value_knowledge:'knowledge',value_service:'service',value_influence:'influence',value_beauty:'beauty',value_loyalty:'loyalty',recognition_need:'recognition',competence_identity:'competence',distinctiveness_need:'distinctiveness',belonging_need:'belonging',stress_control:'regaining control',stress_withdrawal:'withdrawing',stress_accommodation:'accommodating others',stress_intellectualization:'analyzing emotion'};

const DOMAINS={
 cognitive:['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness'],
 temperament:['novelty_orientation','social_initiation','emotional_intensity','structure_preference'],
 relationship:['autonomy_need','closeness_need','reassurance_need','vulnerability_openness','conflict_directness','repair_orientation','reciprocity_sensitivity','trust_baseline'],
 values:['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_knowledge','value_service','value_influence','value_beauty','value_loyalty'],
 identity:['recognition_need','competence_identity','distinctiveness_need','belonging_need'],
 stress:['stress_control','stress_withdrawal','stress_accommodation','stress_intellectualization']
};

function scored(model,keys){const d=model.dimensions||{},e=model.evidence||{};return keys.map(k=>({key:k,value:Number(d[k]||0),evidence:Number(e[k]||0)})).sort((a,b)=>(b.evidence*Math.abs(b.value))-(a.evidence*Math.abs(a.value)));}
function high(model,domain,count=3){return scored(model,DOMAINS[domain]||[]).filter(x=>x.evidence>0&&Math.abs(x.value)>=.16).slice(0,count);}
function weak(model,count=3){const e=model.evidence||{};return Object.keys(LABELS).map(k=>({key:k,evidence:Number(e[k]||0)})).sort((a,b)=>a.evidence-b.evidence).slice(0,count);}
function phrase(signal){if(!signal)return'';const label=LABELS[signal.key]||signal.key;if(signal.value>.15)return label;if(signal.value<-.15){const opposites={autonomy_need:'interdependence',closeness_need:'more relational space',structure_preference:'flexibility',novelty_orientation:'familiarity and continuity',conflict_directness:'a less confrontational conflict style',reassurance_need:'low reassurance needs',social_initiation:'a more observant social style',stress_withdrawal:'staying engaged under pressure',stress_control:'tolerating reduced control',recognition_need:'low dependence on recognition'};return opposites[signal.key]||`less emphasis on ${label}`;}return label;}

function tension(model){const d=model.dimensions||{};
  const rules=[
    {when:d.autonomy_need>.25&&d.reassurance_need>.25,title:'Independent, but not indifferent',body:'You appear to care strongly about preserving agency while still registering shifts in an important bond quickly. Wonder reads that less as inconsistency than as a preference for dependable closeness that does not become engulfing.'},
    {when:d.closeness_need>.25&&d.stress_withdrawal>.25,title:'Closeness may get harder exactly when it matters most',body:'Connection appears important to you, yet pressure may increase your instinct to retreat. That can create a gap between what you want relationally and what you do when you feel exposed or overwhelmed.'},
    {when:d.competence_identity>.25&&d.stress_control>.25,title:'Competence and control may blur under pressure',body:'Being capable looks central to your self-concept. When uncertainty rises, taking control may be genuinely effective, but Wonder would watch whether it also becomes a way to avoid the discomfort of not knowing.'},
    {when:d.vulnerability_openness<-.15&&d.closeness_need>.25,title:'Depth may matter more than disclosure comes easily',body:'You seem to want meaningful closeness without necessarily finding raw disclosure effortless. Wonder would distinguish wanting intimacy from being comfortable with every mechanism that creates it.'},
    {when:d.value_freedom>.25&&d.value_stability>.25,title:'You may want both roots and range',body:'Freedom and stability both carry weight for you. The relevant question is probably not which one wins, but what kind of structure makes freedom feel possible rather than constrained.'},
    {when:d.cognitive_systemizing>.25&&d.cognitive_contextual>.25,title:'You resist a false choice between structure and nuance',body:'Your responses suggest that you use systems to think without wanting the system to erase context. That combination may be more characteristic than either “analytical” or “intuitive” alone.'}
  ];
  return rules.find(r=>r.when)||{title:'The pattern is not perfectly tidy',body:'Wonder sees enough variation in your responses to avoid reducing you to one clean trait. The places where your answers pull in different directions are likely to be more informative than the easiest label.'};
}

function buildMirror(model,archetypes=[]){
  const cog=high(model,'cognitive',2),rel=high(model,'relationship',3),vals=high(model,'values',3),identity=high(model,'identity',2),stress=high(model,'stress',2),temp=high(model,'temperament',2);
  const primary=archetypes[0]||null,secondary=archetypes[1]||null;
  const cogLead=cog[0],relLead=rel[0],valLead=vals[0],idLead=identity[0],stressLead=stress[0],tempLead=temp[0];
  const t=tension(model);const uncertain=weak(model,3);

  let move='Your responses do not reduce cleanly to one cognitive style yet.';
  if(cogLead)move=`${phrase(cogLead)[0].toUpperCase()+phrase(cogLead).slice(1)} is one of the clearest signals in how you approach complexity. ${cog[1]?`At the same time, ${phrase(cog[1])} also appears repeatedly, which keeps Wonder from treating the first pattern as the whole story.`:'Wonder would still want more evidence before calling it fixed.'}`;

  let drive='Wonder is still separating what you value from what you simply do well.';
  if(valLead)drive=`${phrase(valLead)[0].toUpperCase()+phrase(valLead).slice(1)} currently carries the strongest value signal. ${idLead?`Your identity also appears meaningfully organized around ${phrase(idLead)}, so choices that touch both are likely to feel especially consequential.`:''}`;

  let relationship='Wonder does not yet have enough converging relationship evidence to make a strong claim.';
  if(relLead)relationship=`${phrase(relLead)[0].toUpperCase()+phrase(relLead).slice(1)} is the clearest relationship signal so far. ${rel[1]?`${phrase(rel[1])[0].toUpperCase()+phrase(rel[1]).slice(1)} also matters, which suggests your best relationships may need to satisfy more than one seemingly simple need at once.`:''}`;

  let pressure='Wonder still has limited evidence about your stress response.';
  if(stressLead)pressure=`Under pressure, ${phrase(stressLead)} appears more likely to intensify. ${stress[1]?`A secondary pattern of ${phrase(stress[1])} may show up depending on whether the threat feels practical or relational.`:''}`;

  const confidence=Math.max(0,Math.min(1,Number(model.coverage||0)));
  const archetypeGap=primary&&secondary?Math.max(0,Number(primary.score||0)-Number(secondary.score||0)):0;
  return{
    primary,secondary,
    archetype_confidence:Math.round(Math.min(1,(confidence*.65)+(archetypeGap*.7))*100)/100,
    headline:primary?primary.essence:'A pattern is emerging.',
    move_title:cogLead?'How you make sense of things':'How you move',move,
    drive_title:'What carries weight',drive,
    relationship_title:'How connection works for you',relationship,
    pressure_title:'What changes under pressure',pressure,
    tension_title:t.title,tension:t.body,
    uncertain:uncertain.map(x=>LABELS[x.key]||x.key),
    evidence_coverage:confidence,
    signals:{cognitive:cog,relationship:rel,values:vals,identity,stress,temperament:temp}
  };
}

module.exports={buildMirror,LABELS,DOMAINS};