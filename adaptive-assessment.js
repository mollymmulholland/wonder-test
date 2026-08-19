(()=>{
 const KEY='wonder_assessment_v2';
 const getState=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
 const getA=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
 const saveA=a=>localStorage.setItem(KEY,JSON.stringify(a));
 const A=Object.assign({responses:{},history:[],cursor:-1,sessionId:null,complete:false},getA());
 let current=null,selected=null,booted=false;
 const $=id=>document.getElementById(id);
 const authToken=()=>getState()?.auth?.accessToken||null;
 const headers=()=>{const h={'Content-Type':'application/json'};const t=authToken();if(t)h.Authorization=`Bearer ${t}`;return h};

 async function startSession(){
   if(A.sessionId||!authToken())return;
   try{const r=await fetch('/api/assessment/start',{method:'POST',headers:headers(),body:JSON.stringify({questionnaire_version:'wonder-questionnaire-v2.1'})});if(r.ok){const d=await r.json();A.sessionId=d.session?.id||null;saveA(A)}}catch{}
 }
 async function persist(itemId,response){
   if(!A.sessionId||!authToken())return;
   try{await fetch('/api/assessment/respond',{method:'POST',headers:headers(),body:JSON.stringify({session_id:A.sessionId,item_id:itemId,response})})}catch{}
 }
 async function chooseNext(){
   const r=await fetch('/api/assessment/next',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({responses:A.responses})});
   if(!r.ok)throw new Error('Wonder could not choose the next question.');
   return r.json();
 }
 function phaseLabel(p){return p==='core'?'Understanding you':p==='precision'?'Looking closer':p==='coverage'?'Filling in the picture':'Assessment'}
 function setProgress(count){const pct=Math.min(96,Math.max(4,(count/28)*82));if($('progressBar'))$('progressBar').style.width=pct+'%'}
 function optionButton(label,i,active=false){return `<button class="option ${active?'selected':''}" data-i="${i}">${label}</button>`}
 function render(item,meta={}){
   current=item;selected=A.responses[item.id]??null;
   $('sectionLabel').textContent=phaseLabel(meta.phase);
   setProgress(meta.count||Object.keys(A.responses).length);
   let body='';
   if(item.type==='single')body=`<div class="options">${item.options.map((o,i)=>optionButton(o.label,i,Number(selected)===i)).join('')}</div>`;
   if(item.type==='scale'){
     const n=Number(selected||0);body=`<div class="scale-wrap"><div class="scale-anchors"><span>${item.anchors?.[0]||'Not at all'}</span><span>${item.anchors?.[1]||'Extremely'}</span></div><div class="scale-options">${[1,2,3,4,5,6,7].map(v=>`<button class="scale-option ${n===v?'selected':''}" data-v="${v}">${v}</button>`).join('')}</div></div>`;
   }
   if(item.type==='multi'){
     const arr=Array.isArray(selected)?selected:[];body=`<div class="question-helper">Choose up to ${item.max||3}.</div><div class="options">${item.options.map((o,i)=>optionButton(o.label,i,arr.includes(i))).join('')}</div>`;
   }
   if(item.type==='rank'){
     const arr=Array.isArray(selected)?selected:[];body=`<div class="question-helper">Choose ${item.max||5} in priority order. Tap again to remove.</div><div class="rank-summary">${arr.length?arr.map((i,r)=>`<span>${r+1}. ${item.options[i].label}</span>`).join(''):'Your ranking will appear here.'}</div><div class="options compact-options">${item.options.map((o,i)=>optionButton(o.label,i,arr.includes(i))).join('')}</div>`;
   }
   $('questionMount').innerHTML=`<div class="question-title">${item.prompt}</div>${body}`;
   bindInputs(item);
   $('prevQuestion').style.visibility=A.history.length?'visible':'hidden';
   $('nextQuestion').textContent='Continue';
   updateContinue(item);
 }
 function bindInputs(item){
   if(item.type==='single')$('questionMount').querySelectorAll('.option').forEach(el=>el.onclick=()=>{selected=Number(el.dataset.i);render(item,{phase:'core',count:Object.keys(A.responses).length})});
   if(item.type==='scale')$('questionMount').querySelectorAll('.scale-option').forEach(el=>el.onclick=()=>{selected=Number(el.dataset.v);render(item,{phase:'core',count:Object.keys(A.responses).length})});
   if(item.type==='multi')$('questionMount').querySelectorAll('.option').forEach(el=>el.onclick=()=>{let arr=Array.isArray(selected)?[...selected]:[];const i=Number(el.dataset.i);if(arr.includes(i))arr=arr.filter(x=>x!==i);else if(arr.length<(item.max||3))arr.push(i);selected=arr;render(item,{phase:'core',count:Object.keys(A.responses).length})});
   if(item.type==='rank')$('questionMount').querySelectorAll('.option').forEach(el=>el.onclick=()=>{let arr=Array.isArray(selected)?[...selected]:[];const i=Number(el.dataset.i);if(arr.includes(i))arr=arr.filter(x=>x!==i);else if(arr.length<(item.max||5))arr.push(i);selected=arr;render(item,{phase:'core',count:Object.keys(A.responses).length})});
 }
 function valid(item){if(item.type==='single'||item.type==='scale')return selected!==null&&selected!==undefined;if(item.type==='multi')return Array.isArray(selected)&&selected.length>0;if(item.type==='rank')return Array.isArray(selected)&&selected.length===(item.max||5);return false}
 function updateContinue(item){const b=$('nextQuestion');if(b){b.disabled=!valid(item);b.style.opacity=valid(item)?'1':'.45'}}

 async function next(){
   if(!current||!valid(current))return;
   A.responses[current.id]=selected;await persist(current.id,selected);
   if(!A.history.length||A.history[A.history.length-1]!==current.id)A.history.push(current.id);
   saveA(A);
   try{
     const n=await chooseNext();
     if(n.complete){await finish(n);return}
     render(n.item,n);
   }catch(e){$('questionMount').innerHTML=`<div class="question-title">Wonder lost the thread for a moment.</div><p class="muted">Your answers are saved. Try Continue again.</p>`}
 }
 async function back(){
   if(!A.history.length)return;
   const last=A.history.pop();
   const previous=A.history.pop();
   if(!previous){saveA(A);return}
   // Ask server for the public item bank indirectly by replaying until the previous id would be current.
   // We keep a local cache of rendered items for instant navigation.
   const item=A.cache?.[previous];if(item){saveA(A);render(item,{phase:'core',count:Object.keys(A.responses).length})}
 }
 function cacheItem(item){A.cache=A.cache||{};A.cache[item.id]=item;saveA(A)}
 const oldRender=render;render=(item,meta)=>{cacheItem(item);oldRender(item,meta)};

 function dominant(d,keys){return keys.map(k=>[k,d[k]||0]).sort((a,b)=>b[1]-a[1])[0]}
 const names={cognitive_systemizing:'structured thinking',cognitive_contextual:'context-sensitive thinking',ambiguity_tolerance:'comfort with ambiguity',decisiveness:'decisiveness',novelty_orientation:'novelty',emotional_intensity:'emotional intensity',structure_preference:'structure',autonomy_need:'autonomy',closeness_need:'closeness',reassurance_need:'relational reassurance',vulnerability_openness:'vulnerability',conflict_directness:'directness in conflict',repair_orientation:'repair',reciprocity_sensitivity:'reciprocity',trust_baseline:'baseline trust',value_family:'family',value_achievement:'achievement',value_meaning:'meaning',value_freedom:'freedom',value_stability:'stability',value_knowledge:'knowledge',value_service:'service',value_influence:'influence',value_beauty:'beauty',value_loyalty:'loyalty',recognition_need:'recognition',competence_identity:'competence',distinctiveness_need:'distinctiveness',belonging_need:'belonging',stress_control:'control',stress_withdrawal:'withdrawal',stress_accommodation:'accommodation',stress_intellectualization:'analysis'};
 function mirrorCopy(model,archetypes){
   const d=model.dimensions||{};const primary=archetypes[0],secondary=archetypes[1];
   const cog=dominant(d,['cognitive_systemizing','cognitive_contextual','ambiguity_tolerance','decisiveness']);
   const rel=dominant(d,['autonomy_need','closeness_need','repair_orientation','reciprocity_sensitivity','trust_baseline']);
   const val=dominant(d,['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_knowledge','value_service','value_influence','value_beauty','value_loyalty']);
   const stress=dominant(d,['stress_control','stress_withdrawal','stress_accommodation','stress_intellectualization']);
   const tension=(d.autonomy_need>.25&&d.reassurance_need>.25)?'You seem to value independence strongly while still registering relational inconsistency quickly. Wonder reads that less as contradiction than as a wish for closeness that does not cost you agency.':(d.closeness_need>.25&&d.stress_withdrawal>.25)?'You appear to care deeply about connection, yet pressure may make you retreat precisely when closeness matters most. That tension is worth understanding rather than flattening into a label.':`Under pressure, ${names[stress[0]]} appears more prominent than it does in your everyday self-description.`;
   return{primary,secondary,move:`Your responses lean toward ${names[cog[0]]}. You seem most yourself when you can understand what is actually happening rather than accept a shallow explanation.`,drive:`Of the values Wonder measured, ${names[val[0]]} currently carries the strongest signal. That does not mean it rules your life; it means choices involving it are especially likely to feel consequential.`,relationship:`In relationships, ${names[rel[0]]} stands out. The pattern matters more than any single answer because it appeared from several different angles.`,tension};
 }
 async function finish(meta){
   $('progressBar').style.width='100%';
   $('sectionLabel').textContent='Wonder is looking for patterns';
   $('questionMount').innerHTML='<div class="question-title">Separating what you say about yourself from what your choices suggest.</div>';
   $('nextQuestion').style.visibility='hidden';$('prevQuestion').style.visibility='hidden';
   try{
     const r=await fetch('/api/assessment-score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({responses:A.responses})});const out=await r.json();
     const c=mirrorCopy(out.model,out.archetypes||[]);A.complete=true;A.result=out;saveA(A);
     const s=getState();s.archetype=c.primary?.name||'Architect';s.assessmentV2=out;localStorage.setItem('wonder_preview_state',JSON.stringify(s));
     $('archetypeName').textContent='The '+(c.primary?.name||'Architect');
     $('archetypeNote').textContent=`Primary archetype · ${c.secondary?.name?`with ${c.secondary.name} influence`:''}`;
     $('mirrorMoveTitle').textContent=c.primary?.essence||'A pattern is emerging.';$('mirrorMove').textContent=c.move;
     $('mirrorDriveTitle').textContent='What carries weight';$('mirrorDrive').textContent=c.drive;
     $('mirrorRelTitle').textContent='How connection works for you';$('mirrorRel').textContent=c.relationship;
     $('mirrorShadowTitle').textContent='A tension Wonder noticed';$('mirrorShadow').textContent=c.tension;
     const weak=Object.entries(out.model.evidence||{}).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([k])=>names[k]||k);
     $('mirrorUncertain').textContent=`Wonder has less evidence about ${weak.join(', ')}. Your model should become more precise as you interact with it.`;
     setTimeout(()=>window.show?window.show('mirror'):document.querySelector('#mirror')?.classList.add('active'),900);
   }catch{$('questionMount').innerHTML='<div class="question-title">Your answers are safe, but Wonder could not finish the portrait yet.</div>'}
 }
 async function boot(){
   if(booted)return;booted=true;await startSession();
   try{const n=await chooseNext();if(n.complete){await finish(n);return}render(n.item,n)}catch(e){$('questionMount').innerHTML='<div class="question-title">Wonder could not begin the assessment.</div>'}
 }
 const nextBtn=$('nextQuestion'),prevBtn=$('prevQuestion');if(nextBtn)nextBtn.onclick=next;if(prevBtn)prevBtn.onclick=back;
 const observer=new MutationObserver(()=>{if($('assessment')?.classList.contains('active'))boot()});if($('assessment'))observer.observe($('assessment'),{attributes:true,attributeFilter:['class']});
 if($('assessment')?.classList.contains('active'))boot();
})();