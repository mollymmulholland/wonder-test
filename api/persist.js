const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getUser(accessToken) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) return null;
  return r.json();
}

async function upsert(table, rows, accessToken, onConflict) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (onConflict) url.searchParams.set('on_conflict', onConflict);
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(rows)
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || `Unable to save ${table}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase is not configured.' });

  const auth = String(req.headers.authorization || '');
  const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!accessToken) return res.status(401).json({ error: 'Sign in is required before Wonder can sync.' });

  try {
    const user = await getUser(accessToken);
    if (!user?.id) return res.status(401).json({ error: 'Your Wonder session needs to be refreshed.' });

    const { birth, essentials, answers } = req.body || {};
    const uid = user.id;

    if (birth) {
      await upsert('birth_data', {
        user_id: uid,
        date_of_birth: birth.dob || null,
        time_of_birth: birth.tob || null,
        place_of_birth: birth.pob || null,
        time_accuracy: birth.toa || null,
        updated_at: new Date().toISOString()
      }, accessToken, 'user_id');
    }

    if (essentials) {
      await upsert('profiles', {
        user_id: uid,
        first_name: essentials.firstName || null,
        current_city: essentials.currentCity || null,
        gender: essentials.gender || null,
        interested_in: essentials.interested || null,
        relationship_intention: essentials.intent || null,
        relationship_structure: essentials.structure || null,
        children: essentials.children || null,
        religion: essentials.religion || null,
        age_range: essentials.ageRange || null,
        max_distance: essentials.distance || null,
        nonnegotiables: essentials.nonnegotiables || null,
        updated_at: new Date().toISOString()
      }, accessToken, 'user_id');
    }

    if (answers && typeof answers === 'object') {
      const rows = Object.entries(answers)
        .filter(([,v]) => Number.isInteger(Number(v)))
        .map(([questionId, answerIndex]) => ({
          user_id: uid,
          question_id: Number(questionId),
          answer_index: Number(answerIndex),
          updated_at: new Date().toISOString()
        }));
      if (rows.length) await upsert('assessment_responses', rows, accessToken, 'user_id,question_id');
    }

    return res.status(200).json({ ok: true, user_id: uid });
  } catch (error) {
    console.error('Wonder persistence error', error);
    return res.status(500).json({ error: 'Wonder could not sync your progress yet.' });
  }
};