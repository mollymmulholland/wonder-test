'use strict';

// Wonder-owned inference gateway. No proprietary external AI provider is required.
// The wire protocol is OpenAI-compatible only because self-hosted engines such as vLLM
// and Transformers expose that de-facto standard.

const DEFAULT_TIMEOUT_MS=45000;
const RETRYABLE=new Set([408,409,425,429,500,502,503,504]);

function baseUrl(){return String(process.env.WONDER_MODEL_BASE_URL||'').replace(/\/$/,'').replace(/\/v1$/,'');}
function modelName(){return process.env.WONDER_MODEL_NAME||'wonder-mind-base';}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function headers(){
  const h={'Content-Type':'application/json'};
  if(process.env.WONDER_MODEL_API_KEY)h.Authorization=`Bearer ${process.env.WONDER_MODEL_API_KEY}`;
  if(process.env.WONDER_MODEL_TENANT_TOKEN)h['X-Wonder-Tenant']=process.env.WONDER_MODEL_TENANT_TOKEN;
  return h;
}

async function request(path,{method='GET',body,timeoutMs=DEFAULT_TIMEOUT_MS,retries=1}={}){
  const url=baseUrl();
  if(!url)throw Object.assign(new Error('Wonder self-hosted model runtime is not configured.'),{code:'WONDER_MODEL_NOT_CONFIGURED'});
  let lastError;
  for(let attempt=0;attempt<=retries;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(`${url}${path}`,{method,headers:headers(),signal:controller.signal,body:body===undefined?undefined:JSON.stringify(body)});
      const data=await r.json().catch(()=>({}));
      if(r.ok)return {data,status:r.status};
      const err=Object.assign(new Error(data?.error?.message||`Wonder model returned ${r.status}`),{code:'WONDER_MODEL_ERROR',status:r.status,data});
      if(!RETRYABLE.has(r.status)||attempt===retries)throw err;
      lastError=err;
    }catch(err){
      const wrapped=err?.name==='AbortError'?Object.assign(new Error('Wonder model request timed out.'),{code:'WONDER_MODEL_TIMEOUT'}):err;
      if(attempt===retries)throw wrapped;
      lastError=wrapped;
    }finally{clearTimeout(timer);}
    await sleep(180*(2**attempt));
  }
  throw lastError;
}

async function health({timeoutMs=3500}={}){
  try{
    const {data}=await request('/v1/models',{timeoutMs,retries:0});
    const models=Array.isArray(data?.data)?data.data.map(m=>m.id).filter(Boolean):[];
    return {ok:true,configured:true,expectedModel:modelName(),models,modelAvailable:models.length?models.includes(modelName()):null};
  }catch(err){
    return {ok:false,configured:err.code!=='WONDER_MODEL_NOT_CONFIGURED',expectedModel:modelName(),code:err.code||'WONDER_MODEL_HEALTH_ERROR'};
  }
}

async function generate({system,messages=[],temperature=.25,maxTokens=900,timeoutMs=DEFAULT_TIMEOUT_MS,responseSchema=null}){
  const body={model:modelName(),messages:[{role:'system',content:system},...messages],temperature,max_tokens:maxTokens,stream:false};
  if(responseSchema && String(process.env.WONDER_MODEL_STRUCTURED_OUTPUTS||'true').toLowerCase()!=='false'){
    body.response_format={type:'json_schema',json_schema:responseSchema};
  }
  const {data}=await request('/v1/chat/completions',{method:'POST',body,timeoutMs,retries:1});
  const text=data?.choices?.[0]?.message?.content;
  if(!text)throw Object.assign(new Error('Wonder model returned no text.'),{code:'WONDER_MODEL_EMPTY'});
  return {text,model:data.model||modelName(),usage:data.usage||null,finishReason:data?.choices?.[0]?.finish_reason||null};
}

module.exports={generate,health,modelName,baseUrl};
