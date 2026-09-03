(()=>{
  const $=id=>document.getElementById(id);
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  function activate(id){const target=$(id);if(!target)return false;document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s===target));const label=$('phaseLabel');if(label)label.textContent={welcome:'Private preview',account:'Account',birth:'Origin',essentials:'Essentials',visual:'Presence',assessment:'Assessment',mirror:'Mirror',home:'Wonder',profile:'Your portrait',journal:'Journal',ai:'Wonder AI',matches:'Introductions'}[id]||'Wonder';const s=read();s.screen=id;try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}window.scrollTo(0,0);if(id==='assessment')setTimeout(()=>window.startWonderAssessment?.(),50);return true;}
  window.wonderNavigate=activate;
  // app.js defines show as a global lexical binding rather than window.show. Some later modules
  // correctly need a window-level navigator, so expose a stable one here.
  if(!window.show)window.show=activate;
  function recover(){const active=document.querySelector('.screen.active');if(!active){activate('welcome');return;}if(active.id==='assessment'){const mount=$('questionMount');if(!mount)return;if(!mount.textContent.trim()&&!mount.querySelector('button')){window.startWonderAssessment?.();setTimeout(()=>{if(!mount.textContent.trim()&&!mount.querySelector('button')){mount.innerHTML='<div class="question-title">Wonder could not load the next question.</div><p class="muted">Your progress is saved. Return to the previous step or reload and choose Resume.</p><button type="button" class="ghost" id="assessmentRecovery">Return to photos</button>';$('assessmentRecovery').onclick=()=>activate('visual');}},2500);}}
  }
  window.addEventListener('error',e=>{console.error('Wonder browser error',e.error||e.message);setTimeout(recover,0)});
  window.addEventListener('unhandledrejection',e=>{console.error('Wonder promise rejection',e.reason);setTimeout(recover,0)});
  document.addEventListener('DOMContentLoaded',()=>{recover();setTimeout(recover,800)});
  setTimeout(recover,1200);
})();