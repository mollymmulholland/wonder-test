(()=>{
  const btn=document.getElementById('resumeBtn');
  if(!btn)return;

  const readState=()=>{
    try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}
  };

  const hasAccount=s=>s.account && (s.account.email||s.account.phone);
  const hasSession=s=>!!(s.auth?.accessToken && s.account?.persistence==='supabase');
  const hasAnswers=s=>s.answers && Object.keys(s.answers).length>0;
  const hasEssentials=s=>s.essentials && Object.values(s.essentials).some(Boolean);
  const hasBirth=s=>s.birth && (s.birth.dob||s.birth.pob||s.birth.tob);

  function resumeTarget(s){
    if(!hasSession(s)) return 'account';
    if(s.completedAssessment){
      if(s.accuracy || s.correction) return 'home';
      return 'mirror';
    }
    if(hasAnswers(s) || Number(s.qi||0)>0) return 'assessment';
    if(hasEssentials(s)) return 'visual';
    if(hasBirth(s)) return 'essentials';
    if(hasAccount(s)) return 'birth';
    return 'account';
  }

  const s=readState();
  const shouldShow=hasAccount(s)||hasBirth(s)||hasEssentials(s)||hasAnswers(s)||s.completedAssessment;
  btn.style.display=shouldShow?'inline-flex':'none';
  btn.onclick=()=>{
    const current=readState();
    const target=resumeTarget(current);
    if(target==='mirror' && typeof buildMirror==='function') buildMirror();
    if(target==='assessment' && typeof renderQ==='function') renderQ();
    if(typeof show==='function') show(target);
  };
})();