(()=>{
  const $=id=>document.getElementById(id);
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  function activate(id){const target=$(id);if(!target)return false;document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s===target));const label=$('phaseLabel');if(label)label.textContent={account:'Account',assessment:'Assessment',mirror:'Mirror',home:'Wonder',profile:'Your portrait',journal:'Journal',ai:'Wonder AI',matches:'Introductions',essentials:'Preferences',visual:'Photos'}[id]||'Wonder';const s=read();s.screen=id;try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}window.scrollTo(0,0);if(id==='assessment')setTimeout(()=>window.startWonderAssessment?.(),75);return true;}
  window.wonderNavigate=activate;if(!window.show)window.show=activate;
  function recover(){const active=document.querySelector('.screen.active');if(!active){activate('account');return;}if(active.id==='assessment'){const mount=$('questionMount');if(!mount)return;if(!mount.textContent.trim()&&!mount.querySelector('button')){window.startWonderAssessment?.();setTimeout(()=>{if(!mount.textContent.trim()&&!mount.querySelector('button')){mount.innerHTML='<div class="question-title">Wonder could not load the assessment.</div><p class="muted">Your account is safe. Return to sign in and try again.</p><button type="button" class="ghost" id="assessmentRecovery">Return to sign in</button>';$('assessmentRecovery').onclick=()=>activate('account');}},2200);}}}
  window.addEventListener('error',e=>{console.error('Wonder browser error',e.error||e.message);setTimeout(recover,0)});
  window.addEventListener('unhandledrejection',e=>{console.error('Wonder promise rejection',e.reason);setTimeout(recover,0)});
  const boot=()=>{activate('account');setTimeout(recover,700)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();