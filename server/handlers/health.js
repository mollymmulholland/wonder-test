const S = require('../../lib/supabase-server');
const {secureApi} = require('../../lib/api-security');

// Dependency reachability only. This does not certify email delivery, Storage,
// row-level policies, product acceptance, or readiness to invite members.
module.exports = async (req, res) => {
  if (!secureApi(req, res, {methods: ['GET'], requireJson: false})) return;
  if (!S.SUPABASE_URL || !S.ANON || !S.SECRET) {
    return res.status(503).json({ok: false});
  }
  try {
    const [settings, rows] = await Promise.all([
      S.jsonFetch(`${S.SUPABASE_URL}/auth/v1/settings`, {
        headers: {apikey: S.ANON}, timeoutMs: 2500,
      }),
      S.jsonFetch(`${S.SUPABASE_URL}/rest/v1/wonder_private_journey?select=user_id&limit=0`, {
        headers: {apikey: S.SECRET, Authorization: `Bearer ${S.SECRET}`}, timeoutMs: 2500,
      }),
    ]);
    if (!settings || typeof settings.mailer_autoconfirm !== 'boolean' || !Array.isArray(rows) || rows.length) {
      throw new Error('Unexpected dependency response');
    }
    return res.status(200).json({ok: true});
  } catch {
    // Never return provider errors, configuration, tokens, or member records.
    return res.status(503).json({ok: false});
  }
};
