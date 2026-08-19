(()=>{
  const $=id=>document.getElementById(id);
  const state=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}};
  const save=s=>{try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}};
  const email=$('accountEmail'),phone=$('accountPhone'),password=$('accountPassword'),btn=$('accountContinue'),status=$('accountStatus'),toggle=$('accountModeToggle');
  if(!email||!phone||!password||!btn)return;

  let mode='create';
  const phoneLabel=phone.closest('label');
  const existing=state();
  if(existing.account){email.value=existing.account.email||'';phone.value=existing.account.phone||'';}

  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const normalizePhone=v=>v.replace(/[^\d+]/g,'');
  const showStatus=text=>{if(!status)return;status.textContent=text||'';status.style.display=text?'block':'none';};
  function setMode(next){
    mode=next;
    if(phoneLabel)phoneLabel.style.display=mode==='signin'?'none':'';
    btn.textContent=mode==='signin'?'Sign in':'Create account';
    if(toggle)toggle.textContent=mode==='signin'?'New to Wonder? Create an account':'Already have an account? Sign in';
    showStatus('');
  }
  if(toggle)toggle.onclick=()=>setMode(mode==='signin'?'create':'signin');

  function saveSession(data,{fallbackEmail='',fallbackPhone=''}={}){
    const current=state(),u=data.user||{};
    current.account={
      ...(current.account||{}),
      id:u.id||current.account?.id||null,
      email:u.email||fallbackEmail||current.account?.email||'',
      phone:u.user_metadata?.phone||fallbackPhone||current.account?.phone||'',
      emailVerified:!!u.email_confirmed_at,
      phoneVerified:false,
      persistence:'supabase',
      createdAt:u.created_at||current.account?.createdAt||new Date().toISOString()
    };
    if(data.access_token){
      const seconds=Number(data.expires_in||3600);
      current.auth={accessToken:data.access_token,refreshToken:data.refresh_token||current.auth?.refreshToken||null,expiresIn:seconds,savedAt:Date.now(),expiresAt:Date.now()+seconds*1000};
    }
    save(current);
    window.dispatchEvent(new CustomEvent('wonder-auth-updated'));
  }

  async function refreshSession(force=false){
    const s=state(),auth=s.auth||{};
    if(!auth.refreshToken)return false;
    const expiresAt=Number(auth.expiresAt||((auth.savedAt||0)+(Number(auth.expiresIn||3600)*1000)));
    if(!force&&auth.accessToken&&expiresAt-Date.now()>5*60*1000)return true;
    try{
      const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'refresh',refresh_token:auth.refreshToken})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Session expired.');
      saveSession(d);return true;
    }catch{
      const current=state();delete current.auth;save(current);window.dispatchEvent(new CustomEvent('wonder-auth-updated'));return false;
    }
  }

  btn.onclick=async()=>{
    const e=email.value.trim().toLowerCase(),p=normalizePhone(phone.value.trim()),pw=password.value;
    if(!validEmail(e)){showStatus('Enter a valid email address.');email.focus();return;}
    if(mode==='create'&&p.replace(/\D/g,'').length<10){showStatus('Enter a valid phone number.');phone.focus();return;}
    if(pw.length<8){showStatus('Use a password with at least 8 characters.');password.focus();return;}

    btn.disabled=true;showStatus(mode==='signin'?'Signing you in…':'Creating your Wonder account…');
    try{
      const response=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,email:e,phone:p,password:pw})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        if(data.code==='account_exists'){setMode('signin');throw new Error('That account already exists. Enter your password to sign in.');}
        throw new Error(data.error||'Unable to continue.');
      }
      saveSession(data,{fallbackEmail:e,fallbackPhone:p});
      showStatus(mode==='signin'?'Welcome back.':'Account created.');
      password.value='';
      setTimeout(()=>show('birth'),220);
    }catch(err){showStatus(err.message||'Unable to continue.');}
    finally{btn.disabled=false;}
  };

  refreshSession(false);
  window.addEventListener('focus',()=>refreshSession(false));
  setInterval(()=>refreshSession(false),10*60*1000);
})();