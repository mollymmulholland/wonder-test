const {cleanText}=require('./api-security');
const POLICY=require('./mirror-policy.json');
const INSTRUCTIONS=POLICY.instructions;
function configuration(){
 const endpoint=process.env.WONDER_INFERENCE_URL,model=process.env.WONDER_INFERENCE_MODEL,key=process.env.WONDER_INFERENCE_KEY;
 if(process.env.WONDER_INFERENCE_ENABLED!=='true'||!endpoint||!model||!key)return null;
 const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Inference requires a configured HTTPS origin');
 const protocol=process.env.WONDER_INFERENCE_PROTOCOL||'responses';if(!['responses','chat-completions'].includes(protocol))throw new Error('Unknown inference protocol');
 const configuredTimeout=Number(process.env.WONDER_INFERENCE_TIMEOUT_MS||20000);
 const timeout=Number.isFinite(configuredTimeout)?Math.min(110000,Math.max(5000,configuredTimeout)):20000;
 return {endpoint,model,key,protocol,timeout,retryColdStart:process.env.WONDER_INFERENCE_RETRY_COLD_START==='true'};
}
async function reflect({message,selected='',history=[],task='reflect'}){
 const config=configuration();if(!config)throw Object.assign(new Error('Live Mirror is not connected yet. Your saved Mirror, corrections, and journal remain available.'),{status:503});
 const taskInstruction=POLICY.tasks[task]||'';
 const messages=[...history.slice(-6).filter(m=>['user','assistant'].includes(m.role)).map(m=>({role:m.role,content:cleanText(m.content,2000)})),{role:'user',content:(selected?'Selected material for this request only:\n'+selected+'\n\n':'')+message}];
 const body=config.protocol==='responses'?{model:config.model,instructions:INSTRUCTIONS+' '+taskInstruction,input:messages,store:false,max_output_tokens:700}:{model:config.model,messages:[{role:'system',content:(INSTRUCTIONS+' '+taskInstruction).trim()},...messages],store:false,max_tokens:700,temperature:.35};
 const deadline=Date.now()+config.timeout,signal=AbortSignal.timeout(config.timeout);
 let response;
 while(true){
  response=await fetch(config.endpoint,{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'});
  // Modal Servers return 503 before accepting work during cold start. Never retry an
  // ambiguous network failure, busy 429, or a generation failure that could duplicate work.
  if(!config.retryColdStart||response.status!==503||Date.now()+3000>=deadline)break;
  await response.body?.cancel();
  await new Promise(resolve=>setTimeout(resolve,2500));
 }
 if(response.status===413)throw Object.assign(new Error('Select a shorter excerpt or start a new Mirror conversation. Your text is still here.'),{status:503});
 if(response.status===429)throw Object.assign(new Error('Your Mirror is busy. Please try again shortly; your text is still here.'),{status:503});
 if(!response.ok)throw new Error('Inference service unavailable');
 const data=await response.json();const reply=config.protocol==='chat-completions'?data.choices?.[0]?.message?.content:data.output_text||data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
 if(typeof reply!=='string'||!reply.trim()||reply.length>12000)throw new Error('Invalid model output');
 return reply.replace(/[\p{Extended_Pictographic}\uFE0F]/gu,'').trim();
}
function memoryProposal(raw){
 let p;try{p=JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw new Error('The Mirror did not produce a reviewable proposal.');}
 if(!p||typeof p.body!=='string'||typeof p.context!=='string'||!p.body.trim()||p.body.length>1500||p.context.length>1500)throw new Error('The Mirror did not produce a reviewable proposal.');
 return {kind:'memory',body:cleanText(p.body,1500),context:cleanText(p.context,1500)};
}
module.exports={configuration,reflect,memoryProposal};
