(()=>{
  const read=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  const grid=document.getElementById('matchGrid');if(!grid)return;

  const css=`
  .match-live-card{border:1px solid rgba(25,24,21,.17);border-radius:26px;padding:24px;margin:16px 0;background:rgba(255,255,255,.2)}
  .match-live-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.55;margin-bottom:8px}
  .match-live-card h3{font-family:'Libre Caslon Display',serif;font-size:34px;font-weight:400;margin:0 0 6px}
  .match-live-place{opacity:.58;margin-bottom:18px}
  .match-live-fit{display:inline-block;border:1px solid rgba(25,24,21,.2);border-radius:999px;padding:7px 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
  .match-live-reasons{display:grid;gap:10px;margin-top:8px}
  .match-live-reason{font-size:15px;line-height:1.45;padding-top:10px;border-top:1px solid rgba(25,24,21,.1)}
  .match-live-empty{padding:48px 0;max-width:560px}.match-live-empty h3{font-family:'Libre Caslon Display',serif;font-size:38px;font-weight:400;margin:0 0 16px}.match-live-empty p{line-height:1.65;opacity:.65}
  `;const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  function fitLabel(score,confidence){
    if(confidence<.35)return 'Early signal';
    if(score>=84)return 'Strong potential';
    if(score>=72)return 'Promising';
    return 'Worth exploring';
  }
  function escape(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderCard(m,i){
    const strengths=m.rationale?.strengths||[],tensions=m.rationale?.tensions||[];
    const reasons=[...strengths.slice(0,2),...(tensions.length?[`Something to understand: ${tensions[0]}`]:[])];
    return `<article class="match-live-card"><div class="match-live-kicker">Introduction ${String(i+1).padStart(2,'0')}</div><h3>${escape(m.first_name||'Someone worth meeting')}</h3><div class="match-live-place">${escape(m.current_city||'Location private')}</div><div class="match-live-fit">${fitLabel(Number(m.score||0),Number(m.confidence||0))}</div><div class="match-live-reasons">${reasons.map(x=>`<div class="match-live-reason">${escape(x)}</div>`).join('')||'<div class="match-live-reason">Wonder sees enough compatibility to make this introduction worth exploring.</div>'}</div></article>`;
  }

  async function renderLive(){
    const s=read(),token=s.auth?.accessToken;
    if(!token){grid.innerHTML='<div class="match-live-empty"><h3>Your introductions will live here.</h3><p>Sign in and complete your Mirror before Wonder begins making introductions.</p></div>';return;}
    grid.innerHTML='<div class="match-live-empty"><h3>Wonder is looking for fit.</h3><p>Checking practical compatibility, values, relationship needs, and how each person tends to repair disconnection.</p></div>';
    try{
      const r=await fetch('/api/matches/generate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:'{}'});const d=await r.json().catch(()=>({}));
      if(r.status===409){grid.innerHTML='<div class="match-live-empty"><h3>First, let Wonder understand you.</h3><p>Complete your current Mirror before introductions begin. Wonder does not want to rank people from a half-built picture of you.</p></div>';return;}
      if(!r.ok)throw new Error('unavailable');
      if(!Array.isArray(d.matches)||!d.matches.length){grid.innerHTML='<div class="match-live-empty"><h3>No introduction just for the sake of one.</h3><p>Wonder has not found enough eligible people with completed profiles yet. As the private beta grows, this space will populate only when there is someone genuinely worth considering.</p></div>';return;}
      grid.innerHTML=d.matches.map(renderCard).join('');
    }catch{grid.innerHTML='<div class="match-live-empty"><h3>Introductions are still taking shape.</h3><p>Your profile is safe. Wonder will try again when the matching pool is ready.</p></div>';}
  }

  document.addEventListener('click',e=>{if(e.target.closest('[data-next="matches"]'))setTimeout(renderLive,80)},true);
  const observer=new MutationObserver(()=>{if(document.getElementById('matches')?.classList.contains('active'))renderLive();});
  observer.observe(document.getElementById('matches'),{attributes:true,attributeFilter:['class']});
})();