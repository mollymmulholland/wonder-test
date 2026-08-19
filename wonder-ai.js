(()=>{
  const $=id=>document.getElementById(id);const send=$('sendChat');if(!send)return;
  const getState=()=>{try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return{}}};
  const setState=s=>{try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}};

  const bootState=getState();
  if(bootState.chatMode!=='live-openai-v2'){
    if(Array.isArray(bootState.chat)&&bootState.chat.length)bootState.legacyScriptedChat=bootState.chat.slice(-20);
    bootState.chat=[];bootState.chatMode='live-openai-v2';setState(bootState);
  }

  function addBubble(text,role){const bubble=document.createElement('div');bubble.className=`bubble ${role==='wonder'?'wonder':'user'}`;bubble.textContent=text;const inputRow=document.querySelector('#chat .chat-input');if(inputRow)$('chat').insertBefore(bubble,inputRow);bubble.scrollIntoView({behavior:'smooth',block:'nearest'});return bubble;}

  function fallbackReflection(message,state){
    const lower=message.toLowerCase();
    if(/wrong|missed|not really|disagree|incorrect/.test(lower))return 'That is useful evidence against the earlier interpretation. Wonder should lower its confidence rather than make your answer fit. What distinction would make the interpretation more accurate?';
    if(/ruminat|overthink|think about|understand|explain/.test(lower))return 'One possibility is that understanding functions as a way of restoring agency for you, not merely satisfying curiosity. The unresolved question is whether the analysis usually produces clarity or whether it sometimes becomes its own form of staying attached to the problem.';
    if(/relationship|love|partner|dating|closen|distance/.test(lower))return 'I would separate what you want in a relationship from what your nervous system reacts to when a bond feels uncertain. Those can be quite different, and the difference may be more useful than forcing either one to define you.';
    if(/control|fix|solve|agency/.test(lower))return 'There may be two things happening at once: genuine competence and a lower tolerance for being unable to influence an important outcome. Wonder should treat those as separate hypotheses rather than calling both “control.”';
    const archetype=state.archetype?` Your current ${state.archetype} pattern is only a working hypothesis.`:'';
    return `I’m treating that as new evidence rather than a conclusion.${archetype} The useful question is what changes about this pattern when the stakes are emotional rather than practical.`;
  }

  async function liveSend(){
    const input=$('chatInput');const message=input?.value.trim();if(!message)return;
    const state=getState();state.chat=Array.isArray(state.chat)?state.chat:[];const history=state.chat.slice(-12);
    addBubble(message,'user');input.value='';send.disabled=true;send.textContent='Thinking…';const pending=addBubble('Wonder is thinking…','wonder');pending.style.opacity='.55';
    try{
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history,context:{archetype:state.archetype,scores:state.scores,accuracy:state.accuracy,correction:state.correction,essentials:state.essentials,journal:state.journal}})});
      const data=await response.json().catch(()=>({}));
      const reply=response.ok&&data.reply?data.reply:fallbackReflection(message,state);
      pending.textContent=reply;pending.style.opacity='1';state.chat.push({role:'user',text:message},{role:'wonder',text:reply});state.chatMode=response.ok?'live-openai-v2':'local-fallback-v1';setState(state);
    }catch{
      const reply=fallbackReflection(message,state);pending.textContent=reply;pending.style.opacity='1';state.chat.push({role:'user',text:message},{role:'wonder',text:reply});state.chatMode='local-fallback-v1';setState(state);
    }finally{send.disabled=false;send.textContent='Send';}
  }

  send.onclick=liveSend;$('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();liveSend();}});
})();
