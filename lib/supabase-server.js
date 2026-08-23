const RAW_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const URL=String(RAW_URL||'').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const ANON=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET=process.env.SUPABASE_SECRET_KEY;
const DEFAULT_TIMEOUT_MS=10000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function jsonFetch(url,options={}){
  const method=String(options.method||'GET').toUpperCase(),safe=method==='GET'||method==='HEAD',attempts=safe?3:1;
  let last;
  for(let attempt=0;attempt<attempts;attempt++){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),Number(options.timeoutMs||DEFAULT_TIMEOUT_MS));
    try{
      const r=await fetch(url,{...options,signal:controller.signal});
      const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
      if(r.ok)return data;
      const e=new Error(data.message||data.msg||data.error_description||data.raw||`Supabase ${r.status}`);e.status=r.status;e.data=data;
      if(safe&&(r.status===408||r.status===429||r.status>=500)&&attempt<attempts-1){last=e;await sleep(120*Math.pow(2,attempt));continue;}
      throw e;
    }catch(e){
      const normalized=e?.name==='AbortError'?Object.assign(new Error('Supabase request timed out.'),{status:504}):e;
      if(safe&&(normalized?.name==='TypeError'||normalized?.status===504)&&attempt<attempts-1){last=normalized;await sleep(120*Math.pow(2,attempt));continue;}
      throw normalized;
    }finally{clearTimeout(timeout);}
  }
  throw last||new Error('Supabase request failed.');
}

async function authUser(accessToken){if(!URL||!ANON||!accessToken)return null;try{return await jsonFetch(`${URL}/auth/v1/user`,{headers:{apikey:ANON,Authorization:`Bearer ${accessToken}`}});}catch{return null;}}
function restHeaders({accessToken,admin=false,prefer}={}){const key=admin?SECRET:ANON,token=admin?SECRET:accessToken;if(!key||!token)throw new Error('Supabase credentials are unavailable.');const h={apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'};if(prefer)h.Prefer=prefer;return h;}
async function rest(path,{method='GET',body,accessToken,admin=false,prefer}={}){if(!URL)throw new Error('Supabase URL is unavailable.');const suffix=path.startsWith('/')?path:`/${path}`;return jsonFetch(`${URL}/rest/v1${suffix}`,{method,headers:restHeaders({accessToken,admin,prefer}),body:body===undefined?undefined:JSON.stringify(body)});}
module.exports={SUPABASE_URL:URL,ANON,SECRET,jsonFetch,authUser,rest};