const RAW_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const URL=String(RAW_URL||'').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const ANON=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET=process.env.SUPABASE_SECRET_KEY;

async function jsonFetch(url, options={}){
  const r=await fetch(url,options);
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!r.ok){const e=new Error(data.message||data.msg||data.error_description||data.raw||`Supabase ${r.status}`);e.status=r.status;e.data=data;throw e;}
  return data;
}

async function authUser(accessToken){
  if(!URL||!ANON||!accessToken)return null;
  try{
    return await jsonFetch(`${URL}/auth/v1/user`,{headers:{apikey:ANON,Authorization:`Bearer ${accessToken}`}});
  }catch{return null;}
}

function restHeaders({accessToken,admin=false,prefer}={}){
  const key=admin?SECRET:ANON;
  const token=admin?SECRET:accessToken;
  const h={apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  if(prefer)h.Prefer=prefer;
  return h;
}

async function rest(path,{method='GET',body,accessToken,admin=false,prefer}={}){
  const suffix=path.startsWith('/')?path:`/${path}`;
  return jsonFetch(`${URL}/rest/v1${suffix}`,{
    method,
    headers:restHeaders({accessToken,admin,prefer}),
    body:body===undefined?undefined:JSON.stringify(body)
  });
}

module.exports={SUPABASE_URL:URL,ANON,SECRET,jsonFetch,authUser,rest};