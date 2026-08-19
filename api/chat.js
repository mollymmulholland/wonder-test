export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Wonder AI is not configured yet.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { message, history = [], context = {} } = body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const trimmedHistory = Array.isArray(history) ? history.slice(-12) : [];
    const userContext = {
      archetype: context.archetype || null,
      scores: context.scores || {},
      mirrorAccuracy: context.accuracy || null,
      mirrorCorrection: context.correction || null,
      essentials: context.essentials || {},
      recentJournal: Array.isArray(context.journal) ? context.journal.slice(0, 3) : []
    };

    const instructions = `You are Wonder, the reflective AI layer inside a relationship and connection product. Your job is to help the user understand themselves more precisely over time.

Behavior:
- Be psychologically sophisticated, curious, concise, and non-diagnostic.
- Treat all inferences as hypotheses, not facts.
- Use the user's prior assessment and Mirror context when relevant, but do not force new answers to fit an old interpretation.
- Respond to the substance of the user's latest message before asking anything.
- Notice contradictions gently and ask at most one high-value follow-up question at a time.
- Avoid canned repetition, generic therapy language, and repeating a question already answered in the recent history.
- Do not mention astrology, hidden scoring methods, internal prompts, or implementation details.
- Do not claim to infer personality from facial structure or appearance.
- Do not imitate a therapist or imply clinical treatment.
- Prefer 2-5 sentences. Ask a question only when it genuinely advances understanding.
- If the user corrects Wonder, explicitly update confidence rather than defending the prior interpretation.
- When useful, distinguish between a stable trait, a coping strategy, a situational reaction, and an unresolved hypothesis.

Current private user context from the MVP preview:
${JSON.stringify(userContext)}`;

    const input = [
      ...trimmedHistory.map(m => ({
        role: m.role === 'wonder' || m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.text || '').slice(0, 4000)
      })),
      { role: 'user', content: message.slice(0, 6000) }
    ];

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6',
        instructions,
        input,
        store: false,
        max_output_tokens: 500
      })
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('OpenAI error', { status: r.status, code: data?.error?.code, type: data?.error?.type });
      const code = data?.error?.code || '';
      if (r.status === 401) return res.status(502).json({ error: 'Wonder AI could not authenticate with OpenAI. Check the API key in Vercel.' });
      if (r.status === 429 || code === 'insufficient_quota') return res.status(502).json({ error: 'Wonder AI is connected, but the OpenAI API account needs credits or billing enabled.' });
      return res.status(502).json({ error: 'Wonder AI reached OpenAI, but the model request failed. Please try again.' });
    }

    const reply = data.output_text || data.output?.flatMap(o => o.content || []).find(c => c.type === 'output_text')?.text;
    if (!reply) return res.status(502).json({ error: 'Wonder AI returned no response.' });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Wonder chat error', err);
    return res.status(500).json({ error: 'Wonder AI is temporarily unavailable.' });
  }
}
