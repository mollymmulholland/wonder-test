const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL = String(RAW_SUPABASE_URL || '').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  const { email, phone, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();

  if (!cleanEmail || !password || String(password).length < 8) {
    return res.status(400).json({ error: 'Enter an email and a password of at least 8 characters.' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: String(password),
        data: { phone: cleanPhone }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: data.msg || data.message || data.error_description || 'Unable to create account.' });
    }

    return res.status(200).json({
      user: data.user || null,
      access_token: data.access_token || null,
      refresh_token: data.refresh_token || null,
      expires_in: data.expires_in || null,
      needs_email_confirmation: !data.access_token
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to reach the account service.' });
  }
};