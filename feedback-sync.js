(()=>{
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  const readAssessment=()=>{try{return JSON.parse(localStorage.getItem('wonder_assessment_v2')||'{}')}catch{return{}}};
  const saveBtn=document.getElementById('saveMirror');
  if(!saveBtn)return;

  saveBtn.addEventListener('click',async()=>{
    const s=read();
    const token=s.auth?.accessToken;
    if(!token)return;
    const accuracy=Number(s.accuracy||0);
    if(!accuracy)return;
    const correction=(document.getElementById('correction')?.value||'').trim();
    const assessment=readAssessment();
    try{
      await fetch('/api/mirror-feedback',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({
          assessment_session_id:assessment.sessionId||null,
          overall_accuracy:accuracy,
          correction,
          archetype_resonance:accuracy
        }),
        keepalive:true
      });
    }catch{}
  },true);
})();