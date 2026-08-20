(()=>{
const MEDIA={
 welcome:[
  {cls:'eye',src:'https://unsplash.com/photos/DGdaKzZ_MT4/download?force=true&w=1200',index:'01',caption:'Human / perception'},
  {cls:'water',src:'https://unsplash.com/photos/u-i8O5jeTXE/download?force=true&w=1000',index:'02',caption:'Water / reflection'},
  {cls:'leaf',src:'https://unsplash.com/photos/dq7jErOBJbo/download?force=true&w=1000',index:'03',caption:'Pattern / structure'}
 ],
 assessment:{
  'Instinct':{src:'https://unsplash.com/photos/dq7jErOBJbo/download?force=true&w=1000',label:'Instinct',line:'Pattern / response'},
  'Self':{src:'https://unsplash.com/photos/DGdaKzZ_MT4/download?force=true&w=1000',label:'Self',line:'Perception / identity'},
  'Values':{src:'https://unsplash.com/photos/HXdCbFXuH2E/download?force=true&w=1000',label:'Values',line:'Ground / priority'},
  'Relationships':{src:'https://unsplash.com/photos/Zf9tG_yR4as/download?force=true&w=1000',label:'Relationships',line:'Touch / proximity'},
  'Under pressure':{src:'https://unsplash.com/photos/M0nb1NFeWPc/download?force=true&w=1000',label:'Under pressure',line:'Motion / regulation'},
  'Shadow':{src:'https://unsplash.com/photos/PkauYYJwdTQ/download?force=true&w=1000',label:'Shadow',line:'Visibility / concealment'},
  'Contradiction':{src:'https://unsplash.com/photos/01BrrHZcWhQ/download?force=true&w=1000',label:'Contradiction',line:'Structure / variance'}
 }
};

function buildWelcomeMedia(){const visual=document.querySelector('#welcome .intro-visual');if(!visual||visual.dataset.mediaBuilt)return;visual.dataset.mediaBuilt='1';visual.innerHTML=MEDIA.welcome.map((m,i)=>`<figure class="editorial-frame ${m.cls}" data-depth="${i+1}"><img src="${m.src}" alt="" loading="eager"><span class="editorial-index">${m.index}</span><span class="editorial-caption">${m.caption}</span>${i===0?'<span class="editorial-crosshair"></span>':''}</figure>`).join('');const welcome=document.getElementById('welcome');welcome?.addEventListener('pointermove',e=>{const r=welcome.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;visual.querySelectorAll('.editorial-frame').forEach(frame=>{const d=Number(frame.dataset.depth)||1;frame.style.transform=`translate3d(${x*d*4}px,${y*d*4}px,0)`})});welcome?.addEventListener('pointerleave',()=>visual.querySelectorAll('.editorial-frame').forEach(frame=>frame.style.transform=''))}

function buildAssessmentMedia(){const assessment=document.getElementById('assessment');if(!assessment||assessment.querySelector('.assessment-media'))return;const el=document.createElement('aside');el.className='assessment-media';el.innerHTML='<img alt="" loading="eager"><span class="assessment-media-label">Instinct</span><span class="assessment-media-line"><b>Wonder</b><b>01</b></span>';assessment.appendChild(el);updateAssessmentMedia(document.getElementById('sectionLabel')?.textContent?.trim()||'Instinct')}
function updateAssessmentMedia(section){const cfg=MEDIA.assessment[section]||MEDIA.assessment.Instinct,el=document.querySelector('.assessment-media');if(!el)return;const img=el.querySelector('img'),label=el.querySelector('.assessment-media-label'),line=el.querySelector('.assessment-media-line');if(img.dataset.src===cfg.src)return;el.classList.add('swap');setTimeout(()=>{img.src=cfg.src;img.dataset.src=cfg.src;label.textContent=cfg.label;line.innerHTML=`<b>${cfg.line}</b><b>${String(Object.keys(MEDIA.assessment).indexOf(section)+1).padStart(2,'0')}</b>`;img.onload=()=>requestAnimationFrame(()=>el.classList.remove('swap'))},220)}

buildWelcomeMedia();buildAssessmentMedia();
const label=document.getElementById('sectionLabel');if(label){new MutationObserver(()=>updateAssessmentMedia(label.textContent.trim())).observe(label,{childList:true,subtree:true,characterData:true})}
})();