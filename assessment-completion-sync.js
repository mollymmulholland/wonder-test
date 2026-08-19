(()=>{
  const preview=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  const assessment=()=>{try{return JSON.parse(localStorage.getItem('wonder_assessment_v2')||'{}')}catch{return{}}};
  let syncing=false;

  async function syncCompleted(){
    if(syncing)return;
    const a=assessment(),s=preview();
    const token=s.auth?.accessToken;
    if(!token||!a.complete||!a.sessionId||a.snapshotSyncedAt)return;
    syncing=true;
    try{
      const r=await fetch('/api/assessment/complete',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({session_id:a.sessionId})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Unable to persist completed assessment.');
      const next=assessment();
      next.snapshotSyncedAt=new Date().toISOString();
      next.persistedResult=d;
      localStorage.setItem('wonder_assessment_v2',JSON.stringify(next));
    }catch(e){
      const next=assessment();
      next.snapshotSyncError=String(e.message||e);
      localStorage.setItem('wonder_assessment_v2',JSON.stringify(next));
    }finally{syncing=false;}
  }

  window.addEventListener('focus',syncCompleted);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncCompleted();});
  document.addEventListener('click',e=>{if(e.target.closest('#saveMirror,[data-next="matches"]'))setTimeout(syncCompleted,50)},true);
  setInterval(syncCompleted,2500);
  setTimeout(syncCompleted,800);
})();