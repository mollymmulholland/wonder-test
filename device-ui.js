/* Device verification is delegated to the browser's WebAuthn implementation. */
window.WonderDevices = function({state,api,esc,mount,page,heading,statusEl,error,toast,go,hydrate}) {
  let keys=[];
  const request=(action,extra={})=>api('/api/passkeys',{action,...extra},false);
  const library=()=>import('/vendor/webauthn/index.js');
  async function render(){
    if(state.mode==='demo')throw new Error('Device credentials are available only for a real, verified account.');
    const data=await request('list');keys=data.keys;
    mount(page(`${heading('Account / Secure return','A familiar way<br><em>to return.</em>')}
      <div class="reading-column"><p>Use a passkey to return with Face ID, Touch ID, or the secure unlock supported by your device. WONDER receives a cryptographic signature, never your biometric data.</p>
      <p class="small muted">Passkeys belong to this WONDER address: ${esc(data.origin)}. Your email or username and password remain available.</p>${statusEl()}
      <form id="device-username"><label class="field">Username<input name="username" value="${esc(data.username||'')}" autocomplete="username" pattern="[a-zA-Z][a-zA-Z0-9_]{2,29}" maxlength="30" required autocapitalize="none"></label><button class="btn secondary">Save username</button></form>
      <h3>Your registered passkeys</h3>${keys.length?keys.map(k=>`<article class="memory"><p>${esc(k.label)}</p><p class="small muted">${esc(k.rp_id)} · Added ${esc(new Date(k.created_at).toLocaleDateString())}</p><button class="text-btn" data-device="remove" data-key="${esc(k.credential_id)}">Remove passkey</button></article>`).join(''):'<p>No passkeys added yet.</p>'}
      <form id="device-register"><label class="field">Name this device<input name="label" placeholder="My iPhone" maxlength="80" required></label><label class="field">Confirm your password<input name="password" type="password" autocomplete="current-password" required minlength="10" maxlength="128"></label><button class="btn">Add a passkey</button></form>
      <p class="small muted">Your device may sync a passkey through its own credential provider. WONDER does not control that provider. Add passkeys only on devices and accounts you trust.</p>
      <button class="text-btn" data-action="settings">Back to Account</button></div>`));
  }
  function explain(e){return ['NotAllowedError','AbortError'].includes(e.name)?'Device verification was cancelled or timed out. Your password still works.':e.message||'This browser cannot use a passkey. Sign in with your password.';}
  async function signin(){
    const W=await library();if(!W.browserSupportsWebAuthn())throw new Error('This browser does not support passkeys. Use your username or email and password.');
    const {options}=await request('authentication_options');
    const response=await W.startAuthentication({optionsJSON:options});
    const session=await request('authentication_verify',{response});
    Object.assign(state,{mode:'beta',user:session.user,report:null,assessment:null});
    await hydrate();await go(state.report?'home':'threshold');
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-device]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();
    if(b.dataset.device==='remove'){
      const key=keys.find(k=>k.credential_id===b.dataset.key);if(!key)return;
      mount(page(`${heading('Account / Passkeys','Remove this <em>passkey.</em>')}<div class="reading-column"><p>${esc(key.label)} will no longer unlock this account. You can still sign in with your password.</p>${statusEl()}<form id="device-remove"><input type="hidden" name="id" value="${esc(key.credential_id)}"><label class="field">Confirm your password<input name="password" type="password" autocomplete="current-password" minlength="10" required maxlength="128"></label><button class="btn">Remove passkey</button></form><button class="text-btn" data-device="back">Cancel</button></div>`));return;
    }
    b.disabled=true;(b.dataset.device==='signin'?signin():render()).catch(x=>error(explain(x))).finally(()=>b.disabled=false);
  },true);
  document.addEventListener('submit',e=>{
    if(!['device-register','device-remove','device-username'].includes(e.target.id))return;
    e.preventDefault();e.stopImmediatePropagation();const form=e.target,b=form.querySelector('button');if(b.disabled)return;b.disabled=true;
    const p=Object.fromEntries(new FormData(form));
    (async()=>{
      if(form.id==='device-register'){
        const W=await library();if(!W.browserSupportsWebAuthn())throw new Error('This browser does not support passkeys.');
        const {options}=await request('registration_options',{password:p.password});form.elements.password.value='';
        const response=await W.startRegistration({optionsJSON:options});await request('registration_verify',{response,label:p.label});toast('Passkey added.');
      }else if(form.id==='device-remove'){await request('remove',p);toast('Passkey removed.');}
      else {await request('username',p);toast('Username saved.');}
      await render();
    })().catch(x=>error(explain(x))).finally(()=>{b.disabled=false;if(form.elements.password)form.elements.password.value='';});
  },true);
  return {render};
};
