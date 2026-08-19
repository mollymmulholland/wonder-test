(()=>{
  const $=id=>document.getElementById(id);
  const previewState=JSON.parse(localStorage.getItem('wonder_preview_state')||'{}');
  const persist=()=>localStorage.setItem('wonder_preview_state',JSON.stringify(previewState));

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

  previewState.photos=previewState.photos||{};
  document.querySelectorAll('.photoInput').forEach(input=>{
    const slot=input.dataset.slot;
    const target=$('preview-'+slot);
    const prior=previewState.photos[slot];
    if(prior && target){target.style.backgroundImage=`url(${prior})`;target.textContent='';target.classList.add('has-photo');}
    input.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(!file)return;
      if(file.size>3500000){alert('For this preview, please choose an image under 3.5 MB.');input.value='';return;}
      const reader=new FileReader();
      reader.onload=()=>{
        const data=String(reader.result);
        previewState.photos[slot]=data;
        persist();
        if(target){target.style.backgroundImage=`url(${data})`;target.textContent='';target.classList.add('has-photo');}
      };
      reader.readAsDataURL(file);
    });
  });

  const visualBtn=$('visualContinue');
  if(visualBtn){
    visualBtn.onclick=()=>{
      if(!$('visualConsent').checked){alert('Please confirm the local-storage notice before continuing.');return;}
      previewState.visualConsent=true;persist();show('assessment');$('phaseLabel').textContent='Assessment';
    };
  }

  const restoreIntake=()=>{
    const b=previewState.birth||{};
    if($('dob'))$('dob').value=b.dob||'';
    if($('tob'))$('tob').value=b.tob||'';
    if($('pob'))$('pob').value=b.pob||'';
    if($('toa'))$('toa').value=b.toa||'Exact';
    if($('visualConsent'))$('visualConsent').checked=!!previewState.visualConsent;
  };
  restoreIntake();

  function buildProfile(){
    const e=previewState.essentials||{};
    const archetype=previewState.archetype||'Architect';
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
    const photo=previewState.photos?.smile||previewState.photos?.front;
    const photoBox=$('profilePhoto');
    if(photo){photoBox.style.backgroundImage=`url(${photo})`;photoBox.classList.add('has-profile-photo');photoBox.innerHTML='';}
  }

  const profileTile=$('profileTile');
  if(profileTile){profileTile.onclick=()=>{buildProfile();show('profile');$('phaseLabel').textContent='Your portrait';};}

  window.addEventListener('storage',restoreIntake);
})();