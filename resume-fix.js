(()=>{
  const btn=document.getElementById('resumeBtn');if(!btn)return;
  const readState=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  const readAssessment=()=>{try{return JSON.parse(localStorage.getItem('wonder_assessment_v2')||'{}')}catch{return{}}};
  const hasAccount=s=>!!(s.account&&(s.account.email||s.account.phone));
  const hasSession=s=>!!(s.auth?.accessToken&&s.account?.persistence==='supabase');
  const hasEssentials=s=>!!(s.essentials&&Object.values(s.essentials).some(Boolean));
  const hasBirth=s=>!!(s.birth&&(s.birth.dob||s.birth.pob||s.birth.tob));

  function target(){
    const s=readState(),a=readAssessment();
    if(!hasSession(s))return'account';
    if(a.complete||s.assessmentV2){
      if(s.accuracy||s.correction)return'home';
      return'mirror';
    }
    if(a.sessionId||Object.keys(a.responses||{}).length)return'assessment';
    if(hasEssentials(s))return'visual';
    if(hasBirth(s))return'essentials';
    if(hasAccount(s))return'birth';
    return'account';
  }

  function refresh(){
    const s=readState(),a=readAssessment();
    const shouldShow=hasAccount(s)||hasBirth(s)||hasEssentials(s)||a.sessionId||Object.keys(a.responses||{}).length||a.complete||!!s.assessmentV2;
    btn.style.display=shouldShow?'inline-flex':'none';
  }

  btn.onclick=()=>{const t=target();if(typeof show==='function')show(t);};
  window.addEventListener('wonder-auth-updated',refresh);
  window.addEventListener('storage',refresh);
  refresh();
})();