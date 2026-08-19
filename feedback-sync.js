(()=>{
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  const readAssessment=()=>{try{return JSON.parse(localStorage.getItem('wonder_assessment_v2')||'{}')}catch{return{}}};
  const saveBtn=document.getElementById('saveMirror');if(!saveBtn)return;

  const accuracy=document.querySelector('#mirror .accuracy');
  if(accuracy&&!document.getElementById('mirrorCalibration')){
    const wrap=document.createElement('div');wrap.id='mirrorCalibration';wrap.className='mirror-calibration';
    wrap.innerHTML=`
      <div class="mirror-cal-group"><span>What felt most true?</span><div class="mirror-cal-chips" data-kind="accurate"></div></div>
      <div class="mirror-cal-group"><span>What felt off?</span><div class="mirror-cal-chips" data-kind="inaccurate"></div></div>`;
    const labels=[['move','How you move'],['drive','What drives you'],['relationship','In relationships'],['tension','The tension']];
    wrap.querySelectorAll('.mirror-cal-chips').forEach(row=>{row.innerHTML=labels.map(([key,label])=>`<button type="button" class="mirror-cal-chip" data-section="${key}">${label}</button>`).join('')});
    const correction=document.getElementById('correction');accuracy.insertBefore(wrap,correction||saveBtn);
    const style=document.createElement('style');style.textContent=`.mirror-calibration{display:grid;gap:22px;margin:26px 0}.mirror-cal-group>span{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.56;margin-bottom:10px}.mirror-cal-chips{display:flex;gap:8px;flex-wrap:wrap}.mirror-cal-chip{border:1px solid rgba(25,24,21,.2);background:transparent;color:inherit;border-radius:999px;padding:9px 12px;font:inherit;font-size:12px}.mirror-cal-chip.selected{background:#1d1c19;color:#f7f2e8;border-color:#1d1c19}`;document.head.appendChild(style);
    wrap.addEventListener('click',e=>{const chip=e.target.closest('.mirror-cal-chip');if(!chip)return;const row=chip.closest('.mirror-cal-chips'),otherKind=row.dataset.kind==='accurate'?'inaccurate':'accurate';chip.classList.toggle('selected');if(chip.classList.contains('selected'))wrap.querySelector(`.mirror-cal-chips[data-kind="${otherKind}"] .mirror-cal-chip[data-section="${chip.dataset.section}"]`)?.classList.remove('selected');});
  }

  function selected(kind){return[...document.querySelectorAll(`.mirror-cal-chips[data-kind="${kind}"] .mirror-cal-chip.selected`)].map(x=>x.dataset.section)}

  saveBtn.addEventListener('click',async()=>{
    const s=read(),token=s.auth?.accessToken;if(!token)return;
    const rating=Number(s.accuracy||0);if(!rating)return;
    const correction=(document.getElementById('correction')?.value||'').trim(),assessment=readAssessment();
    try{
      const r=await fetch('/api/persist',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({action:'mirror_feedback',person_model_snapshot_id:assessment.result?.snapshot_id||assessment.persistedResult?.snapshot_id||null,assessment_session_id:assessment.sessionId||null,overall_accuracy:rating,accurate_sections:selected('accurate'),inaccurate_sections:selected('inaccurate'),correction,archetype_resonance:rating}),
        keepalive:true
      });
      if(r.ok){const current=read();current.mirrorFeedbackSavedAt=new Date().toISOString();current.mirrorAccurateSections=selected('accurate');current.mirrorInaccurateSections=selected('inaccurate');localStorage.setItem('wonder_preview_state',JSON.stringify(current));}
    }catch{}
  },true);
})();