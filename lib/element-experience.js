// Five Elements experience grammar.
// Presentation metadata only: it changes how an item is encountered, never its score.
const ELEMENTS={
 Earth:{order:1,territory:'Reality / foundations',verb:'Choose what holds',pace:'deliberate',defaultInteraction:'grounded_choice'},
 Water:{order:2,territory:'Emotion / attachment',verb:'Notice what shifts',pace:'fluid',defaultInteraction:'relational_scenario'},
 Fire:{order:3,territory:'Desire / vitality',verb:'Answer before you over-explain',pace:'instinctive',defaultInteraction:'impulse_choice'},
 Air:{order:4,territory:'Mind / worldview',verb:'Compare the possibilities',pace:'spacious',defaultInteraction:'comparative_choice'},
 Ether:{order:5,territory:'Meaning / identity',verb:'Choose what remains',pace:'reflective',defaultInteraction:'meaning_choice'}
};

const SPECIAL={
 values_rank:{interaction:'constellation_rank',instruction:'Build the life that pulls hardest. Choose five, then order them.'},
 identity_feedback:{interaction:'identity_field',instruction:'Choose the qualities that feel most consistently visible to other people.'},
 betrayal:{interaction:'fault_line',instruction:'Choose the breach that would change the relationship most.'},
 rel_distance:{interaction:'staged_scenario',instruction:'Do not choose the ideal response. Choose what tends to happen first.'},
 rel_conflict:{interaction:'staged_scenario',instruction:'Choose the first thing you need from the conflict.'},
 rel_initiation:{interaction:'staged_scenario',instruction:'Imagine this has been true for a month. Choose what you would actually do.'},
 stress_failure:{interaction:'pressure_scenario',instruction:'Choose the first response, not the response you prefer to have.'},
 stress_chaos:{interaction:'pressure_scenario',instruction:'Choose the change other people would be most likely to notice.'},
 cog_uncertainty:{interaction:'decision_field',instruction:'You cannot wait for more information. Choose your first move.'},
 cog_disagreement:{interaction:'argument_field',instruction:'Choose the first internal reaction, before politeness or strategy.'},
 values_loss:{interaction:'forced_tradeoff',instruction:'Both options can matter. Choose the loss that would alter the shape of your life more.'},
 values_loyalty:{interaction:'forced_tradeoff',instruction:'Assume there is no perfect solution. Choose the principle you protect first.'},
 identity_criticism:{interaction:'identity_faultline',instruction:'Choose the criticism that would stay with you longest.'},
 identity_compliment:{interaction:'identity_resonance',instruction:'Choose the recognition that reaches deepest, not the one you simply enjoy.'}
};

function elementExperience(item,element){
 const base=ELEMENTS[element]||ELEMENTS.Ether;
 const special=SPECIAL[item?.id]||{};
 let interaction=special.interaction||base.defaultInteraction;
 if(item?.type==='scale')interaction=`${element.toLowerCase()}_continuum`;
 if(item?.type==='rank')interaction='constellation_rank';
 if(item?.type==='multi')interaction=element==='Ether'?'identity_field':'multi_field';
 return{element,order:base.order,territory:base.territory,verb:base.verb,pace:base.pace,interaction,instruction:special.instruction||null};
}

module.exports={ELEMENTS,SPECIAL,elementExperience};