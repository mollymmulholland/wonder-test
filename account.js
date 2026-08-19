(()=>{
  const $=id=>document.getElementById(id);
  const state=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}};
  const save=s=>{try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}};
  const email=$('accountEmail'), phone=$('accountPhone'), password=$('accountPassword'), btn=$('accountContinue'), status=$('accountStatus');
  if(!email||!phone||!password||!btn) return;

  const s=state();
  if(s.account){email.value=s.account.email||'';phone.value=s.account.phone||'';}

  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const normalizePhone=v=>v.replace(/[^\d+]/g,'');

  btn.onclick=async()=>{
    const e=email.value.trim().toLowerCase();
    const p=normalizePhone(phone.value.trim());
    const pw=password.value;
    if(!validEmail(e)){status.textContent='Enter a valid email address.';email.focus();return;}
    if(p.replace(/\D/g,'').length<10){status.textContent='Enter a valid phone number.';phone.focus();return;}
    if(pw.length<8){status.textContent='Use a password with at least 8 characters.';password.focus();return;}

    btn.disabled=true;
    status.textContent='Creating your private Wonder account…';

    try{
      const response=await fetch('/api/signup',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:e,phone:p,password:pw})
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Unable to create account.');

      const current=state();
      current.account={
        id:data.user?.id||null,
        email:e,
        phone:p,
        emailVerified:!!data.user?.email_confirmed_at,
        phoneVerified:false,
        persistence:'supabase',
        createdAt:data.user?.created_at||new Date().toISOString()
      };
      if(data.access_token){
        current.auth={
          accessToken:data.access_token,
          refreshToken:data.refresh_token||null,
          expiresIn:data.expires_in||null,
          savedAt:Date.now()
        };
      }
      save(current);

      if(data.needs_email_confirmation){
        status.textContent='Account created. Check your email to confirm it, then you can continue.';
      }else{
        status.textContent='Account created securely.';
      }
      setTimeout(()=>show('birth'),350);
    }catch(err){
      status.textContent=err.message||'Unable to create account.';
    }finally{
      btn.disabled=false;
    }
  };
})();