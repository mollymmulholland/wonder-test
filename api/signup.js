const RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_URL = String(RAW_SUPABASE_URL || '').replace(/\/(?:rest|auth)\/v1\/?$/,'').replace(/\/$/,'');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):{}}catch{return {message:text}}
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control','no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || !SUPABASE_SECRET) {
    return res.status(500).json({ error: 'Supabase is not fully configured on the server.' });
  }

  const { email, phone, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanEmail || cleanPassword.length < 8) {
    return res.status(400).json({ error: 'Enter an email and a password of at least 8 characters.' });
  }

  try {
    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method:'POST',
      headers:{
        apikey:SUPABASE_SECRET,
        Authorization:`Bearer ${SUPABASE_SECRET}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        email:cleanEmail,
        password:cleanPassword,
        email_confirm:true,
        user_metadata:{ phone:cleanPhone, wonder_preview:true }
      })
    });
    const created = await readJson(createResponse);

    if(!createResponse.ok){
      const message=String(created?.msg||created?.message||created?.error_description||'Unable to create account.');
      if(/already|registered|exists/i.test(message)){
        return res.status(409).json({ error:'An account already exists with this email.' });
      }
      return res.status(createResponse.status).json({ error:message });
    }

    const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:'POST',
      headers:{
        apikey:SUPABASE_KEY,
        Authorization:`Bearer ${SUPABASE_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({ email:cleanEmail, password:cleanPassword })
    });
    const session = await readJson(signInResponse);
    if(!signInResponse.ok){
      return res.status(signInResponse.status).json({ error:session?.msg||session?.message||'Account was created but sign-in failed.' });
    }

    return res.status(200).json({
      user:session.user||created||null,
      access_token:session.access_token||null,
      refresh_token:session.refresh_token||null,
      expires_in:session.expires_in||null,
      needs_email_confirmation:false,
      preview_auto_confirmed:true
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to reach the account service.' });
  }
};