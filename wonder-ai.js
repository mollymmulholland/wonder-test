(()=>{
  const $=id=>document.getElementById(id);
  const send=$('sendChat');
  if(!send) return;

  const getState=()=>{
    try{return JSON.parse(localStorage.getItem('wonder_preview_state')||'{}')}catch{return {}}
  };
  const setState=s=>{try{localStorage.setItem('wonder_preview_state',JSON.stringify(s))}catch{}}

  // Migrate away from the old scripted-demo conversation so the live model
  // does not inherit repetitive canned replies as if they were real history.
  const bootState=getState();
  if(bootState.chatMode!=='live-openai-v1'){
    if(Array.isArray(bootState.chat)&&bootState.chat.length){
      bootState.legacyScriptedChat=bootState.chat.slice(-20);
    }
    bootState.chat=[];
    bootState.chatMode='live-openai-v1';
    setState(bootState);
  }

  function addBubble(text, role){
    const bubble=document.createElement('div');
    bubble.className=`bubble ${role==='wonder'?'wonder':'user'}`;
    bubble.textContent=text;
    const inputRow=document.querySelector('#chat .chat-input');
    if(inputRow) $('chat').insertBefore(bubble,inputRow);
    bubble.scrollIntoView({behavior:'smooth',block:'nearest'});
    return bubble;
  }

  async function liveSend(){
    const input=$('chatInput');
    const message=input?.value.trim();
    if(!message) return;

    const state=getState();
    state.chat=Array.isArray(state.chat)?state.chat:[];
    const history=state.chat.slice(-12);

    addBubble(message,'user');
    input.value='';
    send.disabled=true;
    send.textContent='Thinking…';
    const pending=addBubble('Wonder is thinking…','wonder');
    pending.style.opacity='.55';

    try{
      const response=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message,
          history,
          context:{
            archetype:state.archetype,
            scores:state.scores,
            accuracy:state.accuracy,
            correction:state.correction,
            essentials:state.essentials,
            journal:state.journal
          }
        })
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Wonder AI is unavailable.');
      pending.textContent=data.reply;
      pending.style.opacity='1';
      state.chat.push({role:'user',text:message},{role:'wonder',text:data.reply});
      state.chatMode='live-openai-v1';
      setState(state);
    }catch(err){
      pending.textContent=err.message||'Wonder AI is temporarily unavailable.';
      pending.style.opacity='1';
    }finally{
      send.disabled=false;
      send.textContent='Send';
    }
  }

  // Replace the scripted demo handler installed by app.js.
  send.onclick=liveSend;
  $('chatInput')?.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();liveSend();}
  });
})();
