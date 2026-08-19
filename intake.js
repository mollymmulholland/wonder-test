(()=>{
  const $=id=>document.getElementById(id);
  const readState=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}};
  const previewState=readState();
  const persist=()=>{
    // Merge with the latest stored state so account/auth created after this script loaded
    // are never erased by later Origin / Essentials saves.
    const latest=readState();
    const safe={...latest,...previewState};
    if(latest.account) safe.account=latest.account;
    if(latest.auth) safe.auth=latest.auth;
    if(latest.cloud) safe.cloud=latest.cloud;
    // Never persist image blobs/data URLs. Mobile Safari localStorage is intentionally small.
    delete safe.photos;
    try{localStorage.setItem('wonder_preview_state',JSON.stringify(safe));}catch(e){console.warn('Wonder preview state could not be saved',e);}
  };

  // Image data lives only for this browser tab/session and is never uploaded by this preview.
  window.wonderPhotoUrls=window.wonderPhotoUrls||{};

  const birthBtn=$('birthContinue');
  if(birthBtn){
    birthBtn.onclick=()=>{
      previewState.birth={dob:$('dob').value,tob:$('tob').value,pob:$('pob').value.trim(),toa:$('toa').value};
      persist();
      show('essentials');
      $('phaseLabel').textContent='Essentials';
    };
  }

  const fields=['firstName','currentCity','gender','interested','intent','structure','children','religion','ageRange','distance','nonnegotiables'];
  const savedEssentials=previewState.essentials||{};
  fields.forEach(id=>{ if($(id) && savedEssentials[id]!==undefined) $(id).value=savedEssentials[id]; });

  const essentialsBtn=$('essentialsContinue');
  if(essentialsBtn){
    essentialsBtn.onclick=()=>{
      previewState.essentials={};
      fields.forEach(id=>previewState.essentials[id]=$(id)?.value||'');
      persist();
      show('visual');
      $('phaseLabel').textContent='Presence';
    };
  }

  document.querySelectorAll('.photoInput').forEach(input=>{
    const slot=input.dataset.slot;
    const target=$('preview-'+slot);
    input.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(!file)return;
      if(!file.type.startsWith('image/')){alert('Please choose an image file.');input.value='';return;}

      // Object URLs avoid base64 expansion and localStorage quota failures on iPhone.
      const prior=window.wonderPhotoUrls[slot];
      if(prior) URL.revokeObjectURL(prior);
      const url=URL.createObjectURL(file);
      window.wonderPhotoUrls[slot]=url;
      if(target){
        target.style.backgroundImage=`url("${url}")`;
        target.textContent='';
        target.classList.add('has-photo');
      }
      previewState.photoSlots=previewState.photoSlots||{};
      previewState.photoSlots[slot]=true;
      persist();
      updateVisualStatus();
    });
  });

  function updateVisualStatus(){
    const n=Object.keys(window.wonderPhotoUrls).length;
    const status=$('visualStatus');
    if(status) status.textContent=n===0?'Optional for this preview. You can continue without photos.':n===1?'1 of 3 references added.':`${n} of 3 references added.`;
  }
  updateVisualStatus();

  const visualBtn=$('visualContinue');
  if(visualBtn){
    visualBtn.onclick=()=>{
      const hasPhotos=Object.keys(window.wonderPhotoUrls).length>0;
      if(hasPhotos && !$('visualConsent').checked){alert('Please confirm the visual-data notice before continuing with selected photos.');return;}
      previewState.visualConsent=hasPhotos?!!$('visualConsent').checked:false;
      persist();
      show('assessment');
      $('phaseLabel').textContent='Assessment';
    };
  }

  const skipVisual=$('skipVisual');
  if(skipVisual){
    skipVisual.onclick=()=>{
      previewState.visualSkipped=true;
      persist();
      show('assessment');
      $('phaseLabel').textContent='Assessment';
    };
  }

  const restoreIntake=()=>{
    const current=readState();
    const b=current.birth||{};
    if($('dob'))$('dob').value=b.dob||'';
    if($('tob'))$('tob').value=b.tob||'';
    if($('pob'))$('pob').value=b.pob||'';
    if($('toa'))$('toa').value=b.toa||'Exact';
    if($('visualConsent'))$('visualConsent').checked=!!current.visualConsent;
  };
  restoreIntake();

  function buildProfile(){
    const current=readState();
    const e=current.essentials||{};
    const archetype=current.archetype||'Architect';
    const name=e.firstName||'You';
    $('profileName').textContent=name;
    $('profileArchetype').textContent=`The ${archetype} · Wonder portrait`;
    $('profileSummary').textContent=`${name} is presented through pattern, context, and intention rather than a stack of prompts. This portrait will become richer as Wonder learns from reflection, conversation, and real choices.`;
    const facts=[];
    if(e.currentCity)facts.push(e.currentCity);
    if(e.intent)facts.push(e.intent);
    if(e.structure)facts.push(e.structure);
    if(e.children)facts.push(e.children);
    $('profileFacts').innerHTML=facts.map(x=>`<span>${x}</span>`).join('');
    const insightMap={Architect:'You seem most alive when complexity can be shaped into something coherent. You value depth, but not at the cost of self-direction.',Seer:'You appear to notice subtext, pattern, and possibility before most people do. Understanding matters more to you than convention.',Explorer:'Freedom and aliveness seem central to how you orient. You are likely to connect best with people who expand rather than contain you.',Sovereign:'Agency, competence, and influence appear central to your identity. You are likely to respect people who possess a strong center of their own.',Alchemist:'You seem drawn toward intensity, symbolism, and experiences that change you. Surface compatibility is unlikely to satisfy you.',Devotee:'Connection carries unusual psychological weight for you. Loyalty and emotional significance may matter more than novelty alone.',Guardian:'You create safety through consistency and responsibility. Trust likely matters more to you than performance.',Maverick:'You preserve independence even when conformity would make life easier. Authenticity appears to outrank social approval.'};
    $('profileInsight').textContent=insightMap[archetype]||insightMap.Architect;
    $('profileIntent').textContent=e.intent?`${e.intent}${e.nonnegotiables?`. Non-negotiables: ${e.nonnegotiables}`:''}`:'Wonder is still learning what kind of relationship you are building toward.';
    const photo=window.wonderPhotoUrls.smile||window.wonderPhotoUrls.front||window.wonderPhotoUrls.angle;
    const photoBox=$('profilePhoto');
    if(photo){photoBox.style.backgroundImage=`url("${photo}")`;photoBox.classList.add('has-profile-photo');photoBox.innerHTML='';}
  }

  const profileTile=$('profileTile');
  if(profileTile){profileTile.onclick=()=>{buildProfile();show('profile');$('phaseLabel').textContent='Your portrait';};}

  window.addEventListener('storage',restoreIntake);
})();