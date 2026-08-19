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
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: response.ok, status: response.status, data, headers: response.headers };
}

async function sb(path, options={}) {
  const r = await request(path, SUPABASE_SECRET, options);
  if (!r.ok) {
    const err = new Error(`Supabase ${r.status}`);
    err.status = r.status;
    err.data = r.data;
    throw err;
  }
  return r;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok:false, error:'Method not allowed.' });
  }

  const token = String(req.query?.token || '');
  if (!ADMIN_TOKEN || !token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok:false, error:'Unauthorized.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SECRET) {
    return res.status(500).json({ ok:false, error:'Supabase admin environment is incomplete.' });
  }

  try {
    const publicHealth = SUPABASE_PUBLIC ? await request('/auth/v1/settings', SUPABASE_PUBLIC) : { ok:false, status:null, data:null };
    const usersResp = await sb('/auth/v1/admin/users?page=1&per_page=20');
    const rawUsers = Array.isArray(usersResp.data?.users) ? usersResp.data.users : (Array.isArray(usersResp.data) ? usersResp.data : []);
    const users = rawUsers.map(u => ({
      id: u.id,
      email: maskEmail(u.email),
      created_at: u.created_at,
      email_confirmed: !!u.email_confirmed_at,
      phone_present: !!u.phone
    }));

    const profilesResp = await sb('/rest/v1/profiles?select=user_id,first_name,current_city,onboarding_complete,created_at&order=created_at.desc&limit=20');
    const birthResp = await sb('/rest/v1/birth_data?select=user_id,date_of_birth,place_of_birth,created_at&order=created_at.desc&limit=20');
    const assessmentResp = await sb('/rest/v1/assessment_responses?select=user_id,question_id,created_at&order=created_at.desc&limit=200');

    const assessments = Array.isArray(assessmentResp.data) ? assessmentResp.data : [];
    const assessmentCounts = assessments.reduce((acc, row) => {
      acc[row.user_id] = (acc[row.user_id] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      ok: true,
      environment: {
        supabase_url_present: !!SUPABASE_URL,
        public_key_present: !!SUPABASE_PUBLIC,
        secret_present: !!SUPABASE_SECRET,
        admin_token_present: !!ADMIN_TOKEN,
        normalized_url_changed: String(RAW_SUPABASE_URL || '') !== SUPABASE_URL
      },
      public_auth: {
        reachable: !!publicHealth.ok,
        status: publicHealth.status,
        email_signup_enabled: publicHealth.data?.external?.email ?? null,
        phone_signup_enabled: publicHealth.data?.external?.phone ?? null
      },
      auth_users: users,
      profiles: Array.isArray(profilesResp.data) ? profilesResp.data : [],
      birth_data: Array.isArray(birthResp.data) ? birthResp.data : [],
      assessment_counts: assessmentCounts
    });
  } catch (error) {
    return res.status(500).json({
      ok:false,
      error:error.message || 'Diagnostics failed.',
      supabase_status:error.status || null,
      detail:error.data || null
    });
  }
};