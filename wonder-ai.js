(()=>{
  const $=id=>document.getElementById(id);const send=$('sendChat');if(!send)return;
  const getState=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  const setState=s=>{try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}};

  const bootState=getState();
  if(bootState.chatMode!=='wonder-mind-v1'){
    if(Array.isArray(bootState.chat)&&bootState.chat.length)bootState.legacyScriptedChat=bootState.chat.slice(-20);
    bootState.chat=[];bootState.chatMode='wonder-mind-v1';setState(bootState);
  }

  function addBubble(text,role){const bubble=document.createElement('div');bubble.className=`bubble ${role==='wonder'?'wonder':'user'}`;bubble.textContent=text;const inputRow=document.querySelector('#chat .chat-input');if(inputRow)$('chat').insertBefore(bubble,inputRow);bubble.scrollIntoView({behavior:'smooth',block:'nearest'});return bubble;}

  function fallbackReflection(message,state){
    const lower=message.toLowerCase();
    if(/wrong|missed|not really|disagree|incorrect/.test(lower))return 'That is evidence against the earlier interpretation. I should lower my confidence rather than make your answer fit. What distinction would make the interpretation more accurate?';
    if(/ruminat|overthink|think about|understand|explain/.test(lower))return 'One possibility is that understanding restores a sense of agency for you, rather than merely satisfying curiosity. I would want to distinguish whether the analysis usually produces clarity or sometimes becomes a way of remaining attached to the problem.';
    if(/relationship|love|partner|dating|closen|distance/.test(lower))return 'I would separate what you consciously want in a relationship from what you react to when a bond becomes uncertain. Those are different forms of evidence, and neither should automatically define you.';
    if(/control|fix|solve|agency/.test(lower))return 'There may be two things happening at once: genuine competence and a lower tolerance for being unable to influence an important outcome. I would keep those as separate hypotheses until there is more evidence.';
    const archetype=state.archetype?` Your current ${state.archetype} pattern remains only a working hypothesis.`:'';
    return `I’m treating that as new evidence rather than a conclusion.${archetype} The useful question is what changes about this pattern when the stakes are emotional rather than practical.`;
  }

  async function liveSend(){
    const input=$('chatInput');const message=input?.value.trim();if(!message)return;
    const state=getState();state.chat=Array.isArray(state.chat)?state.chat:[];const history=state.chat.slice(-12);
    addBubble(message,'user');input.value='';send.disabled=true;send.textContent='Thinking…';const pending=addBubble('Wonder is thinking…','wonder');pending.style.opacity='.55';
    try{
      const token=state.auth?.accessToken;
      if(!token)throw new Error('Authentication required');
      const response=await fetch('/api/mind',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({message,runType:'chat',history,context:{archetype:state.archetype,scores:state.scores,accuracy:state.accuracy,correction:state.correction,essentials:state.essentials,journal:state.journal}})});
      const data=await response.json().catch(()=>({}));
      const reply=response.ok&&data.reply?data.reply:fallbackReflection(message,state);
      pending.textContent=reply;pending.style.opacity='1';
      state.chat.push({role:'user',text:message},{role:'wonder',text:reply});
      state.chatMode=response.ok?'wonder-mind-v1':'wonder-mind-local-fallback-v1';
      if(response.ok)state.lastMindRun={id:data.runId,confidence:data.confidence,epistemicClass:data.epistemicClass,at:new Date().toISOString()};
      setState(state);
    }catch{
      const reply=fallbackReflection(message,state);pending.textContent=reply;pending.style.opacity='1';state.chat.push({role:'user',text:message},{role:'wonder',text:reply});state.chatMode='wonder-mind-local-fallback-v1';setState(state);
    }finally{send.disabled=false;send.textContent='Send';}
  }

  send.onclick=liveSend;$('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();liveSend();}});
})();