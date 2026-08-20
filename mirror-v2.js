(()=>{
  const $=id=>document.getElementById(id);
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  let lastKey='';
  const archetypeCopy={
    Architect:{move:['You look for structure','You tend to make complexity manageable by finding the underlying system, pattern, or decision rule.'],drive:['Competence matters','You are most engaged when you can understand something well enough to improve it, direct it, or build with it.'],rel:['Clarity before fusion','You usually connect best when affection is paired with reliability, intelligence, and respect for each person’s agency.'],tension:['Control can masquerade as certainty','When something matters, solving the problem can become easier than tolerating what cannot yet be solved.']},
    Seer:{move:['You stay with complexity','You are inclined to notice context, contradiction, and meanings that disappear when a situation is reduced too quickly.'],drive:['Understanding matters','You are pulled toward insight: not simply knowing what happened, but understanding what it means and why it changes across contexts.'],rel:['You want to be deeply known','Connection becomes significant when another person can perceive nuance rather than interacting only with the obvious version of you.'],tension:['Insight can delay action','Seeing several interpretations at once can make certainty feel intellectually dishonest even when a decision is required.']},
    Explorer:{move:['You learn through movement','Novelty, experimentation, and direct experience help you understand yourself and the world more effectively than repetition does.'],drive:['Possibility matters','You are energized by what might still be discovered, changed, learned, or experienced.'],rel:['Connection needs room','You are likely to value intimacy most when it expands your life rather than narrowing it.'],tension:['Freedom can become escape','When life feels constrained, changing the environment may sometimes be easier than staying with the discomfort long enough to understand it.']},
    Sovereign:{move:['You orient toward agency','You tend to ask what can be done, decided, influenced, or improved rather than remaining passive inside uncertainty.'],drive:['Impact matters','Capability, autonomy, and meaningful influence are likely to carry substantial psychological weight for you.'],rel:['Respect is part of intimacy','You are likely to need both emotional connection and genuine respect for the other person’s judgment, competence, and independence.'],tension:['Strength can become armor','The identity of being capable can make dependence, uncertainty, or openly needing reassurance harder to tolerate.']},
    Alchemist:{move:['Experience becomes meaning','You process life by transforming emotion, contradiction, and difficult experience into a larger understanding of yourself.'],drive:['Depth matters','A life that is merely efficient or comfortable is unlikely to satisfy you if it feels emotionally or existentially shallow.'],rel:['Connection changes you','You are likely to experience important relationships as transformative rather than simply companionate.'],tension:['Intensity can look like significance','Because you feel deeply, emotionally charged experiences can sometimes seem more meaningful before enough time has passed to know what they actually mean.']},
    Devotee:{move:['You notice the bond','You are unusually attentive to emotional reciprocity, closeness, loyalty, and the subtle changes that signal how a relationship is functioning.'],drive:['Love carries real weight','Deep connection is not peripheral to the life you want. It is one of the central things that makes achievement or experience meaningful.'],rel:['You invest deeply','When you choose someone, you are inclined toward emotional presence, loyalty, and meaningful interdependence rather than casual attachment.'],tension:['Reciprocity can become vigilance','Because imbalance matters to you, small changes in effort or availability may attract attention before you know what they mean.']},
    Guardian:{move:['You build continuity','You tend to value what proves dependable over time and naturally notice what helps people, commitments, and systems remain stable.'],drive:['Reliability matters','Security, loyalty, and creating something durable are likely to matter more than novelty for its own sake.'],rel:['Safety enables depth','You are likely to open most fully when another person demonstrates consistency rather than simply intensity.'],tension:['Stability can become overprotection','Preserving what works can occasionally make disruption feel threatening even when change would ultimately be useful.']},
    Maverick:{move:['You think from the inside out','You are resistant to inherited scripts and tend to trust conclusions that feel independently reached rather than socially prescribed.'],drive:['Self-definition matters','Freedom means more than having options. It means being able to construct a life that actually feels like your own.'],rel:['Closeness cannot require self-erasure','You are likely to want meaningful intimacy while remaining highly sensitive to control, engulfment, or pressure to become more conventional.'],tension:['Independence can hide need','Self-sufficiency is a strength, but it can sometimes make legitimate needs for care, reassurance, or dependence harder to express.']}
  };

  function render(){
    const s=read();const m=s.assessmentV2?.mirror;if(!m)return;
    const key=JSON.stringify([m.primary?.name,m.secondary?.name,m.evidence_coverage,m.tension_title,m.move,m.drive,m.relationship,m.tension]);if(key===lastKey)return;lastKey=key;
    const name=m.primary?.name||'Unfolding',fallback=archetypeCopy[name]||archetypeCopy.Seer;
    if($('archetypeName'))$('archetypeName').textContent='The '+name;
    if($('archetypeNote')){
      const secondary=m.secondary?.name?` · ${m.secondary.name} influence`:'';
      const conf=Number(m.archetype_confidence||0);
      const qualifier=conf>=.7?'clear emerging pattern':conf>=.45?'provisional pattern':'early hypothesis';
      $('archetypeNote').textContent=`Primary archetype${secondary} · ${qualifier}`;
    }
    if($('mirrorMoveTitle'))$('mirrorMoveTitle').textContent=m.move_title||m.headline||fallback.move[0];
    if($('mirrorMove'))$('mirrorMove').textContent=m.move||fallback.move[1];
    if($('mirrorDriveTitle'))$('mirrorDriveTitle').textContent=m.drive_title||fallback.drive[0];
    if($('mirrorDrive'))$('mirrorDrive').textContent=m.drive||fallback.drive[1];
    if($('mirrorRelTitle'))$('mirrorRelTitle').textContent=m.relationship_title||fallback.rel[0];
    if($('mirrorRel'))$('mirrorRel').textContent=m.relationship||fallback.rel[1];
    if($('mirrorShadowTitle'))$('mirrorShadowTitle').textContent=m.tension_title||fallback.tension[0];
    if($('mirrorShadow'))$('mirrorShadow').textContent=m.tension||fallback.tension[1];
    if($('mirrorUncertain')){
      const u=Array.isArray(m.uncertain)?m.uncertain:[];
      $('mirrorUncertain').textContent=u.length?`Wonder has less evidence about ${u.join(', ')}. These remain open questions rather than settled traits.`:'The strongest patterns are visible, but this profile is still provisional. Wonder should become more accurate as it sees how your stated preferences compare with your actual relational experience.';
    }
    const mirror=document.getElementById('mirror');
    let pressure=mirror?.querySelector('.mirror-pressure-v2');
    if(m.pressure&&mirror&&!pressure){pressure=document.createElement('article');pressure.className='mirror-pressure-v2';pressure.innerHTML=`<span>Under pressure</span><h3></h3><p></p>`;const grid=mirror.querySelector('.mirror-grid');if(grid)grid.appendChild(pressure);}
    if(pressure){pressure.querySelector('h3').textContent=m.pressure_title||'What changes under pressure';pressure.querySelector('p').textContent=m.pressure||'Wonder does not yet have enough evidence to make a strong claim about how your patterns change under pressure.';}
  }
  const mirror=$('mirror');if(!mirror)return;
  new MutationObserver(()=>{if(mirror.classList.contains('active'))setTimeout(render,60)}).observe(mirror,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{if(e.target.closest('#saveMirror'))render()},true);
  if(mirror.classList.contains('active'))render();
})();