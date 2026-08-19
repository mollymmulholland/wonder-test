// Wonder Person Model v2
// This is a product inference model, not a clinical or diagnostic instrument.

const DIMENSIONS = {
  cognitive_systemizing: { domain: 'cognitive', label: 'Systemizing' },
  cognitive_contextual: { domain: 'cognitive', label: 'Context sensitivity' },
  ambiguity_tolerance: { domain: 'cognitive', label: 'Ambiguity tolerance' },
  decisiveness: { domain: 'cognitive', label: 'Decisiveness' },
  novelty_orientation: { domain: 'temperament', label: 'Novelty orientation' },
  social_initiation: { domain: 'temperament', label: 'Social initiation' },
  emotional_intensity: { domain: 'temperament', label: 'Emotional intensity' },
  structure_preference: { domain: 'temperament', label: 'Structure preference' },

  autonomy_need: { domain: 'relationship', label: 'Autonomy need' },
  closeness_need: { domain: 'relationship', label: 'Closeness need' },
  reassurance_need: { domain: 'relationship', label: 'Reassurance need' },
  vulnerability_openness: { domain: 'relationship', label: 'Vulnerability openness' },
  conflict_directness: { domain: 'relationship', label: 'Conflict directness' },
  repair_orientation: { domain: 'relationship', label: 'Repair orientation' },
  reciprocity_sensitivity: { domain: 'relationship', label: 'Reciprocity sensitivity' },
  trust_baseline: { domain: 'relationship', label: 'Baseline trust' },

  value_family: { domain: 'values', label: 'Family' },
  value_achievement: { domain: 'values', label: 'Achievement' },
  value_meaning: { domain: 'values', label: 'Meaning' },
  value_freedom: { domain: 'values', label: 'Freedom' },
  value_stability: { domain: 'values', label: 'Stability' },
  value_knowledge: { domain: 'values', label: 'Knowledge' },
  value_service: { domain: 'values', label: 'Service' },
  value_influence: { domain: 'values', label: 'Influence' },
  value_beauty: { domain: 'values', label: 'Beauty' },
  value_loyalty: { domain: 'values', label: 'Loyalty' },

  recognition_need: { domain: 'identity', label: 'Recognition need' },
  competence_identity: { domain: 'identity', label: 'Competence identity' },
  distinctiveness_need: { domain: 'identity', label: 'Distinctiveness need' },
  belonging_need: { domain: 'identity', label: 'Belonging need' },

  stress_control: { domain: 'stress', label: 'Control under stress' },
  stress_withdrawal: { domain: 'stress', label: 'Withdrawal under stress' },
  stress_accommodation: { domain: 'stress', label: 'Accommodation under stress' },
  stress_intellectualization: { domain: 'stress', label: 'Analysis under stress' }
};

// Item types are deliberately mixed. Wonder should not infer a person from forced binaries alone.
const ITEMS = [
  {
    id: 'cog_complexity', section: 'Instinct', type: 'single',
    prompt: 'When something is genuinely complicated, which response is most natural?',
    options: [
      { label: 'I look for a structure that makes the complexity manageable.', w: { cognitive_systemizing: .85, structure_preference: .25 } },
      { label: 'I stay with the contradictions until I understand the context.', w: { cognitive_contextual: .85, ambiguity_tolerance: .35 } },
      { label: 'I move between both: structure helps me think, but I resist forcing a clean answer too early.', w: { cognitive_systemizing: .45, cognitive_contextual: .45, ambiguity_tolerance: .25 } },
      { label: 'It depends heavily on what kind of problem it is.', w: { cognitive_contextual: .35, ambiguity_tolerance: .45 } }
    ]
  },
  {
    id: 'cog_uncertainty', section: 'Instinct', type: 'single',
    prompt: 'You need to make an important decision before you have all the information. What is most like you?',
    options: [
      { label: 'Make the best call available and update quickly as new evidence appears.', w: { decisiveness: .8, ambiguity_tolerance: .6 } },
      { label: 'Keep gathering evidence until the uncertainty feels meaningfully lower.', w: { decisiveness: -.35, structure_preference: .35, ambiguity_tolerance: -.3 } },
      { label: 'Build several plausible interpretations and compare what each would imply.', w: { cognitive_systemizing: .55, cognitive_contextual: .45 } },
      { label: 'Follow the direction that feels internally coherent, even if I cannot fully articulate why yet.', w: { cognitive_contextual: .35, ambiguity_tolerance: .25 } }
    ]
  },
  {
    id: 'rel_distance', section: 'Relationships', type: 'single',
    prompt: 'Someone you are beginning to care about becomes noticeably quieter for several days. What happens first?',
    options: [
      { label: 'I assume there is a benign explanation unless I get evidence otherwise.', w: { trust_baseline: .8, reassurance_need: -.25 } },
      { label: 'I notice it quickly and start wondering whether something changed between us.', w: { reassurance_need: .7, reciprocity_sensitivity: .35 } },
      { label: 'I ask directly rather than trying to infer what it means.', w: { conflict_directness: .7, repair_orientation: .45 } },
      { label: 'I give them room, but I also become a little more guarded myself.', w: { autonomy_need: .4, stress_withdrawal: .5 } },
      { label: 'My response depends on the established pattern between us.', w: { cognitive_contextual: .45, trust_baseline: .2 } }
    ]
  },
  {
    id: 'rel_closeness', section: 'Relationships', type: 'scale',
    prompt: 'In a close relationship, how important is frequent emotional contact to you?',
    anchors: ['Not very important', 'Extremely important'],
    scale: { closeness_need: .9, reassurance_need: .25 }
  },
  {
    id: 'rel_autonomy', section: 'Relationships', type: 'scale',
    prompt: 'How important is it that both partners maintain substantial independent lives?',
    anchors: ['Not very important', 'Essential'],
    scale: { autonomy_need: .95 }
  },
  {
    id: 'rel_conflict', section: 'Relationships', type: 'single',
    prompt: 'In serious conflict, what do you most want to accomplish first?',
    options: [
      { label: 'Understand what actually happened.', w: { repair_orientation: .55, cognitive_contextual: .35 } },
      { label: 'Resolve the concrete problem.', w: { repair_orientation: .5, cognitive_systemizing: .4 } },
      { label: 'Make sure we still feel emotionally connected.', w: { closeness_need: .5, reassurance_need: .45 } },
      { label: 'Make sure my position is accurately understood.', w: { conflict_directness: .45, recognition_need: .35 } },
      { label: 'Get enough distance to think clearly before engaging.', w: { autonomy_need: .35, stress_withdrawal: .5 } }
    ]
  },
  {
    id: 'identity_feedback', section: 'Self', type: 'multi', max: 2,
    prompt: 'Which two qualities would people who know you well be most likely to emphasize?',
    options: [
      { label: 'Strong-minded', w: { competence_identity: .45, conflict_directness: .25 } },
      { label: 'Warm', w: { belonging_need: .45, closeness_need: .3 } },
      { label: 'Curious', w: { value_knowledge: .45, novelty_orientation: .25 } },
      { label: 'Reliable', w: { structure_preference: .5, value_stability: .35 } },
      { label: 'Independent', w: { autonomy_need: .55, value_freedom: .35 } },
      { label: 'Intense', w: { emotional_intensity: .55 } },
      { label: 'Unconventional', w: { distinctiveness_need: .5, novelty_orientation: .3 } },
      { label: 'Thoughtful', w: { cognitive_contextual: .35, value_knowledge: .25 } }
    ]
  },
  {
    id: 'values_rank', section: 'Values', type: 'rank', max: 4,
    prompt: 'Choose the four that matter most to the life you want, then rank them.',
    options: [
      { label: 'Deep love', dimension: 'closeness_need' },
      { label: 'Family', dimension: 'value_family' },
      { label: 'Achievement', dimension: 'value_achievement' },
      { label: 'Freedom', dimension: 'value_freedom' },
      { label: 'Stability', dimension: 'value_stability' },
      { label: 'Meaning', dimension: 'value_meaning' },
      { label: 'Knowledge', dimension: 'value_knowledge' },
      { label: 'Adventure', dimension: 'novelty_orientation' },
      { label: 'Service', dimension: 'value_service' },
      { label: 'Influence', dimension: 'value_influence' },
      { label: 'Beauty', dimension: 'value_beauty' }
    ]
  },
  {
    id: 'values_tradeoff', section: 'Values', type: 'single',
    prompt: 'Which loss would feel most like losing the shape of the life you wanted?',
    options: [
      { label: 'Not building or accomplishing something that mattered to me.', w: { value_achievement: .65, competence_identity: .3 } },
      { label: 'Not having the depth of love and connection I wanted.', w: { closeness_need: .65, value_family: .25 } },
      { label: 'Living a life that was secure but never felt fully mine.', w: { value_freedom: .65, autonomy_need: .35 } },
      { label: 'Having freedom and success but feeling that none of it meant very much.', w: { value_meaning: .7 } },
      { label: 'Having a meaningful life that became too narrow or repetitive.', w: { novelty_orientation: .6, value_freedom: .3 } }
    ]
  },
  {
    id: 'betrayal', section: 'Values', type: 'single',
    prompt: 'Which breach would be hardest for you to repair after?',
    options: [
      { label: 'Being deliberately deceived.', w: { trust_baseline: -.45, value_loyalty: .35 } },
      { label: 'Being abandoned when I genuinely needed them.', w: { closeness_need: .45, reassurance_need: .45 } },
      { label: 'Having something private used against me.', w: { vulnerability_openness: -.35, recognition_need: .35 } },
      { label: 'Being controlled or having my agency overridden.', w: { autonomy_need: .65, value_freedom: .45 } },
      { label: 'Repeatedly discovering that I mattered less to them than they mattered to me.', w: { reciprocity_sensitivity: .65, closeness_need: .25 } }
    ]
  },
  {
    id: 'stress_failure', section: 'Under pressure', type: 'single',
    prompt: 'Something important fails and you were responsible. What tends to happen first?',
    options: [
      { label: 'I analyze the failure until I understand the mechanism.', w: { stress_intellectualization: .6, cognitive_systemizing: .35 } },
      { label: 'I start fixing what can still be fixed.', w: { stress_control: .55, decisiveness: .35 } },
      { label: 'I feel the emotional impact before I can think clearly.', w: { emotional_intensity: .55 } },
      { label: 'I want distance from the situation for a while.', w: { stress_withdrawal: .65 } },
      { label: 'I become especially attentive to everyone affected by it.', w: { stress_accommodation: .55, repair_orientation: .25 } }
    ]
  },
  {
    id: 'shadow_need', section: 'Shadow', type: 'single',
    prompt: 'Which need is hardest for you to admit openly when it is strong?',
    options: [
      { label: 'I want reassurance.', w: { reassurance_need: .45, recognition_need: .2 } },
      { label: 'I want help.', w: { autonomy_need: .35, stress_withdrawal: .15 } },
      { label: 'I want affection.', w: { closeness_need: .4, vulnerability_openness: -.1 } },
      { label: 'I want approval or admiration.', w: { recognition_need: .55 } },
      { label: 'I want to belong.', w: { belonging_need: .55 } },
      { label: 'None of these are particularly hard for me to admit.', w: { vulnerability_openness: .35, trust_baseline: .2 } }
    ]
  }
];

const ARCHETYPES = {
  Architect: {
    prototype: { cognitive_systemizing:.8, competence_identity:.65, structure_preference:.45, decisiveness:.45, autonomy_need:.3 },
    essence: 'Turns complexity into structure and direction.'
  },
  Seer: {
    prototype: { cognitive_contextual:.75, ambiguity_tolerance:.55, value_knowledge:.5, value_meaning:.5, novelty_orientation:.25 },
    essence: 'Lives through pattern, interpretation, and underlying meaning.'
  },
  Explorer: {
    prototype: { novelty_orientation:.8, value_freedom:.7, autonomy_need:.45, ambiguity_tolerance:.4 },
    essence: 'Expands through movement, possibility, and discovery.'
  },
  Sovereign: {
    prototype: { value_influence:.6, competence_identity:.7, decisiveness:.65, stress_control:.45, recognition_need:.25 },
    essence: 'Creates agency, direction, and consequential outcomes.'
  },
  Alchemist: {
    prototype: { emotional_intensity:.55, value_meaning:.75, vulnerability_openness:.35, cognitive_contextual:.4, novelty_orientation:.25 },
    essence: 'Transforms experience into depth, meaning, and change.'
  },
  Devotee: {
    prototype: { closeness_need:.75, value_loyalty:.65, value_family:.45, reciprocity_sensitivity:.55, vulnerability_openness:.35 },
    essence: 'Organizes life around depth of bond and emotional significance.'
  },
  Guardian: {
    prototype: { value_stability:.7, structure_preference:.6, value_loyalty:.55, repair_orientation:.45, value_family:.45 },
    essence: 'Creates continuity, reliability, and safety around what matters.'
  },
  Maverick: {
    prototype: { autonomy_need:.75, value_freedom:.7, distinctiveness_need:.6, novelty_orientation:.4, conflict_directness:.25 },
    essence: 'Protects self-definition and resists living by inherited scripts.'
  }
};

function emptyModel() {
  const scores = {}, evidence = {};
  Object.keys(DIMENSIONS).forEach(k => { scores[k] = 0; evidence[k] = 0; });
  return { scores, evidence };
}

function add(model, key, value, evidence=1) {
  if (!(key in model.scores)) return;
  model.scores[key] += value;
  model.evidence[key] += evidence;
}

function normalizeScore(raw, evidence) {
  if (!evidence) return 0;
  return Math.max(-1, Math.min(1, raw / evidence));
}

function scoreResponses(responses={}) {
  const model = emptyModel();
  for (const item of ITEMS) {
    const response = responses[item.id];
    if (response == null) continue;

    if (item.type === 'single') {
      const option = item.options[Number(response)];
      if (!option) continue;
      Object.entries(option.w || {}).forEach(([k,v]) => add(model,k,v,1));
    }

    if (item.type === 'scale') {
      const n = Math.max(1, Math.min(7, Number(response)));
      const centered = (n - 4) / 3;
      Object.entries(item.scale || {}).forEach(([k,v]) => add(model,k,centered*v,1));
    }

    if (item.type === 'multi') {
      const selected = Array.isArray(response) ? response.slice(0,item.max||2) : [];
      selected.forEach(idx => {
        const option=item.options[Number(idx)];
        Object.entries(option?.w||{}).forEach(([k,v])=>add(model,k,v,1));
      });
    }

    if (item.type === 'rank') {
      const ranked = Array.isArray(response) ? response.slice(0,item.max||4) : [];
      const weights=[1,.75,.5,.3];
      ranked.forEach((idx,rank)=>{
        const option=item.options[Number(idx)];
        if(option?.dimension) add(model,option.dimension,weights[rank]||.2,1);
      });
    }
  }

  const scores={}, confidence={};
  for (const key of Object.keys(DIMENSIONS)) {
    scores[key]=normalizeScore(model.scores[key],model.evidence[key]);
    // Confidence is evidence coverage, intentionally conservative in MVP.
    confidence[key]=Math.min(1, model.evidence[key]/3);
  }
  return { version:'wonder-person-v2', scores, confidence };
}

function cosineLike(scores, prototype) {
  let dot=0, a=0, b=0;
  for(const [k,target] of Object.entries(prototype)) {
    const x=scores[k]||0;
    dot += x*target; a += x*x; b += target*target;
  }
  if(!a || !b) return 0;
  return dot/(Math.sqrt(a)*Math.sqrt(b));
}

function inferArchetypes(personModel) {
  const ranked=Object.entries(ARCHETYPES)
    .map(([name,a])=>({ name, score:cosineLike(personModel.scores,a.prototype), essence:a.essence }))
    .sort((a,b)=>b.score-a.score);
  const top=ranked[0]||null, secondary=ranked[1]||null;
  const margin=top&&secondary ? top.score-secondary.score : 0;
  return {
    primary:top,
    secondary,
    confidence:Math.max(0,Math.min(1,.45 + margin)),
    ranked
  };
}

module.exports={DIMENSIONS,ITEMS,ARCHETYPES,scoreResponses,inferArchetypes};