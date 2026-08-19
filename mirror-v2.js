(()=>{
  const $=id=>document.getElementById(id);
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  let lastKey='';

  function render(){
    const s=read();const m=s.assessmentV2?.mirror;if(!m)return;
    const key=JSON.stringify([m.primary?.name,m.secondary?.name,m.evidence_coverage,m.tension_title]);if(key===lastKey)return;lastKey=key;
    if($('archetypeName'))$('archetypeName').textContent='The '+(m.primary?.name||'Unfolding');
    if($('archetypeNote')){
      const secondary=m.secondary?.name?` · ${m.secondary.name} influence`:'';
      const conf=Number(m.archetype_confidence||0);
      const qualifier=conf>=.7?'clear emerging pattern':conf>=.45?'provisional pattern':'early hypothesis';
      $('archetypeNote').textContent=`Primary archetype${secondary} · ${qualifier}`;
    }
    if($('mirrorMoveTitle'))$('mirrorMoveTitle').textContent=m.move_title||m.headline||'How you make sense of things';
    if($('mirrorMove'))$('mirrorMove').textContent=m.move||'';
    if($('mirrorDriveTitle'))$('mirrorDriveTitle').textContent=m.drive_title||'What carries weight';
    if($('mirrorDrive'))$('mirrorDrive').textContent=m.drive||'';
    if($('mirrorRelTitle'))$('mirrorRelTitle').textContent=m.relationship_title||'How connection works for you';
    if($('mirrorRel'))$('mirrorRel').textContent=m.relationship||'';
    if($('mirrorShadowTitle'))$('mirrorShadowTitle').textContent=m.tension_title||'A tension Wonder noticed';
    if($('mirrorShadow'))$('mirrorShadow').textContent=m.tension||'';
    if($('mirrorUncertain')){
      const u=Array.isArray(m.uncertain)?m.uncertain:[];
      $('mirrorUncertain').textContent=u.length?`Wonder has less evidence about ${u.join(', ')}. Those remain open questions rather than settled traits.`:'Wonder has broad coverage, but every part of this Mirror remains revisable as new evidence appears.';
    }
    const mirror=document.getElementById('mirror');
    let pressure=mirror?.querySelector('.mirror-pressure-v2');
    if(m.pressure&&mirror&&!pressure){
      pressure=document.createElement('article');pressure.className='mirror-pressure-v2';
      pressure.innerHTML=`<span>Under pressure</span><h3></h3><p></p>`;
      const grid=mirror.querySelector('.mirror-grid');if(grid)grid.appendChild(pressure);
    }
    if(pressure){pressure.querySelector('h3').textContent=m.pressure_title||'What changes under pressure';pressure.querySelector('p').textContent=m.pressure||'';}
  }

  const mirror=$('mirror');if(!mirror)return;
  new MutationObserver(()=>{if(mirror.classList.contains('active'))setTimeout(render,60)}).observe(mirror,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{if(e.target.closest('#saveMirror'))render()},true);
  if(mirror.classList.contains('active'))render();
})();