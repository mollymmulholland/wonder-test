(()=>{
  const $=id=>document.getElementById(id);
  const state=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}};
  const save=s=>{try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}};
  const email=$('accountEmail'),phone=$('accountPhone'),password=$('accountPassword'),btn=$('accountContinue'),status=$('accountStatus');
  if(!email||!phone||!password||!btn)return;

  let toggle=$('accountModeToggle');
  if(!toggle){toggle=document.createElement('button');toggle.id='accountModeToggle';toggle.type='button';toggle.className='account-mode-toggle';toggle.textContent='Already have an account? Sign in';const actions=btn.closest('.actions');if(actions)actions.insertAdjacentElement('afterend',toggle);const style=document.createElement('style');style.textContent='.account-mode-toggle{display:block;margin:18px auto 0;border:0;background:transparent;color:inherit;font:inherit;font-size:13px;letter-spacing:.04em;text-decoration:underline;text-underline-offset:4px;opacity:.68;padding:8px}.account-mode-toggle:active{opacity:1}';document.head.appendChild(style);}
  let mode='create';const phoneLabel=phone.closest('label');const existing=state();if(existing.account){email.value=existing.account.email||'';phone.value=existing.account.phone||'';}
  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),normalizePhone=v=>v.replace(/[^\d+]/g,'');
  const showStatus=text=>{if(!status)return;status.textContent=text||'';status.style.display=text?'block':'none';};
  function setMode(next){mode=next;if(phoneLabel)phoneLabel.style.display=mode==='signin'?'none':'';btn.textContent=mode==='signin'?'Sign in':'Create account';toggle.textContent=mode==='signin'?'New to Wonder? Create an account':'Already have an account? Sign in';showStatus('');}
  toggle.onclick=()=>setMode(mode==='signin'?'create':'signin');

  function resetUserScopedState(userId){
    const previous=state(),previousId=previous.account?.id||null;
    if(previousId&&previousId===userId)return;
    const clean={};
    // Authentication/account identity is written immediately after this reset. Everything
    // below belongs to a specific person and must never leak between accounts on one device.
    localStorage.setItem('wonder_preview_state',JSON.stringify(clean));
    localStorage.removeItem('wonder_assessment_v2');
    localStorage.removeItem('wonder_place_meta');
    try{localStorage.removeItem('wonder_match_state_v2')}catch{}
  }
  function saveSession(data,{fallbackEmail='',fallbackPhone=''}={}){
    const u=data.user||{};if(u.id)resetUserScopedState(u.id);
    const current=state();current.account={...(current.account||{}),id:u.id||current.account?.id||null,email:u.email||fallbackEmail||current.account?.email||'',phone:u.user_metadata?.phone||fallbackPhone||current.account?.phone||'',emailVerified:!!u.email_confirmed_at,phoneVerified:false,persistence:'supabase',createdAt:u.created_at||current.account?.createdAt||new Date().toISOString()};
    if(data.access_token){const seconds=Number(data.expires_in||3600);current.auth={accessToken:data.access_token,refreshToken:data.refresh_token||current.auth?.refreshToken||null,expiresIn:seconds,savedAt:Date.now(),expiresAt:Date.now()+seconds*1000};}save(current);window.dispatchEvent(new CustomEvent('wonder-auth-updated'));
  }
  function cloudTarget(){const s=state();let a={};try{a=JSON.parse(localStorage.getItem('wonder_assessment_v2')||'{}')}catch{}if(a.sessionId&&!a.complete)return'assessment';if(a.complete&&s.assessmentV2)return'mirror';if(s.essentials&&Object.values(s.essentials).some(Boolean))return'visual';if(s.birth&&(s.birth.dob||s.birth.pob||s.birth.tob))return'essentials';return'birth';}
  async function hydrateFromCloud(){
    const current=state(),token=current.auth?.accessToken;if(!token)return null;
    try{const r=await fetch('/api/persist',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({action:'hydrate'})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Unable to restore your Wonder account.');const s=state();
      // Hydration is authoritative for the signed-in user. Absence means this account has not
      // completed that stage; never preserve another account's local data as a fallback.
      if(d.birth)s.birth={dob:d.birth.date_of_birth||'',tob:d.birth.time_of_birth||'',pob:d.birth.place_of_birth||'',toa:d.birth.time_accuracy||'Exact'};else delete s.birth;
      if(d.profile)s.essentials={firstName:d.profile.first_name||'',currentCity:d.profile.current_city||'',gender:d.profile.gender||'',interested:d.profile.interested_in||'',intent:d.profile.relationship_intention||'',structure:d.profile.relationship_structure||'Monogamy',children:d.profile.children||'',religion:d.profile.religion||'',ageRange:d.profile.age_range||'',distance:d.profile.max_distance||'25 miles',nonnegotiables:d.profile.nonnegotiables||''};else delete s.essentials;
      const placeMeta={};if(d.birth?.location_data&&Object.keys(d.birth.location_data).length)placeMeta.birthplace=d.birth.location_data;if(d.profile?.location_data&&Object.keys(d.profile.location_data).length)placeMeta.current_city=d.profile.location_data;if(Object.keys(placeMeta).length)localStorage.setItem('wonder_place_meta',JSON.stringify(placeMeta));else localStorage.removeItem('wonder_place_meta');
      if(d.assessment){s.assessmentV2=d.assessment;s.archetype=d.assessment.mirror?.primary?.name||d.assessment.archetypes?.[0]?.name||null;}else{delete s.assessmentV2;delete s.archetype;delete s.accuracy;delete s.correction;}
      save(s);
      if(d.active_assessment?.session){localStorage.setItem('wonder_assessment_v2',JSON.stringify({responses:d.active_assessment.responses||{},history:[],sessionId:d.active_assessment.session.id,complete:false,cache:{},changedCounts:{}}));}
      else if(d.assessment){localStorage.setItem('wonder_assessment_v2',JSON.stringify({responses:{},history:[],sessionId:d.assessment.assessment_session_id||null,complete:true,cache:{},changedCounts:{},result:d.assessment,snapshotSyncedAt:d.assessment.created_at||new Date().toISOString()}));}
      else localStorage.removeItem('wonder_assessment_v2');
      window.dispatchEvent(new CustomEvent('wonder-auth-updated'));return d;
    }catch(e){console.warn('Wonder cloud hydrate',e);return null;}
  }
  async function refreshSession(force=false){const s=state(),auth=s.auth||{};if(!auth.refreshToken)return false;const expiresAt=Number(auth.expiresAt||((auth.savedAt||0)+(Number(auth.expiresIn||3600)*1000)));if(!force&&auth.accessToken&&expiresAt-Date.now()>5*60*1000)return true;try{const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'refresh',refresh_token:auth.refreshToken})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Session expired.');saveSession(d);return true;}catch{const current=state();delete current.auth;save(current);window.dispatchEvent(new CustomEvent('wonder-auth-updated'));return false;}}
  btn.onclick=async()=>{const e=email.value.trim().toLowerCase(),p=normalizePhone(phone.value.trim()),pw=password.value;if(!validEmail(e)){showStatus('Enter a valid email address.');email.focus();return;}if(mode==='create'&&p.replace(/\D/g,'').length<10){showStatus('Enter a valid phone number.');phone.focus();return;}if(pw.length<8){showStatus('Use a password with at least 8 characters.');password.focus();return;}btn.disabled=true;showStatus(mode==='signin'?'Signing you in…':'Creating your Wonder account…');try{const response=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,email:e,phone:p,password:pw})});const data=await response.json().catch(()=>({}));if(!response.ok){if(data.code==='account_exists'){setMode('signin');throw new Error('That account already exists. Enter your password to sign in.');}throw new Error(data.error||'Unable to continue.');}saveSession(data,{fallbackEmail:e,fallbackPhone:p});password.value='';showStatus(mode==='signin'?'Restoring your Wonder…':'Account created.');await hydrateFromCloud();const target=cloudTarget();showStatus(mode==='signin'?'Welcome back.':'Account created.');setTimeout(()=>show(target),180);}catch(err){showStatus(err.message||'Unable to continue.');}finally{btn.disabled=false;}};
  refreshSession(false);window.addEventListener('focus',()=>refreshSession(false));setInterval(()=>refreshSession(false),10*60*1000);
})();