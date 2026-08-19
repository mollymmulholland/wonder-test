(()=>{
  const $=id=>document.getElementById(id);
  const state=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}};
  const save=s=>{try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}};
  const email=$('accountEmail'), phone=$('accountPhone'), btn=$('accountContinue'), status=$('accountStatus');
  if(!email||!phone||!btn) return;

  const s=state();
  if(s.account){email.value=s.account.email||'';phone.value=s.account.phone||'';}

  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const normalizePhone=v=>v.replace(/[^\d+]/g,'');

  btn.onclick=()=>{
    const e=email.value.trim().toLowerCase();
    const p=normalizePhone(phone.value.trim());
    if(!validEmail(e)){status.textContent='Enter a valid email address.';email.focus();return;}
    if(p.replace(/\D/g,'').length<10){status.textContent='Enter a valid phone number.';phone.focus();return;}

    const current=state();
    current.account={
      id:current.account?.id||crypto.randomUUID(),
      email:e,
      phone:p,
      emailVerified:false,
      phoneVerified:false,
      persistence:'local-preview',
      createdAt:current.account?.createdAt||new Date().toISOString()
    };
    save(current);
    status.textContent='Preview account created on this device.';
    setTimeout(()=>show('birth'),150);
  };
})();