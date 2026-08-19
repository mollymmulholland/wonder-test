(()=>{
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}};
  let timer=null;

  async function syncNow(){
    const s=read();
    const token=s.auth?.accessToken;
    if(!token) return;
    try{
      const r=await fetch('/api/persist',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({birth:s.birth||null,essentials:s.essentials||null,answers:s.answers||null})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data.error||'Sync failed');
      const next=read();
      next.cloud={...(next.cloud||{}),lastSyncedAt:new Date().toISOString(),userId:data.user_id,status:'synced'};
      try{localStorage.setItem('wonder_preview_state',JSON.stringify(next));}catch{}
    }catch(err){
      const next=read();
      next.cloud={...(next.cloud||{}),status:'pending',lastError:err.message};
      try{localStorage.setItem('wonder_preview_state',JSON.stringify(next));}catch{}
    }
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(syncNow,250);}
  document.addEventListener('click',e=>{
    if(e.target.closest('#birthContinue,#essentialsContinue,#nextQuestion,.option,#visualContinue,#skipVisual')) schedule();
  },true);
  window.addEventListener('focus',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});
  setTimeout(syncNow,500);
  window.wonderCloudSync=syncNow;
})();