const { SUPABASE_URL, ANON, accessToken: tokenFromRequest, authUser } = require('../lib/supabase-server');
const { secureApi, cleanText } = require('../lib/api-security');
const { buildMirror } = require('../lib/mirror-engine');
const { buildRelationalSelf } = require('../lib/relational-self');

async function request(path, { method = 'GET', body, accessToken, prefer } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase request failed (${r.status})`);
  if (r.status === 204) return null;
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function upsert(table, rows, token, onConflict) {
  const q = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  return request(`/${table}${q}`, {
    method: 'POST',
    body: rows,
    accessToken: token,
    prefer: 'resolution=merge-duplicates,return=minimal'
  });
}

async function upsertOptionalLocation(table, row, token, onConflict) {
  try {
    return await upsert(table, row, token, onConflict);
  } catch (error) {
    if (!('location_data' in row)) throw error;
    const fallback = { ...row };
    delete fallback.location_data;
    return upsert(table, fallback, token, onConflict);
  }
}

async function hydrate(uid, token) {
  const [profiles, births, snapshots, sessions, relationalSelf] = await Promise.all([
    request(`/profiles?user_id=eq.${uid}&select=*&limit=1`, { accessToken: token }),
    request(`/birth_data?user_id=eq.${uid}&select=*&limit=1`, { accessToken: token }),
    request(`/person_model_snapshots?user_id=eq.${uid}&select=*&order=created_at.desc&limit=1`, { accessToken: token }),
    request(`/assessment_sessions?user_id=eq.${uid}&status=eq.in_progress&select=*&order=started_at.desc&limit=1`, { accessToken: token }),
    request(`/relational_self_snapshots?user_id=eq.${uid}&select=*&order=created_at.desc&limit=1`, { accessToken: token }).catch(() => [])
  ]);

  const profile = profiles?.[0] || null;
  const birth = births?.[0] || null;
  const snapshot = snapshots?.[0] || null;
  const session = sessions?.[0] || null;
  let assessment = null;
  let active = null;

  if (snapshot) {
    const model = {
      dimensions: snapshot.scores || {},
      evidence: snapshot.confidence?.evidence || {},
      coverage: Number(snapshot.confidence?.coverage || 0),
      foundations: snapshot.evidence?.foundations || {}
    };
    const archetypes = Array.isArray(snapshot.archetypes) ? snapshot.archetypes : [];
    assessment = {
      model,
      archetypes,
      mirror: {
        ...buildMirror(model, archetypes),
        architecture: snapshot.evidence?.mirror_architecture || null
      },
      snapshot_id: snapshot.id,
      assessment_session_id: snapshot.assessment_session_id,
      model_version: snapshot.model_version,
      created_at: snapshot.created_at
    };
  }

  if (session) {
    const rows = await request(
      `/assessment_responses_v2?session_id=eq.${encodeURIComponent(session.id)}&user_id=eq.${uid}&select=item_id,response&order=created_at.asc`,
      { accessToken: token }
    );
    const responses = {};
    for (const row of rows || []) responses[row.item_id] = row.response;
    active = { session, responses };
  }

  return { profile, birth, assessment, active_assessment: active, relational_self: relationalSelf?.[0] || null };
}

const rating = (value, name) => {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 7) throw new Error(`${name} must be between 1 and 7`);
  return n;
};

async function saveMirrorFeedback(uid, body, token) {
  const accuracy = rating(body.overall_accuracy, 'overall_accuracy');
  let snapshotId = body.person_model_snapshot_id || null;
  let sessionId = body.assessment_session_id || null;

  if (!snapshotId) {
    const rows = await request(
      `/person_model_snapshots?user_id=eq.${uid}&select=id,assessment_session_id&order=created_at.desc&limit=1`,
      { accessToken: token }
    );
    snapshotId = rows?.[0]?.id || null;
    sessionId = sessionId || rows?.[0]?.assessment_session_id || null;
  }

  return request('/mirror_feedback', {
    method: 'POST',
    accessToken: token,
    prefer: 'return=representation',
    body: {
      user_id: uid,
      person_model_snapshot_id: snapshotId,
      assessment_session_id: sessionId,
      overall_accuracy: accuracy,
      accurate_sections: Array.isArray(body.accurate_sections) ? body.accurate_sections.slice(0, 12) : [],
      inaccurate_sections: Array.isArray(body.inaccurate_sections) ? body.inaccurate_sections.slice(0, 12) : [],
      correction: cleanText(body.correction, 3000) || null,
      archetype_resonance: rating(body.archetype_resonance, 'archetype_resonance')
    }
  });
}

async function saveMatchOutcome(uid, body, token) {
  if (!body.candidate_user_id) throw new Error('candidate_user_id is required');

  if (body.match_id) {
    const match = await request(
      `/matches?id=eq.${encodeURIComponent(body.match_id)}&user_id=eq.${uid}&matched_user_id=eq.${encodeURIComponent(body.candidate_user_id)}&select=id&limit=1`,
      { accessToken: token }
    );
    if (!match?.[0]) throw new Error('Match not found');
  }

  const row = {
    user_id: uid,
    candidate_user_id: body.candidate_user_id,
    match_id: body.match_id || null,
    met_in_person: body.met_in_person == null ? null : !!body.met_in_person,
    wanted_second_date: body.wanted_second_date == null ? null : !!body.wanted_second_date,
    rejection_reasons: Array.isArray(body.rejection_reasons) ? body.rejection_reasons.slice(0, 12) : [],
    notes: cleanText(body.notes, 3000) || null
  };

  for (const field of ['felt_understood', 'conversational_ease', 'attraction', 'emotional_safety', 'intellectual_stimulation', 'values_fit']) {
    row[field] = rating(body[field], field);
  }

  return request('/match_outcomes?on_conflict=match_id,user_id', {
    method: 'POST',
    accessToken: token,
    prefer: 'resolution=merge-duplicates,return=representation',
    body: row
  });
}

async function refreshRelationalSelf(uid, token) {
  const reflections = await request(
    `/connection_reflections?user_id=eq.${uid}&select=id,other_user_id,encounter_number,stage,mode,desire_to_continue,felt_safe,felt_seen,attraction,curiosity,ease,reflection,occurred_at&order=occurred_at.asc&limit=200`,
    { accessToken: token }
  );
  const result = buildRelationalSelf(reflections || []);
  if ((result.evidence?.reflection_count || 0) < 3) return null;

  const rows = await request('/relational_self_snapshots', {
    method: 'POST',
    accessToken: token,
    prefer: 'return=representation',
    body: {
      user_id: uid,
      model_version: 'relational-self-v1',
      hypotheses: result.hypotheses,
      evidence: result.evidence,
      source_reflection_count: result.evidence.reflection_count,
      distinct_connection_count: result.evidence.distinct_connection_count
    }
  });
  return rows?.[0] || null;
}

async function getConnectionContext(uid, body, token) {
  const otherUserId = cleanText(body.other_user_id, 128);
  if (!otherUserId || otherUserId === uid) throw new Error('Valid other_user_id is required');

  if (body.match_id) {
    const match = await request(
      `/matches?id=eq.${encodeURIComponent(body.match_id)}&user_id=eq.${uid}&matched_user_id=eq.${encodeURIComponent(otherUserId)}&select=id&limit=1`,
      { accessToken: token }
    );
    if (!match?.[0]) throw new Error('Match not found');
  }

  const rows = await request(
    `/connection_reflections?user_id=eq.${uid}&other_user_id=eq.${encodeURIComponent(otherUserId)}&select=encounter_number,stage,mode,reflection,occurred_at&order=encounter_number.desc&limit=6`,
    { accessToken: token }
  );
  const previous = rows || [];
  const last = previous[0] || null;
  let carryForwardQuestion = null;

  for (const row of previous) {
    const question = row?.reflection?.what_i_wonder || row?.reflection?.want_to_know;
    if (question) {
      carryForwardQuestion = question;
      break;
    }
  }

  const nextEncounter = (Number(last?.encounter_number) || 0) + 1;
  return {
    next_encounter: nextEncounter,
    stage: nextEncounter >= 5 ? 'established' : nextEncounter >= 3 ? 'developing' : 'early',
    carry_forward_question: carryForwardQuestion,
    last_mode: last?.mode || null,
    reflection_count: previous.length
  };
}

async function saveConnectionReflection(uid, body, token) {
  const otherUserId = cleanText(body.other_user_id, 128);
  if (!otherUserId || otherUserId === uid) throw new Error('Valid other_user_id is required');

  if (body.match_id) {
    const matches = await request(
      `/matches?id=eq.${encodeURIComponent(body.match_id)}&user_id=eq.${uid}&matched_user_id=eq.${encodeURIComponent(otherUserId)}&select=id&limit=1`,
      { accessToken: token }
    );
    if (!matches?.[0]) throw new Error('Match not found');
  }

  const prev = await request(
    `/connection_reflections?user_id=eq.${uid}&other_user_id=eq.${encodeURIComponent(otherUserId)}&select=encounter_number&order=encounter_number.desc&limit=1`,
    { accessToken: token }
  );
  const encounter = Math.max(1, Math.min(999, Number(body.encounter_number) || ((prev?.[0]?.encounter_number || 0) + 1)));
  const stage = encounter >= 5 ? 'established' : encounter >= 3 ? 'developing' : 'early';
  const mode = ['curiosity', 'reflection', 'concern', 'excitement'].includes(body.mode) ? body.mode : 'reflection';

  const reflection = {
    surprised_by: cleanText(body.surprised_by, 2000) || null,
    how_i_felt: cleanText(body.how_i_felt, 2000) || null,
    what_i_know: cleanText(body.what_i_know, 2000) || null,
    what_i_interpret: cleanText(body.what_i_interpret, 2000) || null,
    what_i_wonder: cleanText(body.what_i_wonder || body.want_to_know, 2000) || null,
    what_i_noticed: cleanText(body.what_i_noticed, 2000) || null,
    what_changed: cleanText(body.what_changed, 2000) || null,
    repair_or_tension: cleanText(body.repair_or_tension, 2000) || null,
    where_more_or_less_self: cleanText(body.where_more_or_less_self, 2000) || null
  };

  const rows = await request('/connection_reflections', {
    method: 'POST',
    accessToken: token,
    prefer: 'return=representation',
    body: {
      match_id: body.match_id || null,
      user_id: uid,
      other_user_id: otherUserId,
      encounter_number: encounter,
      stage,
      mode,
      share_status: 'private',
      occurred_at: new Date().toISOString(),
      desire_to_continue: body.desire_to_continue == null ? null : !!body.desire_to_continue,
      felt_safe: rating(body.felt_safe, 'felt_safe'),
      felt_seen: rating(body.felt_seen, 'felt_seen'),
      attraction: rating(body.attraction, 'attraction'),
      curiosity: rating(body.curiosity, 'curiosity'),
      ease: rating(body.ease, 'ease'),
      reflection
    }
  });

  return {
    reflection: rows?.[0] || null,
    relational_self: await refreshRelationalSelf(uid, token).catch(() => null)
  };
}

module.exports = async function handler(req, res) {
  if (!secureApi(req, res)) return;
  if (!SUPABASE_URL || !ANON) return res.status(503).json({ error: 'Persistence unavailable.' });

  const token = tokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Sign in is required before Wonder can sync.' });

  try {
    const user = await authUser(token);
    if (!user?.id) return res.status(401).json({ error: 'Your Wonder session needs to be refreshed.' });

    const body = req.body || {};
    const uid = user.id;
    const action = body.action || 'onboarding';

    if (action === 'hydrate') {
      return res.status(200).json({ ok: true, user_id: uid, ...(await hydrate(uid, token)) });
    }
    if (action === 'mirror_feedback') {
      return res.status(200).json({ ok: true, user_id: uid, feedback: (await saveMirrorFeedback(uid, body, token))?.[0] || null });
    }
    if (action === 'match_outcome') {
      return res.status(200).json({ ok: true, user_id: uid, outcome: (await saveMatchOutcome(uid, body, token))?.[0] || null });
    }
    if (action === 'connection_context') {
      return res.status(200).json({ ok: true, user_id: uid, ...(await getConnectionContext(uid, body, token)) });
    }
    if (action === 'connection_reflection') {
      return res.status(200).json({ ok: true, user_id: uid, ...(await saveConnectionReflection(uid, body, token)) });
    }

    const { birth, essentials, answers, places = {} } = body;

    if (birth) {
      await upsertOptionalLocation('birth_data', {
        user_id: uid,
        date_of_birth: birth.dob || null,
        time_of_birth: birth.tob || null,
        place_of_birth: cleanText(birth.pob, 300) || null,
        time_accuracy: cleanText(birth.toa, 40) || null,
        ...(places.birthplace ? { location_data: places.birthplace } : {}),
        updated_at: new Date().toISOString()
      }, token, 'user_id');
    }

    if (essentials) {
      await upsertOptionalLocation('profiles', {
        user_id: uid,
        first_name: cleanText(essentials.firstName, 100) || null,
        current_city: cleanText(essentials.currentCity, 200) || null,
        gender: cleanText(essentials.gender, 80) || null,
        interested_in: cleanText(essentials.interested, 80) || null,
        relationship_intention: cleanText(essentials.intent, 100) || null,
        relationship_structure: cleanText(essentials.structure, 100) || null,
        children: cleanText(essentials.children, 100) || null,
        religion: cleanText(essentials.religion, 100) || null,
        age_range: cleanText(essentials.ageRange, 60) || null,
        max_distance: cleanText(essentials.distance, 60) || null,
        nonnegotiables: cleanText(essentials.nonnegotiables, 1500) || null,
        ...(places.current_city ? { location_data: places.current_city } : {}),
        updated_at: new Date().toISOString()
      }, token, 'user_id');
    }

    if (answers && typeof answers === 'object') {
      const rows = Object.entries(answers)
        .filter(([, value]) => Number.isInteger(Number(value)))
        .slice(0, 200)
        .map(([questionId, answerIndex]) => ({
          user_id: uid,
          question_id: Number(questionId),
          answer_index: Number(answerIndex),
          updated_at: new Date().toISOString()
        }));
      if (rows.length) await upsert('assessment_responses', rows, token, 'user_id,question_id');
    }

    return res.status(200).json({ ok: true, user_id: uid });
  } catch (error) {
    console.error('Wonder persistence error', error);
    const message = String(error.message || '');
    if (/between 1 and 7|required|not found/i.test(message)) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: 'Wonder could not sync your progress yet.' });
  }
};
