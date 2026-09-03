(() => {
  const app = document.getElementById('app');
  const phase = document.getElementById('phase');
  const STORE = 'wonder_mvp_clean_state_v1';
  const ASSESS = 'wonder_mvp_clean_assessment_v1';

  const state = read(STORE, { screen: 'welcome', account: null, auth: null, mirror: null, preferences: null, match: null });
  const assessment = read(ASSESS, { sessionId: null, responses: {}, history: [], current: null, meta: null, complete: false, result: null });
  let selected = null;
  let busy = false;
  let bootingAssessment = false;
  let questionShownAt = Date.now();

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return { ...fallback }; } }
  function save() { localStorage.setItem(STORE, JSON.stringify(state)); }
  function saveAssessment() { localStorage.setItem(ASSESS, JSON.stringify(assessment)); }
  function setPhase(label) { if (phase) phase.textContent = label || 'Wonder'; }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function clearAssessment() { localStorage.removeItem(ASSESS); Object.assign(assessment, { sessionId: null, responses: {}, history: [], current: null, meta: null, complete: false, result: null }); }
  function hasAuth() { return state.auth?.mode === 'httpOnly-cookie'; }

  async function post(path, body = {}) {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || `Request failed (${response.status})`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function go(screen) {
    state.screen = screen;
    save();
    window.scrollTo(0, 0);
    render();
  }

  function root(html, label = 'Wonder') {
    setPhase(label);
    app.innerHTML = html;
  }

  function button(label, attrs = '') {
    return `<button type="button" class="primary" ${attrs}>${esc(label)}</button>`;
  }

  function ghost(label, attrs = '') {
    return `<button type="button" class="ghost" ${attrs}>${esc(label)}</button>`;
  }

  function quiet(label, attrs = '') {
    return `<button type="button" class="quiet" ${attrs}>${esc(label)}</button>`;
  }

  function render() {
    if (state.screen === 'welcome') return renderWelcome();
    if (state.screen === 'account') return renderAccount(state.accountMode || 'create');
    if (state.screen === 'assessment') return renderAssessmentShell();
    if (state.screen === 'mirror') return renderMirror();
    if (state.screen === 'preferences') return renderPreferences();
    if (state.screen === 'home') return renderHome();
    if (state.screen === 'introductions') return renderIntroductions();
    if (state.screen === 'reflection') return renderReflection();
    return renderWelcome();
  }

  function renderWelcome() {
    root(`
      <section class="narrow">
        <div class="eyebrow">Begin with being understood</div>
        <h1>Dating should start with understanding you.</h1>
        <p class="lede">Wonder begins with the person beneath the profile: how you think, what you value, how you relate, and what kind of connection can actually hold you.</p>
        <div class="actions">
          ${button('Get started', 'data-action="new"')}
          ${ghost('I already have an account', 'data-action="signin"')}
        </div>
      </section>`, 'Private preview');
  }

  function renderAccount(mode = 'create') {
    state.accountMode = mode;
    save();
    const signin = mode === 'signin';
    const savedEmail = state.account?.email || '';
    root(`
      <section class="narrow card">
        <div class="eyebrow">${signin ? 'Sign in to Wonder' : 'Create your Wonder account'}</div>
        <h2>${signin ? 'Welcome back.' : 'First, create your account.'}</h2>
        <p class="muted">${signin ? 'Sign in to continue your assessment, Mirror, or introductions.' : 'You will go directly into the Wonder assessment after this.'}</p>
        <form id="accountForm" class="grid" novalidate>
          <label class="full">Email address<input id="email" type="email" autocomplete="email" value="${esc(savedEmail)}" required /></label>
          ${signin ? '' : '<label class="full">Phone number<input id="phone" type="tel" autocomplete="tel" placeholder="(555) 555-5555" required /></label>'}
          <label class="full">Password<input id="password" type="password" autocomplete="${signin ? 'current-password' : 'new-password'}" minlength="10" placeholder="At least 10 characters" required /></label>
          <div class="full status" id="status" hidden></div>
          <div class="full actions between">
            ${ghost('Back', 'data-action="back"')}
            ${button(signin ? 'Sign in' : 'Create account', 'data-submit-account')}
          </div>
          <div class="full">${quiet(signin ? 'New to Wonder? Create an account' : 'Already have an account? Sign in', 'data-action="toggle-account"')}</div>
        </form>
      </section>`, 'Account');
  }

  function showStatus(message, isError = false) {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
    el.classList.toggle('error', !!isError);
  }

  async function submitAccount() {
    if (busy) return;
    const mode = state.accountMode || 'create';
    const signin = mode === 'signin';
    const email = document.getElementById('email')?.value.trim().toLowerCase();
    const phone = document.getElementById('phone')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return showStatus('Enter a valid email address.', true);
    if (!signin && phone.replace(/\D/g, '').length < 10) return showStatus('Enter a valid phone number.', true);
    if (password.length < 10) return showStatus('Use a password with at least 10 characters.', true);
    busy = true;
    const submit = document.querySelector('[data-submit-account]');
    if (submit) submit.disabled = true;
    showStatus(signin ? 'Signing you in…' : 'Creating your account…');
    try {
      let action = signin ? 'signin' : 'create';
      let data;
      try {
        data = await post('/api/signup', { action, email, phone, password });
      } catch (err) {
        if (!signin && err.data?.code === 'account_exists') {
          state.accountMode = 'signin';
          save();
          renderAccount('signin');
          showStatus('That email already has an account. Enter the password to sign in.', true);
          return;
        }
        throw err;
      }
      const user = data.user || {};
      state.account = { id: user.id || null, email: user.email || email, phone: user.user_metadata?.phone || phone };
      state.auth = { mode: 'httpOnly-cookie', savedAt: Date.now(), expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
      save();
      if (action === 'create') {
        clearAssessment();
        state.mirror = null;
        state.preferences = null;
        save();
        go('assessment');
        return;
      }
      await hydrateAfterSignin();
    } catch (err) {
      showStatus(err.message || 'Unable to continue.', true);
    } finally {
      busy = false;
      const btn = document.querySelector('[data-submit-account]');
      if (btn) btn.disabled = false;
    }
  }

  async function hydrateAfterSignin() {
    showStatus('Restoring your progress…');
    try {
      const data = await post('/api/persist', { action: 'hydrate' });
      if (data.assessment) {
        state.mirror = data.assessment;
        state.archetype = data.assessment.mirror?.primary?.name || data.assessment.archetypes?.[0]?.name || null;
        assessment.complete = true;
        assessment.result = data.assessment;
        assessment.sessionId = data.assessment.assessment_session_id || null;
        saveAssessment();
      }
      if (data.active_assessment?.session) {
        assessment.sessionId = data.active_assessment.session.id;
        assessment.responses = data.active_assessment.responses || {};
        assessment.complete = false;
        assessment.result = null;
        saveAssessment();
      }
      if (data.profile) {
        state.preferences = {
          firstName: data.profile.first_name || '', currentCity: data.profile.current_city || '', gender: data.profile.gender || '', interested: data.profile.interested_in || '', intent: data.profile.relationship_intention || '', structure: data.profile.relationship_structure || '', children: data.profile.children || '', religion: data.profile.religion || '', ageRange: data.profile.age_range || '', distance: data.profile.max_distance || '', nonnegotiables: data.profile.nonnegotiables || ''
        };
      }
      if (data.birth) state.birth = { dob: data.birth.date_of_birth || '', tob: data.birth.time_of_birth || '', pob: data.birth.place_of_birth || '', toa: data.birth.time_accuracy || 'Unknown' };
      save();
      if (state.mirror && state.preferences?.firstName) return go('home');
      if (state.mirror) return go('mirror');
      return go('assessment');
    } catch {
      return go('assessment');
    }
  }

  function renderAssessmentShell() {
    if (!hasAuth()) return renderAccount('signin');
    root(`
      <section class="question">
        <div class="progress"><span id="progressBar"></span></div>
        <div class="eyebrow" id="sectionLabel">Assessment</div>
        <div id="questionMount"><div class="spinner"></div><p class="muted">Starting the Wonder assessment…</p></div>
        <div class="actions between" id="questionActions" hidden>
          ${ghost('Back', 'data-action="question-back"')}
          ${button('Continue', 'data-action="question-next" disabled')}
        </div>
      </section>`, 'Assessment');
    startAssessmentOnce();
  }

  async function startAssessmentOnce() {
    if (bootingAssessment) return;
    bootingAssessment = true;
    try {
      if (!assessment.sessionId || assessment.complete) {
        const start = await post('/api/assessment/start', { questionnaire_version: 'wonder-questionnaire-v2.2-elements' });
        assessment.sessionId = start.session?.id || assessment.sessionId;
        assessment.responses = start.responses || assessment.responses || {};
        assessment.history = [];
        assessment.complete = false;
        assessment.result = null;
        saveAssessment();
      }
      const next = await post('/api/assessment/next', { responses: assessment.responses || {} });
      if (next.complete) return completeAssessment();
      renderQuestion(next.item, next);
    } catch (err) {
      document.getElementById('questionMount').innerHTML = `<div class="question-title">Wonder could not start the assessment.</div><p class="muted error">${esc(err.message || 'Please sign in again and retry.')}</p><div class="actions">${ghost('Return to sign in', 'data-action="signin"')}</div>`;
    } finally {
      bootingAssessment = false;
    }
  }

  function renderQuestion(item, meta = {}) {
    if (!item) return;
    assessment.current = item;
    assessment.meta = meta;
    selected = assessment.responses?.[item.id] ?? null;
    questionShownAt = Date.now();
    saveAssessment();
    const count = Number(meta.count || Object.keys(assessment.responses || {}).length || 0);
    const target = Math.max(35, Number(meta.target_max || 36));
    const progress = document.getElementById('progressBar');
    if (progress) progress.style.width = `${Math.min(96, Math.max(4, (count / target) * 92))}%`;
    const section = document.getElementById('sectionLabel');
    if (section) section.textContent = meta.element ? `${meta.element} · ${meta.element_index || ''}` : 'Assessment';
    const mount = document.getElementById('questionMount');
    mount.innerHTML = `<div class="question-title">${esc(item.prompt)}</div>${renderInput(item)}`;
    const actions = document.getElementById('questionActions');
    if (actions) actions.hidden = false;
    updateContinue();
  }

  function renderInput(item) {
    if (item.type === 'scale') {
      return `<div class="scale options">${[1,2,3,4,5,6,7].map(v => `<button type="button" class="option ${Number(selected) === v ? 'selected' : ''}" data-select="${v}">${v}</button>`).join('')}</div><p class="muted">${esc(item.anchors?.[0] || 'Not at all')} · ${esc(item.anchors?.[1] || 'Extremely')}</p>`;
    }
    if (item.type === 'multi') {
      const arr = Array.isArray(selected) ? selected : [];
      return `<p class="muted">Choose up to ${Number(item.max || 3)}.</p><div class="options">${item.options.map((o, i) => `<button type="button" class="option ${arr.includes(i) ? 'selected' : ''}" data-select="${i}">${esc(o.label)}</button>`).join('')}</div>`;
    }
    if (item.type === 'rank') {
      const arr = Array.isArray(selected) ? selected : [];
      const ranked = arr.length ? `<div class="rank-list">${arr.map((i, r) => `<span>${r + 1}. ${esc(item.options[i]?.label || '')}</span>`).join('')}</div>` : '<p class="muted">Choose in priority order. Tap again to remove.</p>';
      return `${ranked}<div class="options">${item.options.map((o, i) => `<button type="button" class="option ${arr.includes(i) ? 'selected' : ''}" data-select="${i}">${esc(o.label)}</button>`).join('')}</div>`;
    }
    return `<div class="options">${(item.options || []).map((o, i) => `<button type="button" class="option ${Number(selected) === i ? 'selected' : ''}" data-select="${i}">${esc(o.label)}</button>`).join('')}</div>`;
  }

  function selectAnswer(value) {
    const item = assessment.current;
    if (!item) return;
    const n = Number(value);
    if (item.type === 'multi') {
      const max = Number(item.max || 3);
      let arr = Array.isArray(selected) ? [...selected] : [];
      arr = arr.includes(n) ? arr.filter(x => x !== n) : (arr.length < max ? [...arr, n] : arr);
      selected = arr;
    } else if (item.type === 'rank') {
      const max = Number(item.max || 5);
      let arr = Array.isArray(selected) ? [...selected] : [];
      arr = arr.includes(n) ? arr.filter(x => x !== n) : (arr.length < max ? [...arr, n] : arr);
      selected = arr;
    } else {
      selected = n;
    }
    renderQuestion(item, assessment.meta || {});
  }

  function validSelection() {
    const item = assessment.current;
    if (!item) return false;
    if (item.type === 'multi') return Array.isArray(selected) && selected.length > 0;
    if (item.type === 'rank') return Array.isArray(selected) && selected.length === Number(item.max || 5);
    return selected !== null && selected !== undefined;
  }

  function updateContinue() {
    const btn = document.querySelector('[data-action="question-next"]');
    if (!btn) return;
    btn.disabled = !validSelection() || busy;
  }

  async function nextQuestion() {
    if (busy || !validSelection() || !assessment.current) return;
    busy = true;
    const btn = document.querySelector('[data-action="question-next"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      await post('/api/assessment/respond', {
        session_id: assessment.sessionId,
        item_id: assessment.current.id,
        response: selected,
        response_time_ms: Math.max(0, Date.now() - questionShownAt),
        changed_count: 0
      });
      assessment.responses[assessment.current.id] = selected;
      assessment.history.push({ item: assessment.current, meta: assessment.meta });
      saveAssessment();
      const next = await post('/api/assessment/next', { responses: assessment.responses });
      if (next.complete) return completeAssessment();
      renderQuestion(next.item, next);
    } catch (err) {
      const mount = document.getElementById('questionMount');
      mount.insertAdjacentHTML('beforeend', `<p class="muted error">${esc(err.message || 'Wonder could not save that answer.')}</p>`);
      updateContinue();
    } finally {
      busy = false;
      const nextBtn = document.querySelector('[data-action="question-next"]');
      if (nextBtn) nextBtn.textContent = 'Continue';
      updateContinue();
    }
  }

  function backQuestion() {
    const prev = assessment.history.pop();
    if (!prev) return go('account');
    delete assessment.responses[assessment.current?.id];
    saveAssessment();
    renderQuestion(prev.item, prev.meta || {});
  }

  async function completeAssessment() {
    root(`<section class="narrow"><div class="spinner"></div><div class="eyebrow">Building your Mirror</div><h2>The pattern is coming together.</h2><p class="muted">Wonder is turning your assessment into a structured Mirror.</p></section>`, 'Mirror');
    try {
      const result = await post('/api/assessment/complete', { session_id: assessment.sessionId });
      assessment.complete = true;
      assessment.result = result;
      saveAssessment();
      state.mirror = result;
      state.archetype = result.mirror?.primary?.name || result.archetypes?.[0]?.name || null;
      save();
      go('mirror');
    } catch (err) {
      root(`<section class="narrow"><div class="eyebrow">Assessment saved</div><h2>Wonder could not finish the Mirror yet.</h2><p class="muted error">${esc(err.message || 'Try again in a moment.')}</p><div class="actions">${button('Try again', 'data-action="finish-assessment"')}</div></section>`, 'Assessment');
    }
  }

  function mirrorData() {
    const result = state.mirror || assessment.result || {};
    return result.mirror || result || {};
  }

  function renderMirror() {
    const m = mirrorData();
    const primary = m.primary?.name || state.archetype || assessment.result?.archetypes?.[0]?.name || 'Unfolding';
    root(`
      <section>
        <div class="eyebrow">Your Mirror</div>
        <h1>The ${esc(primary)}</h1>
        <p class="lede">A working profile based on your responses. It is not a verdict; it is a starting point Wonder will refine through feedback and real choices.</p>
        <div class="mirror-grid">
          <article><span>How you think</span><h3>${esc(m.move_title || m.headline || 'How you make sense of things')}</h3><p>${esc(m.move || 'Wonder is beginning to understand your cognitive pattern.')}</p></article>
          <article><span>What matters</span><h3>${esc(m.drive_title || 'What carries weight')}</h3><p>${esc(m.drive || 'Wonder is identifying what appears to matter most.')}</p></article>
          <article><span>How you relate</span><h3>${esc(m.relationship_title || 'How connection works for you')}</h3><p>${esc(m.relationship || 'Wonder is learning the shape of your relational needs.')}</p></article>
          <article><span>Open question</span><h3>${esc(m.tension_title || 'Where the pattern may be conflicted')}</h3><p>${esc(m.tension || 'Wonder will keep this provisional until it has stronger evidence.')}</p></article>
        </div>
        <div class="card" style="margin-top:22px">
          <h3>How accurate is this?</h3>
          <p class="muted">Your correction becomes part of the learning loop.</p>
          <div class="rating">${[1,2,3,4,5,6,7].map(v => `<button type="button" class="rate ${state.mirrorRating === v ? 'selected' : ''}" data-rate="${v}">${v}</button>`).join('')}</div>
          <textarea id="mirrorCorrection" placeholder="What feels accurate, incomplete, or wrong?">${esc(state.mirrorCorrection || '')}</textarea>
          <div class="actions between">${ghost('Back to assessment', 'data-action="assessment"')}${button('Save and continue', 'data-action="save-mirror"')}</div>
          <div class="status" id="status" hidden></div>
        </div>
      </section>`, 'Mirror');
  }

  async function saveMirrorFeedback() {
    const correction = document.getElementById('mirrorCorrection')?.value.trim() || '';
    state.mirrorCorrection = correction;
    save();
    if (!state.mirrorRating) return showStatus('Choose an accuracy rating first.', true);
    showStatus('Saving Mirror feedback…');
    try {
      await post('/api/persist', {
        action: 'mirror_feedback',
        person_model_snapshot_id: assessment.result?.snapshot_id || state.mirror?.snapshot_id || null,
        assessment_session_id: assessment.sessionId || assessment.result?.assessment_session_id || null,
        overall_accuracy: state.mirrorRating,
        archetype_resonance: state.mirrorRating,
        correction
      });
    } catch (_) {}
    go('preferences');
  }

  function renderPreferences() {
    const p = state.preferences || {};
    const b = state.birth || {};
    root(`
      <section class="card">
        <div class="eyebrow">Dating preferences</div>
        <h2>Now tell Wonder what should be practical.</h2>
        <p class="muted">The assessment builds your Mirror first. These details help Wonder avoid introductions that are structurally wrong.</p>
        <form id="prefForm" class="grid" novalidate>
          <label>First name<input id="firstName" value="${esc(p.firstName || '')}" required /></label>
          <label>Current city<input id="currentCity" value="${esc(p.currentCity || '')}" placeholder="Dallas, TX" required /></label>
          <label>Date of birth<input id="dob" type="date" value="${esc(b.dob || '')}" required /></label>
          <label>Time of birth<input id="tob" type="time" value="${esc(b.tob || '')}" /></label>
          <label class="full">Place of birth<input id="pob" value="${esc(b.pob || '')}" placeholder="City, state or country" /></label>
          <label>Gender<select id="gender" required>${opts(['','Woman','Man','Nonbinary','Self-describe'], p.gender)}</select></label>
          <label>Interested in<select id="interested" required>${opts(['','Men','Women','Everyone'], p.interested)}</select></label>
          <label>Relationship intention<select id="intent" required>${opts(['','Life partnership / marriage','Long-term relationship','Meaningful dating','Open to discovering'], p.intent)}</select></label>
          <label>Relationship structure<select id="structure" required>${opts(['Monogamy','Non-monogamy','Open / unsure'], p.structure || 'Monogamy')}</select></label>
          <label>Children<select id="children" required>${opts(['','Want children','Do not want children','Have children and want more','Have children and do not want more','Unsure'], p.children)}</select></label>
          <label>Age range<input id="ageRange" value="${esc(p.ageRange || '')}" placeholder="e.g. 27–36" required /></label>
          <label>Maximum distance<select id="distance">${opts(['25 miles','50 miles','100 miles','Same country','Anywhere'], p.distance || '25 miles')}</select></label>
          <label class="full">Religion / spiritual tradition<input id="religion" value="${esc(p.religion || '')}" placeholder="Optional" /></label>
          <label class="full">Absolute non-negotiables<textarea id="nonnegotiables" placeholder="Anything Wonder should never compromise on?">${esc(p.nonnegotiables || '')}</textarea></label>
          <div class="full status" id="status" hidden></div>
          <div class="full actions between">${ghost('Back to Mirror', 'data-action="mirror"')}${button('Save profile', 'data-action="save-preferences"')}</div>
        </form>
      </section>`, 'Preferences');
  }

  function opts(values, selectedValue) {
    return values.map(v => `<option value="${esc(v)}" ${v === selectedValue ? 'selected' : ''}>${esc(v || 'Choose')}</option>`).join('');
  }

  async function savePreferences() {
    if (busy) return;
    const p = {
      firstName: val('firstName'), currentCity: val('currentCity'), gender: val('gender'), interested: val('interested'), intent: val('intent'), structure: val('structure'), children: val('children'), religion: val('religion'), ageRange: val('ageRange'), distance: val('distance'), nonnegotiables: val('nonnegotiables')
    };
    const b = { dob: val('dob'), tob: val('tob'), pob: val('pob'), toa: 'Unknown' };
    for (const key of ['firstName','currentCity','gender','interested','intent','structure','children','ageRange']) {
      if (!p[key]) return showStatus('Complete the required preference fields before continuing.', true);
    }
    if (!b.dob) return showStatus('Enter your date of birth before continuing.', true);
    busy = true;
    showStatus('Saving your profile…');
    try {
      await post('/api/persist', { birth: b, essentials: p, answers: assessment.responses || {} });
      state.preferences = p;
      state.birth = b;
      save();
      go('home');
    } catch (err) {
      showStatus(err.message || 'Unable to save profile.', true);
    } finally { busy = false; }
  }

  function val(id) { return document.getElementById(id)?.value.trim() || ''; }

  function renderHome() {
    const p = state.preferences || {};
    root(`
      <section>
        <div class="eyebrow">Wonder</div>
        <h1>Your profile is active.</h1>
        <p class="lede">Wonder has your Mirror and the practical context it needs to begin making careful introductions.</p>
        <div class="pill-row"><span class="pill">${esc(p.firstName || 'You')}</span><span class="pill">The ${esc(state.archetype || 'Unfolding')}</span><span class="pill">${esc(p.currentCity || 'Location pending')}</span></div>
        <div class="home-grid">
          <button type="button" class="tile" data-action="introductions"><span>Introductions</span><strong>See who Wonder found</strong></button>
          <button type="button" class="tile" data-action="preferences"><span>Profile</span><strong>Edit practical preferences</strong></button>
          <button type="button" class="tile" data-action="mirror"><span>Mirror</span><strong>Review your profile</strong></button>
          <button type="button" class="tile" data-action="logout"><span>Account</span><strong>Sign out</strong></button>
        </div>
      </section>`, 'Wonder');
  }

  async function renderIntroductions() {
    if (!hasAuth()) return renderAccount('signin');
    root(`<section class="narrow"><div class="spinner"></div><div class="eyebrow">Introductions</div><h2>Wonder is looking.</h2><p class="muted">Not for the highest score. For a relationship hypothesis with enough evidence to deserve attention.</p></section>`, 'Introductions');
    try {
      const data = await post('/api/matches/generate', {});
      const matches = data.matches || [];
      if (!matches.length) {
        root(`<section class="narrow"><div class="eyebrow">Introductions</div><h2>Not yet.</h2><p class="muted">Wonder does not currently have enough conviction to introduce someone. That is better than forcing a weak match.</p><div class="actions">${ghost('Back home', 'data-action="home"')}</div></section>`, 'Introductions');
        return;
      }
      const m = matches[0];
      state.match = m;
      save();
      root(`
        <section class="narrow">
          <div class="eyebrow">Your introduction</div>
          <h1>We found someone.</h1>
          <article class="match-card">
            <span>${esc(m.conviction || 'promising')} · ${Math.round(Number(m.score || 0))}/100</span>
            <h3>${esc(m.first_name || 'Someone worth meeting')}</h3>
            <p>${esc(m.current_city || 'Location private')}${m.distance_miles != null ? ` · ${Math.round(m.distance_miles)} miles` : ''}</p>
            ${(m.rationale?.strengths || []).slice(0,3).map(x => `<p>${esc(x)}</p>`).join('') || '<p>Wonder sees enough compatibility to treat this as worth exploring.</p>'}
            ${(m.rationale?.tensions || []).slice(0,1).map(x => `<p><strong>Worth watching:</strong> ${esc(x)}</p>`).join('')}
          </article>
          <div class="actions between">${ghost('Not for me', 'data-action="decline-match"')}${button('Explore this person', 'data-action="explore-match"')}</div>
          <div class="status" id="status" hidden></div>
        </section>`, 'Introductions');
    } catch (err) {
      const message = err.status === 409 ? 'Complete your Mirror before Wonder begins introductions.' : (err.message || 'Unable to load introductions.');
      root(`<section class="narrow"><div class="eyebrow">Introductions</div><h2>Introductions are not ready.</h2><p class="muted error">${esc(message)}</p><div class="actions">${ghost('Back home', 'data-action="home"')}</div></section>`, 'Introductions');
    }
  }

  async function reactToMatch(reaction) {
    if (!state.match?.match_id) return showStatus('No active match to update.', true);
    showStatus('Saving your choice…');
    try {
      await post('/api/matches/generate', { action: 'reaction', match_id: state.match.match_id, reaction });
      if (reaction === 'explore') return go('reflection');
      state.match = null;
      save();
      showStatus('Understood. Wonder will use this as a signal, not a judgment.');
      setTimeout(() => go('home'), 900);
    } catch (err) { showStatus(err.message || 'Unable to save that choice.', true); }
  }

  function renderReflection() {
    const m = state.match || {};
    root(`
      <section class="narrow card">
        <div class="eyebrow">Reflection</div>
        <h2>What happened when the hypothesis met reality?</h2>
        <p class="muted">This is how Wonder becomes more accurate over time.</p>
        <div class="grid">
          <label>Felt understood<select id="felt_understood">${opts(['','1','2','3','4','5','6','7'], '')}</select></label>
          <label>Conversational ease<select id="conversational_ease">${opts(['','1','2','3','4','5','6','7'], '')}</select></label>
          <label>Attraction<select id="attraction">${opts(['','1','2','3','4','5','6','7'], '')}</select></label>
          <label>Values fit<select id="values_fit">${opts(['','1','2','3','4','5','6','7'], '')}</select></label>
          <label class="full">Notes<textarea id="outcomeNotes" placeholder="What felt promising, wrong, surprising, or worth testing again?"></textarea></label>
          <div class="full status" id="status" hidden></div>
          <div class="full actions between">${ghost('Skip for now', 'data-action="home"')}${button('Save reflection', 'data-action="save-reflection"')}</div>
        </div>
      </section>`, `Reflecting on ${m.first_name || 'introduction'}`);
  }

  async function saveReflection() {
    const m = state.match || {};
    if (!m.candidate_user_id) return go('home');
    showStatus('Saving reflection…');
    try {
      await post('/api/persist', {
        action: 'match_outcome',
        candidate_user_id: m.candidate_user_id,
        match_id: m.match_id || null,
        felt_understood: val('felt_understood') || null,
        conversational_ease: val('conversational_ease') || null,
        attraction: val('attraction') || null,
        values_fit: val('values_fit') || null,
        notes: val('outcomeNotes')
      });
      go('home');
    } catch (err) { showStatus(err.message || 'Unable to save reflection.', true); }
  }

  async function logout() {
    try { await post('/api/signup', { action: 'logout' }); } catch (_) {}
    state.auth = null;
    save();
    go('welcome');
  }

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const select = event.target.closest('[data-select]')?.dataset.select;
    const rate = event.target.closest('[data-rate]')?.dataset.rate;
    if (select !== undefined) { event.preventDefault(); selectAnswer(select); return; }
    if (rate !== undefined) { event.preventDefault(); state.mirrorRating = Number(rate); save(); renderMirror(); return; }
    if (!action) return;
    event.preventDefault();
    if (action === 'new') return renderAccount('create');
    if (action === 'signin') return renderAccount('signin');
    if (action === 'toggle-account') return renderAccount((state.accountMode || 'create') === 'signin' ? 'create' : 'signin');
    if (action === 'back') return go('welcome');
    if (action === 'question-next') return nextQuestion();
    if (action === 'question-back') return backQuestion();
    if (action === 'finish-assessment') return completeAssessment();
    if (action === 'save-mirror') return saveMirrorFeedback();
    if (action === 'save-preferences') return savePreferences();
    if (action === 'introductions') return go('introductions');
    if (action === 'explore-match') return reactToMatch('explore');
    if (action === 'decline-match') return reactToMatch('decline');
    if (action === 'save-reflection') return saveReflection();
    if (action === 'logout') return logout();
    if (['welcome','account','assessment','mirror','preferences','home','reflection'].includes(action)) return go(action);
  });

  document.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.id === 'accountForm') submitAccount();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && state.screen === 'account') {
      event.preventDefault();
      submitAccount();
    }
  });

  render();
})();
