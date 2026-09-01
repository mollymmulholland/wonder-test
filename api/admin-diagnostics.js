'use strict';

const {health:modelHealth}=require('../lib/wonder-model-gateway');

const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL = String(RAW_SUPABASE_URL || '').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLIC = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_TOKEN = process.env.WONDER_ADMIN_TOKEN;

function maskEmail(email='') {
  const [name, domain] = String(email).split('@');
  if (!domain) return null;
  const head = name ? name.slice(0, 2) : '';
  return `${head}${name && name.length > 2 ? '***' : ''}@${domain}`;
}

async function request(path, key, options={}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(options.headers || {})}
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: response.ok, status: response.status, data, headers: response.headers };
}

async function sb(path, options={}) {
  const r = await request(path, SUPABASE_SECRET, options);
  if (!r.ok) {const err = new Error(`Supabase ${r.status}`);err.status = r.status;err.data = r.data;throw err;}
  return r;
}

async function runSmokeTest() {
  const email = `wonder-smoke-${Date.now()}@example.com`;
  const password = `WonderSmoke-${Math.random().toString(36).slice(2)}!9`;
  let userId = null;
  try {
    const created = await sb('/auth/v1/admin/users', {method:'POST',body:JSON.stringify({ email, password, email_confirm:true })});
    userId = created.data?.id || created.data?.user?.id || null;
    if (!userId) throw new Error('Smoke user was not created.');
    await new Promise(resolve => setTimeout(resolve, 250));
    const profile = await sb(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,created_at`);
    return { auth_create:true, trigger_profile_created:Array.isArray(profile.data) && profile.data.length === 1 };
  } finally {
    if (userId) await request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, SUPABASE_SECRET, { method:'DELETE' });
  }
}

async function wonderMindDiagnostics(){
  const [model,regions,sources,knowledge,runs,events,memories,versions]=await Promise.all([
    modelHealth(),
    sb('/rest/v1/wonder_mind_regions?is_active=eq.true&select=id'),
    sb('/rest/v1/wonder_mind_sources?select=id'),
    sb('/rest/v1/wonder_mind_knowledge?status=eq.active&select=id'),
    sb('/rest/v1/wonder_mind_inference_runs?select=id,status,created_at&order=created_at.desc&limit=20'),
    sb('/rest/v1/wonder_mind_events?select=id,processing_status&order=created_at.desc&limit=100'),
    sb('/rest/v1/wonder_mind_memory?superseded_by=is.null&select=id'),
    sb('/rest/v1/wonder_mind_model_versions?select=version,status,substrate,base_model,constitution_version,cognitive_architecture_version,activated_at&order=created_at.desc&limit=5')
  ]);
  const count=x=>Array.isArray(x.data)?x.data.length:0;
  const failedRuns=(runs.data||[]).filter(r=>r.status==='failed').length;
  const failedEvents=(events.data||[]).filter(e=>e.processing_status==='failed').length;
  const readiness={
    cognitive_architecture:count(regions)===17,
    research_corpus:count(sources)>=50&&count(knowledge)>=30,
    event_memory_layer:true,
    self_hosted_inference:Boolean(model.ok&&model.modelAvailable!==false),
    production_ready:Boolean(count(regions)===17&&count(sources)>=50&&count(knowledge)>=30&&model.ok&&model.modelAvailable!==false&&failedRuns===0)
  };
  return {status:readiness.production_ready?'ready':'building',readiness,model,counts:{regions:count(regions),sources:count(sources),knowledge:count(knowledge),active_memories:count(memories),recent_runs:count(runs),recent_failed_runs:failedRuns,recent_failed_events:failedEvents},model_versions:versions.data||[]};
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {res.setHeader('Allow', 'GET');return res.status(405).json({ ok:false, error:'Method not allowed.' });}
  const token = String(req.query?.token || '');
  if (!ADMIN_TOKEN || !token || token !== ADMIN_TOKEN) return res.status(401).json({ ok:false, error:'Unauthorized.' });
  if (!SUPABASE_URL || !SUPABASE_SECRET) return res.status(500).json({ ok:false, error:'Supabase admin environment is incomplete.' });

  try {
    const smoke = req.query?.action === 'smoke' ? await runSmokeTest() : null;
    const publicHealth = SUPABASE_PUBLIC ? await request('/auth/v1/settings', SUPABASE_PUBLIC) : { ok:false, status:null, data:null };
    const [usersResp,profilesResp,birthResp,assessmentResp,mind] = await Promise.all([
      sb('/auth/v1/admin/users?page=1&per_page=20'),
      sb('/rest/v1/profiles?select=user_id,first_name,current_city,onboarding_complete,created_at&order=created_at.desc&limit=20'),
      sb('/rest/v1/birth_data?select=user_id,date_of_birth,place_of_birth,created_at&order=created_at.desc&limit=20'),
      sb('/rest/v1/assessment_responses?select=user_id,question_id,created_at&order=created_at.desc&limit=200'),
      wonderMindDiagnostics()
    ]);
    const rawUsers = Array.isArray(usersResp.data?.users) ? usersResp.data.users : (Array.isArray(usersResp.data) ? usersResp.data : []);
    const users = rawUsers.map(u => ({id:u.id,email:maskEmail(u.email),created_at:u.created_at,email_confirmed:!!u.email_confirmed_at,phone_present:!!u.phone}));
    const assessments = Array.isArray(assessmentResp.data) ? assessmentResp.data : [];
    const assessmentCounts = assessments.reduce((acc,row)=>{acc[row.user_id]=(acc[row.user_id]||0)+1;return acc;},{});

    return res.status(200).json({
      ok:true,smoke,
      environment:{supabase_url_present:!!SUPABASE_URL,public_key_present:!!SUPABASE_PUBLIC,secret_present:!!SUPABASE_SECRET,admin_token_present:!!ADMIN_TOKEN,normalized_url_changed:String(RAW_SUPABASE_URL || '') !== SUPABASE_URL,wonder_model_url_present:!!process.env.WONDER_MODEL_BASE_URL,wonder_model_name:process.env.WONDER_MODEL_NAME||null},
      public_auth:{reachable:!!publicHealth.ok,status:publicHealth.status,email_signup_enabled:publicHealth.data?.external?.email ?? null,phone_signup_enabled:publicHealth.data?.external?.phone ?? null},
      wonder_mind:mind,
      auth_users:users,
      profiles:Array.isArray(profilesResp.data)?profilesResp.data:[],
      birth_data:Array.isArray(birthResp.data)?birthResp.data:[],
      assessment_counts:assessmentCounts
    });
  } catch (error) {
    return res.status(500).json({ok:false,error:error.message || 'Diagnostics failed.',supabase_status:error.status || null,detail:error.data || null});
  }
};
