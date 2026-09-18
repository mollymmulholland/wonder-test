const crypto = require('node:crypto');
const { SECRET, rest } = require('./supabase-server');
const FLOW_COOKIE = 'wonder_auth_flow';
const RECOVERY_COOKIE = 'wonder_recovery';
function cookies(req) {
  const out = {};
  for (const pair of String(req.headers.cookie || '').split(';')) {
    const at = pair.indexOf('=');
    if (at < 0) continue;
    try { out[pair.slice(0, at).trim()] = decodeURIComponent(pair.slice(at + 1).trim()); } catch {}
  }
  return out;
}
function appendCookie(res, name, value, seconds) {
  const old = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [...(Array.isArray(old) ? old : [old]), `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`]);
}
function sign(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}
function readSigned(value) {
  try {
    const [payload, signature, extra] = String(value || '').split('.');
    if (!signature || extra) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.expires > Date.now() ? data : null;
  } catch { return null; }
}
function beginFlow(res, purpose) {
  const verifier = crypto.randomBytes(48).toString('base64url');
  appendCookie(res, FLOW_COOKIE, sign({verifier, purpose, expires: Date.now() + 3600000}), 3600);
  return {code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 's256'};
}
function readFlow(req) { return readSigned(cookies(req)[FLOW_COOKIE]); }
function clearFlow(res) { appendCookie(res, FLOW_COOKIE, '', 0); }
function markRecovery(res, userId) { appendCookie(res, RECOVERY_COOKIE, sign({userId, expires: Date.now() + 900000}), 900); }
function hasRecovery(req, userId) { return readSigned(cookies(req)[RECOVERY_COOKIE])?.userId === userId; }
function clearRecovery(res) { appendCookie(res, RECOVERY_COOKIE, '', 0); }
function callbackUrl(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const candidates = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(x => 'https://' + x);
  candidates.push(...String(process.env.WONDER_AUTH_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean));
  const origin = candidates.find(x => {try { const u = new URL(x); return u.host === host && u.protocol === 'https:' && u.pathname === '/' && !u.username && !u.password && !u.search && !u.hash; } catch { return false; }});
  if (!origin) throw Object.assign(new Error('Authentication return address is not configured.'), {status: 503});
  return new URL('/', origin).href;
}
async function allowAuth(req, action, email) {
  if (['refresh', 'logout', 'recovery_status'].includes(action)) return true;
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const emailAction = ['create', 'recover', 'resend'].includes(action);
  const key = value => crypto.createHmac('sha256', SECRET).update(value).digest('hex');
  const allowed = await rest('/rpc/wonder_auth_allow', {admin: true, method: 'POST', body: {p_bucket: key(`ip:${emailAction ? 'email' : action}:${ip}`), p_limit: emailAction ? 8 : 30, p_seconds: 900}});
  if (!allowed) return false;
  return !emailAction || !email || await rest('/rpc/wonder_auth_allow', {admin: true, method: 'POST', body: {p_bucket: key(`email:${email}`), p_limit: 3, p_seconds: 900}});
}
module.exports = {beginFlow, readFlow, clearFlow, markRecovery, hasRecovery, clearRecovery, callbackUrl, allowAuth};
