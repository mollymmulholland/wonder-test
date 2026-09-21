const {authored,insight}=require('./report-language');
const {LABELS}=require('./mirror-engine');
const SECTIONS=[
 ['portrait','Your current portrait',['autonomy_need','closeness_need'],0,'Where does this feel true—and where does your context change it?'],
 ['motivation','What motivates you',['value_achievement','value_meaning','value_influence','value_service'],0,'Think of a commitment you freely chose. What made it worth the effort?'],
 ['values','What matters most',['value_family','value_freedom','value_stability','value_knowledge','value_loyalty','value_beauty'],3,'Which value do you protect when two important things cannot both come first?'],
 ['thinking','How you think',['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness'],1,'When do you want someone to think with you, and when do you simply want them to listen?'],
 ['emotion','Emotional experience and expression',['emotional_intensity','vulnerability_openness'],2,'Name what you felt internally, then what someone else could actually observe. Are those the same?'],
 ['understood','What helps you feel understood',['recognition_need','competence_identity','belonging_need'],3,'Describe one small act of attention that would help someone meet you more accurately.'],
 ['closeness','How you move toward closeness',['closeness_need','autonomy_need','reassurance_need','trust_baseline'],2,'What pace gives you enough room to be curious without needing to perform certainty?'],
 ['strain','How you respond under strain',['stress_control','stress_withdrawal','stress_accommodation','stress_intellectualization'],4,'What changes first when you feel overwhelmed? This is optional material, not a verdict.'],
 ['repair','What helps repair',['repair_orientation','conflict_directness','reciprocity_sensitivity'],5,'What specific request would make returning to a difficult conversation easier?'],
 ['attraction','What draws you toward someone',['novelty_orientation','social_initiation'],2,'Remember a conversation you wanted to continue. What actually drew you back?'],
 ['contribution','What you bring to a relationship',['value_service','value_loyalty','vulnerability_openness'],6,'What do you offer willingly, and what do you offer because you fear losing the connection?'],
 ['tensions','Tensions worth exploring',['autonomy_need','closeness_need','value_freedom','value_stability'],4,'Could two needs be true in different settings? Give each setting its own words.'],
 ['conditions','Conditions that may suit you',['structure_preference','reciprocity_sensitivity','trust_baseline'],3,'Translate a need into an ordinary agreement that either person could discuss or decline.'],
 ['changing','What is changing',[],6,'What would you answer differently today? A recent change need not become a permanent trait.'],
 ['uncertainty','What remains unclear',[],7,'Which question would be more useful than another conclusion?']
];
function sections(w,model=null,mirror=null,name='Unassigned'){const writing=authored(name,w);return SECTIONS.map(([id,title,keys,index,question])=>{
 const signals=keys.filter(k=>(model?.evidence?.[k]||0)>0&&Math.abs(model?.dimensions?.[k]||0)>=.16).sort((a,b)=>Math.abs(model.dimensions[b])-Math.abs(model.dimensions[a])).slice(0,2);
 const grounded=signals.length>0;
 let body=grounded?insight(signals,model)+' This is a possible reading of your answers. Consider where it fits, and where a particular person or setting changes it.':writing[id];
 if(id==='tensions'&&mirror?.patterns?.length)body=mirror.patterns.map(p=>p.body).join(' ');
 if(id==='emotion')body+=' What you feel internally and how visibly you express it are separate. This assessment cannot establish what another person notices.';
 if(id==='attraction')body+=' Neither an archetype nor these answers establishes physical attraction. Your stated preferences and an actual encounter can add information this report does not contain.';
 if(id==='changing')body=writing.changing;
 if(id==='uncertainty')body=`${mirror?.uncertain?.length?`We have less evidence about ${mirror.uncertain.join(', ')}. `:''}${writing.uncertainty}`;
 return {id,title,body,editorial:writing[id],label:grounded?'A possible pattern':model?'Still unclear':'Archetypal lens',support:grounded?`Supported by your discovery responses relating to ${signals.map(k=>LABELS[k]).join(' and ')}. Direction reflects the current scoring model; it is not a calibrated prediction.`:model?'No sufficiently distinct signal supports an individual claim in this section. The archetypal perspective is optional.':'Authored interpretation of this archetype; not evidence about an individual.',context:id==='strain'?'Optional private exploration of pressure. Never shared with an introduction.':'Consider a recent situation and a counterexample before carrying this forward.',question,optional:id==='strain',evidenceKeys:signals};
 });}
module.exports={sections,SECTIONS};
