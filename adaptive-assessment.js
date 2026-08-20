(()=>{
 const KEY='wonder_assessment_v2';
 const getState=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
 const getA=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
 const saveA=a=>localStorage.setItem(KEY,JSON.stringify(a));
 const A=Object.assign({responses:{},history:[],sessionId:null,complete:false,cache:{},changedCounts:{}},getA());
 let current=null,selected=null,currentMeta={},booted=false,questionShownAt=Date.now();
 const $=id=>document.getElementById(id);
 const authToken=()=>getState()?.auth?.accessToken||null;
 const headers=()=>{const h={'Content-Type':'application/json'};const t=authToken();if(t)h.Authorization=`Bearer ${t}`;return h};
 const ELEMENT_COPY={Earth:'Reality · foundations',Water:'Emotion · attachment',Fire:'Desire · vitality',Air:'Mind · worldview',Ether:'Meaning · identity'};

 async function startSession(){
   if(!authToken())return;
   const r=await fetch('/api/assessment/start',{method:'POST',headers:headers(),body:JSON.stringify({questionnaire_version:'wonder-questionnaire-v2.2-elements'})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.error||'Wonder could not start your assessment.');
   const id=d.session?.id||null;
   if(id){
     const changedSession=A.sessionId&&A.sessionId!==id;
     A.sessionId=id;A.responses=d.responses||{};A.complete=false;A.snapshotSyncedAt=null;
     if(changedSession||d.resumed){A.history=[];A.cache={};}
     saveA(A);
   }
 }

 async function persist(itemId,response){
   if(!A.sessionId||!authToken())return true;
   const elapsed=Math.max(0,Date.now()-questionShownAt);
   const r=await fetch('/api/assessment/respond',{method:'POST',headers:headers(),body:JSON.stringify({session_id:A.sessionId,item_id:itemId,response,response_time_ms:elapsed,changed_count:Number(A.changedCounts?.[itemId]||0)})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.error||'Wonder could not save that response.');
   return true;
 }

 async function chooseNext(){
   const r=await fetch('/api/assessment/next',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({responses:A.responses})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.error||'Wonder could not choose the next question.');
   return d;
 }

 function phaseLabel(meta={}){const e=meta.element;return e?`${e} · ${ELEMENT_COPY[e]||''}`:(meta.phase==='precision'?'Looking closer':'Assessment')}
 function setProgress(count,target=36){const pct=Math.min(96,Math.max(4,(count/Math.max(35,target))*92));if($('progressBar'))$('progressBar').style.width=pct+'%'}
 function optionButton(label,i,active=false){return `<button class="option ${active?'selected':''}" data-i="${i}">${label}</button>`}

 function render(item,meta={},preserveTimer=false){
   if(!item){throw new Error('Wonder received an empty questionnaire item.');}
   current=item;currentMeta=meta||{};selected=A.responses[item.id]??null;if(!preserveTimer)questionShownAt=Date.now();
   A.cache=A.cache||{};A.cache[item.id]={item,meta};saveA(A);
   const element=meta.element||'Earth';
   if($('sectionLabel'))$('sectionLabel').textContent=phaseLabel(meta);
   if($('assessment'))$('assessment').dataset.element=element.toLowerCase();
   setProgress(meta.count||Object.keys(A.responses).length,meta.target_max||36);
   let body='';
   if(item.type==='single')body=`<div class="options">${item.options.map((o,i)=>optionButton(o.label,i,Number(selected)===i)).join('')}</div>`;
   if(item.type==='scale'){const n=Number(selected||0);body=`<div class="scale-wrap"><div class="scale-anchors"><span>${item.anchors?.[0]||'Not at all'}</span><span>${item.anchors?.[1]||'Extremely'}</span></div><div class="scale-options">${[1,2,3,4,5,6,7].map(v=>`<button class="scale-option ${n===v?'selected':''}" data-v="${v}">${v}</button>`).join('')}</div></div>`;}
   if(item.type==='multi'){const arr=Array.isArray(selected)?selected:[];body=`<div class="question-helper">Choose up to ${item.max||3}.</div><div class="options">${item.options.map((o,i)=>optionButton(o.label,i,arr.includes(i))).join('')}</div>`;}
   if(item.type==='rank'){const arr=Array.isArray(selected)?selected:[];body=`<div class="question-helper">Choose ${item.max||5} in priority order. Tap again to remove.</div><div class="rank-summary">${arr.length?arr.map((i,r)=>`<span>${r+1}. ${item.options[i].label}</span>`).join(''):'Your ranking will appear here.'}</div><div class="options compact-options">${item.options.map((o,i)=>optionButton(o.label,i,arr.includes(i))).join('')}</div>`;}
   $('questionMount').innerHTML=`<div class="element-marker"><span>${String(meta.element_index||1).padStart(2,'0')}</span><b>${element}</b><small>${ELEMENT_COPY[element]||''}</small></div><div class="question-title">${item.prompt}</div>${body}`;
   bindInputs(item);
   $('prevQuestion').style.visibility=A.history.length?'visible':'hidden';
   $('nextQuestion').style.visibility='visible';$('nextQuestion').textContent='Continue';
   updateContinue(item);
 }

 function rerenderSelection(item){
   const before=A.responses[item.id];
   if(before!==undefined&&JSON.stringify(before)!==JSON.stringify(selected))A.changedCounts[item.id]=Number(A.changedCounts[item.id]||0)+1;
   const keep=selected;render(item,currentMeta,true);selected=keep;
   if(item.type==='single')$('questionMount').querySelectorAll('.option').forEach(el=>el.classList.toggle('selected',Number(el.dataset.i)===Number(keep)));
   if(item.type==='scale')$('questionMount').querySelectorAll('.scale-option').forEach(el=>el.classList.toggle('selected',Number(el.dataset.v)===Number(keep)));
   if(item.type==='multi'||item.type==='rank'){const arr=Array.isArray(keep)?keep:[];$('questionMount').querySelectorAll('.option').forEach(el=>el.classList.toggle('selected',arr.includes(Number(el.dataset.i))));if(item.type==='rank'){const summary=$('questionMount').querySelector('.rank-summary');if(summary)summary.innerHTML=arr.length?arr.map((i,r)=>`<span>${r+1}. ${item.options[i].label}</span>`).join(''):'Your ranking will appear here.';}}
   selected=keep;updateContinue(item);saveA(A);
 }

 function bindInputs(item){
   if(item.type==='single')$('questionMount').querySelectorAll('.option').forEach(el=>el.onclick=()=>{selected=Number(el.dataset.i);rerenderSelection(item)});
   if(item.type==='scale')$('questionMount').querySelectorAll('.scale-option').forEach(el=>el.onclick=()=>{selected=Number(el.dataset.v);rerenderSelection(item)});
   if(item.type==='multi')$('questionMount').querySelectorAll('.option').forEach(el=>el.onclick=()=>{let arr=Array.isArray(selected)?[...selected]:[];const i=Number(el.dataset.i);if(arr.includes(i))arr=arr.filter(x=>x!==i);else if(arr.length<(item.max||3))arr.push(i);selected=arr;rerenderSelection(item)});
   if(item.type==='rank')$('questionMount').querySelectorAll('.option').forEach(el=>el.onclick=()=>{let arr=Array.isArray(selected)?[...selected]:[];const i=Number(el.dataset.i);if(arr.includes(i))arr=arr.filter(x=>x!==i);else if(arr.length<(item.max||5))arr.push(i);selected=arr;rerenderSelection(item)});
 }

 function valid(item){if(item.type==='single'||item.type==='scale')return selected!==null&&selected!==undefined;if(item.type==='multi')return Array.isArray(selected)&&selected.length>0;if(item.type==='rank')return Array.isArray(selected)&&selected.length===(item.max||5);return false}
 function updateContinue(item){const b=$('nextQuestion');if(b){b.disabled=!valid(item);b.style.opacity=valid(item)?'1':'.45'}}
 function setSaving(on){const b=$('nextQuestion');if(!b)return;b.disabled=on||!valid(current);b.textContent=on?'Saving…':'Continue';}

 async function next(){
   if(!current||!valid(current))return;setSaving(true);
   try{await persist(current.id,selected);A.responses[current.id]=selected;if(!A.history.length||A.history[A.history.length-1]!==current.id)A.history.push(current.id);saveA(A);const n=await chooseNext();if(n.complete){await finish(n);return}render(n.item,n);}catch(e){$('questionMount').insertAdjacentHTML('beforeend',`<p class="muted assessment-error">${String(e.message||'Wonder lost the thread for a moment.')}</p>`);setSaving(false);}
 }

 function back(){if(!A.history.length)return;const target=A.history.pop();const cached=A.cache?.[target];saveA(A);if(cached?.item)render(cached.item,cached.meta||{});else if(cached)render(cached,{phase:'element',element:'Earth',count:Object.keys(A.responses).length,target_max:36});}

 function dominant(d,keys){return keys.map(k=>[k,d[k]||0]).sort((a,b)=>b[1]-a[1])[0]}
 const names={cognitive_systemizing:'structured thinking',cognitive_contextual:'context-sensitive thinking',ambiguity_tolerance:'comfort with ambiguity',decisiveness:'decisiveness',novelty_orientation:'novelty',emotional_intensity:'emotional intensity',structure_preference:'structure',autonomy_need:'autonomy',closeness_need:'closeness',reassurance_need:'relational reassurance',vulnerability_openness:'vulnerability',conflict_directness:'directness in conflict',repair_orientation:'repair',reciprocity_sensitivity:'reciprocity',trust_baseline:'baseline trust',value_family:'family',value_achievement:'achievement',value_meaning:'meaning',value_freedom:'freedom',value_stability:'stability',value_knowledge:'knowledge',value_service:'service',value_influence:'influence',value_beauty:'beauty',value_loyalty:'loyalty'};
 function fallbackMirror(model,archetypes){const d=model.dimensions||{};const primary=archetypes[0],secondary=archetypes[1];const cog=dominant(d,['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness']);const rel=dominant(d,['autonomy_need','closeness_need','repair_orientation','reciprocity_sensitivity','trust_baseline']);const val=dominant(d,['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_knowledge','value_service','value_influence','value_beauty','value_loyalty']);return{primary,secondary,move:`Your responses lean toward ${names[cog[0]]}.`,drive:`Of the values Wonder measured, ${names[val[0]]} currently carries the strongest signal.`,relationship:`In relationships, ${names[rel[0]]} stands out.`,tension:'Wonder is still looking for the most meaningful tension in your profile.'};}
 function renderMirror(out){const m=out.mirror||fallbackMirror(out.model||{},out.archetypes||[]);const primary=m.primary||out.archetypes?.[0],secondary=m.secondary||out.archetypes?.[1];$('archetypeName').textContent='The '+(primary?.name||'Unfolding');$('archetypeNote').textContent=`Primary archetype${secondary?.name?` · ${secondary.name} influence`:''}`;$('mirrorMoveTitle').textContent=m.move_title||primary?.essence||'How you make sense of things';$('mirrorMove').textContent=m.move||'';$('mirrorDriveTitle').textContent=m.drive_title||'What carries weight';$('mirrorDrive').textContent=m.drive||'';$('mirrorRelTitle').textContent=m.relationship_title||'How connection works for you';$('mirrorRel').textContent=m.relationship||'';$('mirrorShadowTitle').textContent=m.tension_title||'A tension Wonder noticed';$('mirrorShadow').textContent=m.tension||'';const weak=Array.isArray(m.uncertain)?m.uncertain:Object.entries(out.model?.evidence||{}).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([k])=>names[k]||k);$('mirrorUncertain').textContent=weak.length?`Wonder has less evidence about ${weak.join(', ')}. Those remain open questions rather than settled traits.`:'The Mirror is a reflection of patterns across your choices, not a diagnosis. It remains open to correction.';}

 async function finish(){
   $('progressBar').style.width='100%';$('sectionLabel').textContent='Mirror · pattern beneath self-report';$('questionMount').innerHTML='<div class="question-title">The elements gathered the signals. The Mirror reveals the pattern.</div>';$('nextQuestion').style.visibility='hidden';$('prevQuestion').style.visibility='hidden';
   try{let out=null;if(A.sessionId&&authToken()){const r=await fetch('/api/assessment/complete',{method:'POST',headers:headers(),body:JSON.stringify({session_id:A.sessionId})});const d=await r.json().catch(()=>({}));if(r.ok)out=d;else if(r.status!==409)throw new Error(d.error||'Wonder could not finish the portrait yet.');}if(!out){const r=await fetch('/api/assessment-score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({responses:A.responses})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Wonder could not finish the portrait yet.');out=d;}A.complete=true;A.result=out;if(out.snapshot_id)A.snapshotSyncedAt=new Date().toISOString();saveA(A);const s=getState();s.archetype=(out.mirror?.primary?.name||out.archetypes?.[0]?.name||'Unfolding');s.assessmentV2=out;localStorage.setItem('wonder_preview_state',JSON.stringify(s));renderMirror(out);setTimeout(()=>window.show?window.show('mirror'):document.querySelector('#mirror')?.classList.add('active'),700);}catch(e){$('questionMount').innerHTML=`<div class="question-title">Your answers are safe, but Wonder could not finish the portrait yet.</div><p class="muted">${String(e.message||'Try again in a moment.')}</p>`;}
 }

 async function boot(){
   if(booted)return;booted=true;
   try{await startSession();const n=await chooseNext();if(n.complete){await finish();return}render(n.item,n);}catch(e){booted=false;$('questionMount').innerHTML=`<div class="question-title">Wonder could not begin the assessment.</div><p class="muted">${String(e.message||'Try again in a moment.')}</p>`;}
 }

 const nextBtn=$('nextQuestion'),prevBtn=$('prevQuestion');if(nextBtn)nextBtn.onclick=next;if(prevBtn)prevBtn.onclick=back;
 window.startWonderAssessment=boot;
 document.addEventListener('wonder:assessment-enter',boot);
 const observer=new MutationObserver(()=>{if($('assessment')?.classList.contains('active'))boot()});if($('assessment'))observer.observe($('assessment'),{attributes:true,attributeFilter:['class']});
 setInterval(()=>{if($('assessment')?.classList.contains('active')&&!current&&!booted)boot()},700);
 if($('assessment')?.classList.contains('active'))boot();
})();