const {SUPABASE_URL, ANON, SECRET, jsonFetch, authRequest, refreshToken, setSessionCookies, clearSessionCookies} = require('../../lib/supabase-server');
const {secureApi, cleanText} = require('../../lib/api-security');
const {beginFlow, readFlow, clearFlow, markRecovery, hasRecovery, clearRecovery, callbackUrl, allowAuth} = require('../../lib/auth-flows');
const {emailForUsername,validUsername,normalizeUsername,claimUsername}=require('../../lib/account-security');
const {age}=require('../../public-shared/journey');
const pendingMessage = 'If this address can receive an account email, a link is on its way. Open it in this browser. Check your spam folder too.';
const publicSession = (session, extra = {}) => ({user: session.user || null, expires_in: session.expires_in || 3600, token_type: 'cookie', ...extra});
async function auth(path, body, token, method = 'POST') {
  return jsonFetch(`${SUPABASE_URL}/auth/v1${path}`, {method, headers: {apikey: ANON, Authorization: `Bearer ${token || ANON}`, 'Content-Type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
}
const tokenRequest = (grant, body) => auth(`/token?grant_type=${grant}`, body);
function requirePassword(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) throw Object.assign(new Error('Use a password between 10 and 128 characters.'), {status: 400});
}
module.exports = async function handler(req, res) {
  if (!secureApi(req, res)) return;
  if (!SUPABASE_URL || !ANON || !SECRET) return res.status(503).json({error: 'Account service unavailable.'});
  const body = req.body || {}, action = String(body.action || 'create');
  let email = cleanText(body.email, 321).toLowerCase();
  try {
    if (!['create','signin','refresh','logout','recover','resend','exchange','update_password','recovery_status'].includes(action)) return res.status(400).json({error: 'Unknown account action.'});
    if (!await allowAuth(req, action, email)) return res.status(429).json({error: 'Too many attempts. Please wait 15 minutes before trying again.'});
    if (action === 'logout') {
      const {token, user} = await authRequest(req);
      if (user) await auth('/logout?scope=local', {}, token);
      clearSessionCookies(res); clearFlow(res); clearRecovery(res);
      return res.status(200).json({ok: true});
    }
    if (action === 'refresh') {
      const rt = refreshToken(req);
      if (!rt) return res.status(401).json({error: 'Please sign in.'});
      try {const session = await tokenRequest('refresh_token', {refresh_token: rt}); setSessionCookies(res, session); return res.status(200).json(publicSession(session));}
      catch (e) {if ([400,401,403].includes(e.status)) {clearSessionCookies(res); clearRecovery(res); return res.status(401).json({error: 'Please sign in again.'});} throw e;}
    }
    if (action === 'exchange') {
      const flow = readFlow(req), code = String(body.code || '');
      if (!flow || !/^[a-zA-Z0-9_-]{16,512}$/.test(code)) return res.status(400).json({error: 'This link has expired or was opened in a different browser. Request a new link here.'});
      let session;
      try {session = await tokenRequest('pkce', {auth_code: code, code_verifier: flow.verifier});}
      catch {clearFlow(res); return res.status(400).json({error: 'This link has expired or has already been used. Request a new one.'});}
      if (!session.access_token || !session.refresh_token || !session.user?.id) throw new Error('Missing session');
      if(flow.purpose==='signup'&&session.user.user_metadata?.requested_username){try{await claimUsername(session.user.id,session.user.user_metadata.requested_username);}catch(e){if(e.status!==409)throw e;}}
      setSessionCookies(res, session); clearFlow(res); clearRecovery(res);
      if (flow.purpose === 'recovery') markRecovery(res, session.user.id);
      return res.status(200).json(publicSession(session, {recovery: flow.purpose === 'recovery'}));
    }
    if (action === 'recovery_status' || action === 'update_password') {
      const {token, user} = await authRequest(req);
      if (!user || !hasRecovery(req, user.id)) return res.status(401).json({error: 'Request a fresh password-reset link to continue.'});
      if (action === 'recovery_status') return res.status(200).json({ok: true});
      requirePassword(body.password);
      await auth('/user', {password: body.password}, token, 'PUT');
      // Revoke refresh sessions after changing the password; never leave a recovery session signed in.
      await auth('/logout?scope=global', {}, token);
      clearSessionCookies(res); clearRecovery(res); clearFlow(res);
      return res.status(200).json({ok: true});
    }
    if(action==='signin'&&!email.includes('@')){email=await emailForUsername(email)||'unknown-account@invalid.local';}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return res.status(400).json({error: 'Enter a valid email address.'});
    if (action === 'signin') {
      requirePassword(body.password);
      try {const session = await tokenRequest('password', {email, password: body.password}); setSessionCookies(res, session); clearRecovery(res); return res.status(200).json(publicSession(session));}
      catch (e) {
        if (e.data?.code === 'email_not_confirmed' || e.data?.error_code === 'email_not_confirmed') return res.status(403).json({error: 'Confirm your email before signing in. You can request a new confirmation link below.', code: 'email_not_confirmed'});
        if (e.status === 400 || e.status === 401) return res.status(400).json({error: 'Email, username, or password is incorrect.'});
        throw e;
      }
    }
    const redirect = callbackUrl(req);
    if (action === 'create' || action === 'resend') {
      // Refuse to silently auto-confirm users when project-level email verification is disabled.
      const settings = await auth('/settings', undefined, undefined, 'GET');
      if (settings.mailer_autoconfirm !== false) return res.status(503).json({error: 'Verified account registration is being prepared. Please return shortly.'});
    }
    if (action === 'create' || action === 'resend') {
      // Resubmission through signup creates a fresh PKCE challenge for a pending account.
      requirePassword(body.password);
      if (body.adult !== true) return res.status(400).json({error: 'Please confirm that you are 18 or older.'});
      const years=age(body.dob);if(years===null||years<18||years>120)return res.status(400).json({error:'WONDER is for adults aged 18 and older. Enter a valid birth date.'});
      const chosenName=cleanText(body.chosenName,80),city=cleanText(body.city,120);if(!chosenName||!city)return res.status(400).json({error:'Add your chosen name and broad city.'});
      const username=normalizeUsername(body.username);if(!validUsername(username))return res.status(400).json({error:'Choose a username of 3–30 letters, numbers, or underscores, beginning with a letter.'});
      const challenge = beginFlow(res, 'signup');
      try {await auth(`/signup?redirect_to=${encodeURIComponent(redirect)}`, {email, password: body.password, data: {chosen_name:chosenName,city,requested_username:username,adult_attested_at: new Date().toISOString()}, ...challenge});}
      catch (e) {if (!['user_already_exists','email_exists'].includes(e.data?.code || e.data?.error_code)) throw e;}
      return res.status(200).json({needs_email_confirmation: true, message: pendingMessage});
    }
    const challenge = beginFlow(res, 'recovery');
    try {await auth(`/recover?redirect_to=${encodeURIComponent(redirect)}`, {email, ...challenge});}
    catch (e) {if (!['user_not_found'].includes(e.data?.code || e.data?.error_code)) throw e;}
    return res.status(200).json({ok: true, message: pendingMessage});
  } catch (e) {
    console.error('account', {action, status: e.status, code: e.data?.code || e.data?.error_code || e.name});
    if (e.status === 429) return res.status(429).json({error: 'Please wait before requesting another email or signing in again.'});
    if (e.status === 400 && !e.data) return res.status(400).json({error: e.message});
    if (e.data?.code === 'weak_password' || e.data?.error_code === 'weak_password') return res.status(400).json({error: 'Choose a stronger password that has not appeared in a data breach.'});
    return res.status(503).json({error: ['create','recover','resend'].includes(action) ? 'We could not send the account email. Please try again later.' : 'The account service could not complete this request. Please try again.'});
  }
};
