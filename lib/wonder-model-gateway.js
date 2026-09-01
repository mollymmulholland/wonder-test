// Wonder-owned inference gateway.
// Runtime contract intentionally does not depend on OpenAI, Anthropic, Gemini, or any hosted proprietary model API.
// It speaks an OpenAI-compatible HTTP protocol because self-hosted engines such as vLLM expose it.

const DEFAULT_TIMEOUT_MS=45000;

function baseUrl(){return String(process.env.WONDER_MODEL_BASE_URL||'').replace(/\/$/,'');}
function modelName(){return process.env.WONDER_MODEL_NAME||'wonder-mind-base';}

async function generate({system,messages=[],temperature=.35,maxTokens=700,timeoutMs=DEFAULT_TIMEOUT_MS}){
  const url=baseUrl();
  if(!url){
    const err=new Error('Wonder self-hosted model runtime is not configured.');
    err.code='WONDER_MODEL_NOT_CONFIGURED';
    throw err;
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const headers={'Content-Type':'application/json'};
    if(process.env.WONDER_MODEL_API_KEY)headers.Authorization=`Bearer ${process.env.WONDER_MODEL_API_KEY}`;
    const r=await fetch(`${url}/v1/chat/completions`,{
      method:'POST',headers,signal:controller.signal,
      body:JSON.stringify({model:modelName(),messages:[{role:'system',content:system},...messages],temperature,max_tokens:maxTokens,stream:false})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const err=new Error(data?.error?.message||`Wonder model returned ${r.status}`);
      err.code='WONDER_MODEL_ERROR';err.status=r.status;throw err;
    }
    const text=data?.choices?.[0]?.message?.content;
    if(!text)throw Object.assign(new Error('Wonder model returned no text.'),{code:'WONDER_MODEL_EMPTY'});
    return {text,model:data.model||modelName(),usage:data.usage||null};
  } finally { clearTimeout(timer); }
}

module.exports={generate,modelName};