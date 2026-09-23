/* Consumer journey. Synthetic state stays in this tab; live changes use authenticated APIs. */
window.WonderJourneyUI = function (ctx) {
  "use strict";
  const {
      state,
      esc,
      mount,
      page,
      heading,
      btn,
      arrow,
      eye,
      go,
      api,
      experience,
      toast,
      error,
      statusEl,
      confirm,
    } = ctx,
    J = window.WonderJourney;
  const demoKey = "wonder_journey_demo_v2";
  let world = null,
    own = null,
    owner = null,
    sectionId = "portrait",
    tab = "overview",
    pendingCorrection = null,
    selectedContext = null,
    writeDraft = null,
    saveTimer = null,
    saveChain = Promise.resolve(),
    dirty = false,
    mirrorMessages = [],
    pair = null,
    lastError = "",
    scenario = "normal",
    liveEnabled = false,
    allConnections = [],
    agentProposal = null,
    mirrorLive = null,
    pendingMessage = null;
  let introView = "portrait",
    accountView = "profile",
    mirrorDraft = "",
    reflectionDraft = null,
    promptIndex = 0;
  const paths = {
    home: "M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10",
    report:
      "M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Zm9-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    introductions:
      "M8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 21v-4a6 6 0 0 1 12 0v4m1-9a6 6 0 0 1 7 5v4",
    journal: "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4",
    settings: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a8 8 0 0 1 16 0v3",
  };
  const vector = (p) =>
    `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`;
  const control = (label, action, extra = "", secondary = false) =>
    `<button type="button" class="${secondary ? "text-btn" : "btn"}" data-w-action="${action}" ${extra}>${label}</button>`;
  const field = (label, name, value = "", type = "text", attrs = "") =>
    `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const area = (label, name, value = "", attrs = "") =>
    `<label class="field">${label}<textarea name="${name}" ${attrs}>${esc(value)}</textarea></label>`;
  const check = (label, name, value) =>
    `<label class="check-label"><input type="checkbox" name="${name}" ${value ? "checked" : ""}><span>${label}</span></label>`;
  const select = (label, name, values, value) =>
    `<label class="field">${label}<select name="${name}">${values.map(([v, l]) => `<option value="${v}" ${v === value ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  const notice = (t) => `<div class="notice">${t}</div>`;
  function download(name, data, type = "application/json") {
    const blob = new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function storeDemo() {
    try {
      sessionStorage.setItem(demoKey, JSON.stringify(world));
    } catch {
      throw new Error(
        "Not saved: this tab has run out of storage. Export your writing before resetting.",
      );
    }
  }
  async function load(force = false) {
    const key = state.mode === "demo" ? "demo" : state.user?.id;
    if (owner && owner !== key) {
      own = null;
      world = null;
      pair = null;
      writeDraft = null;
      selectedContext = null;
      mirrorMessages = [];
      mirrorDraft = "";
      pendingMessage = null;
      reflectionDraft = null;
      introView = "portrait";
      accountView = "profile";
      pendingCorrection = null;
      dirty = false;
      clearTimeout(saveTimer);
    }
    if (owner === key && own && !force) return;
    if (key === "demo") {
      try {
        world = JSON.parse(sessionStorage.getItem(demoKey));
      } catch {}
      if (!world?.users) world = J.fixture();
      own = world.users[world.actor];
      if (world.reports?.[world.actor])
        state.report = world.reports[world.actor];
      if (world.assessments?.[world.actor])
        state.assessment = world.assessments[world.actor];
      pair = world.pair;
      scenario = world.scenario || "normal";
      state.name = own.basics.name;
    } else {
      world = null;
      const d = await api("/api/journey", { action: "load" });
      own = d.state;
      allConnections = d.connections || [];
      pair =
        allConnections.find((p) => p.id === pair?.id) || d.connection || null;
      state.name = own.basics.name;
      liveEnabled = d.live_introductions === true;
    }
    owner = key;
    applyDisplay();
  }
  function applyDisplay() {
    document.documentElement.classList.toggle(
      "large-text",
      !!own?.display.largeText,
    );
    document.documentElement.classList.toggle(
      "quiet-motion",
      !!own?.display.reducedMotion,
    );
  }
  async function change(type, payload = {}) {
    await load();
    const event = { type, payload };
    if (state.mode === "demo") {
      const next = J.privateEvent(own, event);
      world.users[world.actor] = next;
      storeDemo();
      own = next;
    } else {
      const d = await api("/api/journey", {
        action: "change",
        expected_version: own.version,
        event,
      });
      own = d.state;
    }
    applyDisplay();
    return own;
  }
  async function connect(type, payload = {}) {
    await load();
    if (state.mode === "demo") {
      if (scenario === "failed")
        throw new Error(
          "Simulated service failure. Nothing was sent. Choose Normal in demo scenarios and retry.",
        );
      world.pair = J.pairEvent(
        world.pair,
        { type, payload },
        world.actor,
        world.users,
      );
      storeDemo();
      pair = world.pair;
    } else {
      const d = await api("/api/journey", {
        action: "connection",
        id: pair?.id,
        expected_version: pair?.version,
        event: { type, payload },
      });
      pair = d.connection;
    }
    return pair;
  }
  function demoTools() {
    if (state.mode !== "demo") return "";
    return `<details class="demo-tools"><summary>Demonstration controls</summary><p class="small">Two fictional adults. Actions and written sample responses remain in this tab. No real messages, payments, notifications, or learning.</p><div class="actions">${control("Use " + (world.actor === "alex" ? "Rowan" : "Alex") + "’s perspective", "switch", "", "true")}${control("Start with discovery", "fresh", "", "true")}${control("Reset demonstration", "reset", "", "true")}</div>${select(
      "Scenario",
      "demo-scenario",
      [
        ["normal", "Normal journey"],
        ["empty", "No eligible introduction"],
        ["unavailable", "Availability changed"],
        ["declined", "Declined"],
        ["cancelled", "Date cancelled"],
        ["failed", "Service failure"],
        ["blocked", "Blocked"],
      ],
      scenario,
    )}</details>`;
  }
  function shell(kicker, title, body, aside = "") {
    mount(
      page(
        `${heading(kicker, title, aside)}${body}${statusEl()}${demoTools()}`,
      ),
    );
    const h = document.querySelector("#main h1");
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }
  function nav() {
    const destination = ["atlas", "assessment", "threshold", "reveal"].includes(
      state.screen,
    )
      ? "home"
      : state.screen === "reflection"
        ? "introductions"
        : state.screen;
    const active = ["ai", "review"].includes(destination)
      ? "report"
      : ["portrait", "basics"].includes(state.screen)
        ? "settings"
        : destination;
    return `<nav class="nav" aria-label="Main navigation">${[
      ["home", "Home"],
      ["report", "Mirror"],
      ["introductions", "Introductions"],
      ["journal", "Journal"],
      ["settings", "Account"],
    ]
      .map(
        ([s, l]) =>
          `<button data-action="${s}" class="${active === s ? "active" : ""}" ${active === s ? 'aria-current="page"' : ""}>${vector(paths[s])}<span>${l}</span></button>`,
      )
      .join("")}</nav>`;
  }
  function nextAction() {
    if (!own.consent.process || !own.basics.dob)
      return [
        "Begin with the essentials",
        "Set up your private space",
        "basics",
      ];
    if (state.assessment && !state.assessment.complete)
      return ["Your discovery is saved", "Continue discovery", "assessment"];
    if (!state.report && !(state.mode === "demo" && own.mirrorReviewed))
      return ["A thoughtful starting point", "Begin discovery", "assessment"];
    if (!own.mirrorReviewed)
      return ["Your first Mirror is ready", "Review your Mirror", "report"];
    if (!own.portrait.approved)
      return [
        "Choose what another person can see",
        "Prepare your Connection Portrait",
        "portrait",
      ];
    const p = viewPair();
    if (own.availability !== "available" && p?.status !== "mutual")
      return [
        "Introductions are paused",
        "Manage your availability",
        "settings",
      ];
    if (p?.plan?.status === "confirmed")
      return [
        "You have a confirmed plan",
        "View your meeting",
        "introductions",
      ];
    if (p?.status === "mutual")
      return [
        "You are both interested",
        "Open your conversation",
        "introductions",
      ];
    if (p?.status === "pending" && p.myInterest)
      return [
        "Your interest is recorded",
        "View your introduction",
        "introductions",
      ];
    if (p && ["proposed", "pending"].includes(p.status))
      return [
        "An introduction to consider",
        "Read the introduction",
        "introductions",
      ];
    return [
      "Understanding before introduction",
      "View introduction status",
      "introductions",
    ];
  }
  function home() {
    const [title, label, action] = nextAction(),
      p = viewPair();
    const complete = !!(
      state.assessment?.complete ||
      state.report ||
      own.mirrorReviewed
    );
    const stages = [
      ["Discover", complete, "atlas"],
      ["Review", own.mirrorReviewed, "report"],
      ["Share", own.portrait.approved, "portrait"],
      ["Connect", p?.status === "mutual", "introductions"],
      ["Reflect", own.reflections.length > 0, "reflection"],
    ];
    const next = stages.findIndex((x) => !x[1]);
    shell(
      "Your sanctuary",
      `Welcome${own.basics.name ? ", " + esc(own.basics.name) : ""}.<br><em>Come as you are.</em>`,
      `
      <div class="home-focus"><section class="home-next"><p class="eyebrow">Your next step</p><h2>${esc(title)}</h2><p>${action === "report" ? "There is something here to recognise, question, and make your own. Your understanding has room to change." : action === "introductions" ? "Make space for a person when there is a reason to be curious. Your pace belongs to you." : "A little attention to yourself is a worthwhile beginning. You can return to this space whenever you need."}</p><div class="actions">${action === "assessment" ? btn(label + " " + arrow, "atlas") : control(label + " " + arrow, action)}</div><span class="privacy-caption">${vector("M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4V10Zm8 5v3")} Your private space</span></section>${ctx.pool("A little closer.<br><em>A little clearer.</em>", false)}</div>
      <section class="journey-path" aria-label="Your WONDER journey"><div class="section-head"><h3>Your unfolding journey</h3><span class="eyebrow">At your own pace</span></div><ol>${stages.map(([name, done, route], i) => `<li class="${done ? "complete" : i === next ? "current" : ""}"><button data-w-action="${route}" ${i === next ? 'aria-current="step"' : ""}><span class="journey-index">${String(i + 1).padStart(2, "0")}</span><strong>${name}</strong><small>${done ? "Visited" : i === next ? "A place to begin" : "When you are ready"}</small></button></li>`).join("")}</ol></section>
      <div class="home-editorial"><section class="quiet-prompt"><p class="eyebrow">An invitation to notice</p><h3>When did you feel<br>most like <em>yourself?</em></h3><p>No performance. No particular answer. Just a thought worth giving room.</p>${control("Open your journal " + arrow, "journal", "", "true")}</section><section class="home-note"><p class="eyebrow">A space that stays yours</p><h3>Understanding<br><em>before introduction.</em></h3><p>Your Mirror and journal remain here whether you are meeting someone, waiting, or taking a pause.</p>${control("Review what you share", "portrait", "", "true")}</section></div>`,
    );
  }

  function basics() {
    shell(
      "Your private space",
      "First, <em>the essentials.</em>",
      `<div class="reading-column"><p>Your full birth date stays private. Your approved Connection Portrait can show your age and broad city.</p><form id="w-basics" class="form-grid">${field("Chosen name", "name", own.basics.name, "text", 'required maxlength="80"')}${field("Date of birth", "dob", own.basics.dob, "date", "required")}${field("City or broad location", "city", own.basics.city, "text", 'required maxlength="120"')}<div class="full">${check("WONDER may process my discovery answers to prepare my private Mirror. Journals are not interpreted automatically.", "process", own.consent.process)}<p class="small muted">Account verification confirms access to your email; it is not identity verification. Authorized service operators may access records to run and support the service.</p><button class="btn">Save and continue</button></div></form></div>`,
    );
  }
  function how() {
    shell(
      "How WONDER works",
      "Understanding comes <em>first.</em>",
      `<div class="reading-column"><ol class="steps"><li><h3>Discover yourself.</h3><p>Move through five elements at your own pace. Your answers form a starting point.</p></li><li><h3>Review your Mirror.</h3><p>Read what is supported, notice what remains unclear, and correct what does not fit.</p></li><li><h3>Consider an introduction.</h3><p>Choose your shared portrait and availability. Introductions depend on mutual preferences, cohort access, and the local network.</p></li></ol>${notice("Your Mirror and journal are private from other members. An introduction sees only the portrait you approve. Optional remembered insights and permission to use them for introductions are separate choices.")}<div class="actions">${btn("Begin", "create")}</div></div>`,
    );
  }
  function sections() {
    return (state.report?.sections || []).map((s) => {
      const result = J.effective(s, own);
      if (
        ["rejected", "unassigned"].includes(own.lens) &&
        !own.corrections[s.id]
      )
        return {
          ...result,
          editorial: "",
          ...(s.label === "Archetypal lens" || !s.evidenceKeys?.length
            ? {
                body:
                  "There is not enough individual evidence for a claim in this section. " +
                  s.question,
                label: "Still unclear",
                support:
                  "You chose not to use an archetypal lens. No archetypal claim is being applied.",
              }
            : {}),
        };
      return result;
    });
  }
  function reportNav() {
    return `<div class="mirror-subnav" aria-label="Mirror views">${[
      ["overview", "Overview"],
      ["full", "Full Mirror"],
      ["conversation", "Conversation"],
      ["changes", "Changes"],
    ]
      .map(([t, l]) =>
        control(
          l,
          "mirror-tab",
          `data-tab="${t}" aria-pressed="${tab === t}"`,
          true,
        ),
      )
      .join("")}</div>`;
  }
  async function mirror() {
    if (state.mode !== "demo" && mirrorLive === null) {
      try {
        mirrorLive = (await api("/api/chat", { action: "status" })).live;
      } catch {
        mirrorLive = false;
      }
    }
    if (!state.report) {
      if (state.mode === "demo") {
        state.report = (
          await experience({
            action: "demo_report",
            name: world.actor === "alex" ? "Seer" : "Architect",
          })
        ).report;
      } else {
        state.report = (await experience({ action: "report" })).report;
      }
    }
    if (!["report", "ai"].includes(state.screen)) return;
    const ss = sections(),
      r = state.report;
    let body = "";
    if (tab === "overview") {
      const observations = ss
        .filter((s) => !["strain", "changing", "uncertainty"].includes(s.id))
        .slice(0, 3);
      body = `<div class="mirror-overview"><div><p class="eyebrow">${esc(own.basics.name || state.name)} / A working portrait</p><h2>${esc(ss[0]?.body || "Your first Mirror begins with discovery.")}</h2><p class="small muted">${r.evidence ? "Based on your discovery self-report." : "An authored sample portrait. Complete discovery for response-based observations."} You can disagree with every interpretation here.</p></div><aside class="lens-panel">${eye}<p class="eyebrow">An optional lens</p><h3>${["rejected", "unassigned"].includes(own.lens) ? "No archetype assigned" : own.lens === "mixed" || r.lens_status === "mixed" ? `${esc(r.name)}${r.secondary ? " / " + esc(r.secondary) : ""}` : "The " + esc(r.name)}</h3><p>Language to try, never an identity to obey.</p>${select(
        "How to use this lens",
        "lens",
        [
          ["provisional", "Keep it provisional"],
          ["mixed", "Use a mixed lens"],
          ["unassigned", "Leave me unassigned"],
          ["rejected", "This lens does not fit"],
        ],
        own.lens,
      )}</aside></div><div class="observations">${observations.map((s) => `<article><p class="eyebrow">${esc(s.label)}</p><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>${control("Review this insight", "section", `data-id="${s.id}"`, true)}</article>`).join("")}</div><section class="quiet-prompt"><p class="eyebrow">An open question</p><h3>${esc(r.prompt)}</h3><div class="actions">${control("Read your full Mirror", "mirror-tab", 'data-tab="full"')}${control("I have reviewed my Mirror", "reviewed", "", "true")}</div></section>`;
    }
    if (tab === "full") {
      const current = ss.findIndex((s) => s.id === sectionId),
        index = current < 0 ? 0 : current,
        s = ss[index];
      body = `<div class="mirror-reading"><aside class="mirror-contents"><p class="eyebrow">Your Mirror / ${ss.length} chapters</p><label class="field mobile-chapter-select">Report section<select name="report-section">${ss.map((x, i) => `<option value="${x.id}" ${i === index ? "selected" : ""}>${i + 1}. ${esc(x.title)}</option>`).join("")}</select></label><nav class="chapter-index" aria-label="Mirror chapters">${ss.map((x, i) => `<button data-w-action="section" data-id="${x.id}" ${i === index ? 'aria-current="page"' : ""}><span>${String(i + 1).padStart(2, "0")}</span><span>${esc(x.title)}</span>${own.corrections[x.id] ? '<span class="chapter-reviewed" aria-label="Reviewed"></span>' : ""}</button>`).join("")}</nav><p class="small muted">You can use every chapter without accepting an archetype.</p>${state.mode === "demo" ? `<details><summary>Authored archetype library</summary><label class="field">Explore the authored library<select name="report-archetype">${(state.catalog || []).map((x) => `<option ${x.name === r.name ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label></details>` : ""}</aside><article class="reading-column mirror-chapter"><div class="chapter-dateline"><span class="eyebrow">Chapter ${String(index + 1).padStart(2, "0")} / ${ss.length}</span><span class="status-pill">${esc(s?.label)}</span></div><h2>${esc(s?.title)}</h2>${s?.optional ? '<p class="small muted">Optional, private, and interpretive.</p><details><summary>Explore this section</summary>' : ""}<p class="mirror-insight">${esc(s?.body)}</p><div class="insight-foundations"><section><p class="eyebrow">What supports this</p><p>${esc(s?.support)}</p></section><section><p class="eyebrow">Where it may apply</p><p>${esc(s?.context)}</p></section></div>${s?.label === "A possible pattern" && s.editorial ? `<details><summary>The archetypal perspective</summary><p>${esc(s.editorial)}</p></details>` : ""}<blockquote>${esc(s?.question)}</blockquote>${s?.optional ? "</details>" : ""}<div class="claim-response"><p class="eyebrow">What did we understand?</p><p class="small muted">Your correction can be more specific than the interpretation.</p><div class="actions">${[
        ["fits", "Fits"],
        ["partly", "Partly"],
        ["doesnt", "Doesn’t fit"],
        ["unsure", "Unsure"],
      ]
        .map(([v, l]) =>
          control(
            l,
            "correct",
            `data-fit="${v}" data-id="${s?.id}" aria-pressed="${own.corrections[s?.id]?.fit === v}"`,
            true,
          ),
        )
        .join(
          "",
        )}</div></div>${control("Explore this with Mirror", "explore-claim", `data-id="${s?.id}"`, true)}<div class="chapter-pagination">${index > 0 ? control("Previous chapter", "section", `data-id="${ss[index - 1].id}"`, true) : "<span></span>"}${index < ss.length - 1 ? control("Next chapter " + arrow, "section", `data-id="${ss[index + 1].id}"`) : control("I have reviewed my Mirror", "reviewed")}</div>${index < ss.length - 1 ? control("I have reviewed my Mirror", "reviewed", "", "true") : ""}</article></div>`;
    }
    if (tab === "changes")
      body = `<div class="reading-column"><h2>Understanding, revised.</h2><p>Each change is explicit. Corrections replace the claim in your Mirror and are excluded from accepted context unless you confirm the revised wording.</p>${
        own.history.length
          ? own.history
              .slice()
              .reverse()
              .map(
                (h) =>
                  `<details class="change-item"><summary>${esc(new Date(h.at).toLocaleDateString())} · ${esc(h.claim)} · ${esc(h.fit)}</summary><p><strong>Earlier interpretation:</strong> ${esc(h.original)}</p><p><strong>Your revision:</strong> ${esc(h.revision || h.fit)}</p><p>Introduction use: ${h.matching ? "Permitted for the revised statement" : "Not permitted"}. Report: ${esc(h.reportVersion)}</p></details>`,
              )
              .join("")
          : '<p class="notice">No changes yet. Your first correction belongs here.</p>'
      }</div>`;
    if (tab === "conversation") body = conversation();
    shell(
      "Mirror",
      "A clearer view.<br><em>Room to revise.</em>",
      reportNav() + body,
    );
    if (state.mode === "demo" && !state.catalog.length) {
      state.catalog = (await experience({ action: "catalog" })).reports;
      if (tab === "full") return mirror();
    }
  }
  function correction() {
    const p = pendingCorrection;
    if (!p) return mirror();
    shell(
      "Review a correction",
      "Your words <em>matter.</em>",
      `<div class="reading-column"><p class="eyebrow">Original interpretation</p><p>${esc(p.original)}</p><form id="w-correction">${area("What should we understand instead?", "revision", p.revision, 'maxlength="4000" ' + (["partly", "doesnt"].includes(p.fit) ? "required" : ""))}${check("Allow this reviewed statement to inform introductions.", "matching", false)}<p class="small muted">Your private wording is never displayed in another person’s portrait. Saving pauses new introductions until you review availability.</p><div class="actions"><button class="btn">Preview revision</button>${control("Cancel", "report", "", "true")}</div></form></div>`,
    );
  }
  function correctionPreview(p) {
    pendingCorrection = {
      ...pendingCorrection,
      revision: p.revision,
      matching: p.matching === "on",
    };
    shell(
      "Before applying",
      "Does this say <em>what you mean?</em>",
      `<div class="reading-column"><p class="eyebrow">Original</p><p>${esc(pendingCorrection.original)}</p><p class="eyebrow">Your correction / proposed replacement</p><blockquote>${esc(p.revision || { fits: "You confirmed this insight.", unsure: "This interpretation remains uncertain and will not be treated as accepted truth." }[pendingCorrection.fit])}</blockquote><p>Introduction use: ${pendingCorrection.matching && own.consent.matching ? "Permitted for this revised statement" : "Not permitted"}. The earlier claim remains in your private change history.</p><div class="actions">${control("Apply this revision", "apply-correction")}${control("Edit my words", "edit-correction", "", "true")}</div></div>`,
    );
  }
  function conversation() {
    const unavailable = state.mode !== "demo" && !mirrorLive;
    return `<div class="mirror-dialogue"><aside class="mirror-water"><div class="mirror-water-copy"><p class="eyebrow">The living Mirror</p><h2>Let the surface<br><em>settle.</em></h2><p>Begin with what happened.<br>Make room for what it might mean.</p></div>${ctx.pool("", false)}</aside><section class="mirror-conversation"><div class="conversation-heading"><span class="eyebrow">${state.mode === "demo" ? "Sample conversation" : unavailable ? "Conversation unavailable" : "Private AI reflection"}</span><span class="status-pill">${state.mode === "demo" ? "Written examples" : unavailable ? "Not connected" : "Mirror"}</span></div>${unavailable ? notice("Live Mirror is not connected yet. Your saved report, corrections, and private journal are ready to use.") : ""}<details class="context-drawer" ${selectedContext ? "open" : ""}><summary>Context: ${selectedContext ? esc(selectedContext.title) : "Only what you type below"}</summary><p class="small">No journal entries, private report, or remembered insights are retrieved automatically.</p>${selectedContext ? `<blockquote>${esc(selectedContext.text)}</blockquote>${control("Remove selected context", "remove-context", "", "true")}` : ""}</details><div class="chat-prompts">${["Explore something in my report", "Understand a reaction", "Prepare for a conversation", "Reflect on a date"].map((t) => control(t, "mirror-prompt", `data-prompt="${t}"`, true)).join("")}</div><div class="mirror-thread" role="log" aria-live="polite" aria-label="Conversation with Mirror">${mirrorMessages.map((m) => `<article class="${m.role === "user" ? "mine" : ""}"><p class="eyebrow">${m.role === "user" ? "You" : state.mode === "demo" ? "WONDER Mirror / Written sample" : "WONDER Mirror"}</p><p>${esc(m.body)}</p></article>`).join("") || `<div class="conversation-empty">${eye}<h3>What is on your mind?</h3><p>What did you notice, before deciding what it meant?</p></div>`}</div><form id="w-mirror">${area("Your message", "message", mirrorDraft, 'required maxlength="6000" placeholder="There’s something I’ve been trying to put into words…"')}<div class="compose-bottom"><p class="small muted">Nothing becomes an enduring memory without your review.</p><button class="btn" ${unavailable ? "disabled" : ""}>${state.mode === "demo" ? "Show sample response" : "Send to Mirror"} ${arrow}</button></div></form><p class="small muted">${unavailable ? "You can write privately in your journal while conversation is unavailable." : "Your message and selected context are processed for this response. They are not saved as an enduring memory."}</p>${mirrorMessages.length ? `<div class="actions">${control("Write a takeaway to remember", "memory", "", "true")}${state.mode !== "demo" && mirrorLive ? control("Ask Mirror to propose a takeaway", "agent-propose", "", "true") : ""}</div>` : ""}</section></div>`;
  }

  function memory(source = "Mirror conversation") {
    shell(
      "A possible learning",
      "Keep only <em>what helps.</em>",
      `<div class="reading-column"><p>This proposal is yours to write or revise. One experience does not establish a permanent trait.</p><form id="w-memory">${area("A takeaway in your words", "body", "", 'required maxlength="1500"')}${area("When does this apply? What remains uncertain?", "context", "", 'maxlength="1500"')}<input name="source" type="hidden" value="${esc(source)}">${check("Remember this for my private reflection.", "remember", false)}${check("Separately allow this insight to inform introductions.", "matching", false)}<div class="actions"><button class="btn">Save this takeaway</button>${control("Leave it here", "report", "", "true")}</div></form></div>`,
    );
  }
  function portraitPreview(s) {
    const p = J.shared({ ...s, portrait: { ...s.portrait, approved: true } });
    return sharedPortrait(p);
  }
  function sharedPortrait(p) {
    return `<article class="approved-portrait"><div class="portrait-image">${p.photo ? `<img src="${esc(p.photo)}" alt="${esc(p.name)}’s ${state.mode === "demo" ? "fictional illustrated" : "approved"} portrait">` : '<div class="portrait-placeholder">A photograph has not been shared</div>'}<span class="portrait-image-label">${state.mode === "demo" ? "Fictional adult / Illustrated portrait" : "Approved Connection Portrait"}</span></div><div class="portrait-story"><p class="eyebrow">A person to get to know</p><h2>${esc(p.name)}, ${p.age ?? "age private"}</h2><p class="portrait-location">${esc(p.city)}</p><span class="status-pill">${esc(p.intention)}</span><p class="lede">${esc(p.bio)}</p><div class="portrait-details">${[
      ["An ordinary day I love", p.ordinary],
      ["Something I could talk about for hours", p.interest],
      ["A small thing that makes me feel cared for", p.care],
    ]
      .filter((x) => x[1])
      .map(
        ([t, v]) =>
          `<section><p class="eyebrow">${t}</p><p>${esc(v)}</p></section>`,
      )
      .join(
        "",
      )}</div>${p.topics?.length ? `<div class="topic-list">${p.topics.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}<p class="small muted">${p.planning === "planned" ? "I enjoy plans made ahead." : p.planning === "flexible" ? "I like room for spontaneity." : "I enjoy a mix of planning and spontaneity."}</p></div></article>`;
  }

  function portrait(preview = false) {
    shell(
      "Connection Portrait",
      preview
        ? "This is what an introduction <em>can see.</em>"
        : "Choose what <em>you share.</em>",
      preview
        ? `${portraitPreview(own)}${notice("Audience: the other member in an authorized introduction. Your full birth date, Mirror, corrections, memories, journal, and private reflections are excluded.")}<div class="actions">${control("Approve this portrait", "approve-portrait")}${control("Keep editing", "portrait", "", "true")}</div>`
        : `<div class="reading-column"><p>Your private Mirror and shared portrait are different things. Write in your own voice.</p>${state.mode === "demo" ? "" : `<section class="portrait-photo">${own.portrait.photo ? `<img src="${esc(own.portrait.photo)}" alt="Your submitted portrait" style="width:220px;max-height:290px;object-fit:cover">` : ""}<form id="w-photo"><label class="field">A current photograph of you<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></label><p class="small muted">Your photo is private until you approve your portrait and WONDER reviews it. Location metadata is removed. Review is not identity verification.</p><button class="btn secondary">Upload for review</button></form><p class="small">${own.moderation?.photoStatus === "approved" ? "Photo approved" : own.moderation?.photoStatus === "rejected" ? "Please choose another photograph" : own.portrait.photo ? "Photo awaiting review" : "No photograph added"}${own.moderation?.note ? " · " + esc(own.moderation.note) : ""}</p></section>`}<form id="w-portrait">${area("A short introduction", "bio", own.portrait.bio, 'required maxlength="1000"')}${area("An ordinary day I love", "ordinary", own.portrait.ordinary, 'required maxlength="600"')}${area("Something I could talk about for hours", "interest", own.portrait.interest, 'maxlength="600"')}${area("A small thing that makes me feel cared for", "care", own.portrait.care, 'maxlength="600"')}<fieldset><legend>Interests you would like to share (up to five)</legend>${["Art", "Books", "Nature", "Music", "Food", "Movement", "Travel", "Design", "Science", "Community"].map((x) => check(x, "topic_" + x, (own.portrait.topics || []).includes(x))).join("")}</fieldset>${select(
            "My approach to plans",
            "planning",
            [
              ["either", "A mix of planning and spontaneity"],
              ["planned", "I enjoy plans made ahead"],
              ["flexible", "I like room for spontaneity"],
            ],
            own.portrait.planning || "either",
          )}<button class="btn">Save and preview</button></form></div>`,
    );
  }
  function viewPair() {
    if (state.mode !== "demo") return pair;
    if (["empty", "failed"].includes(scenario)) return null;
    if (["blocked", "unavailable"].includes(scenario))
      return { status: "unavailable" };
    if (scenario === "declined") return { status: "declined" };
    return J.pairView(world.pair, world.actor, world.users);
  }
  function waiting(title, copy) {
    return `<div class="waiting-scene"><div class="waiting-landscape" aria-hidden="true"></div><section class="waiting-state"><p class="eyebrow">Introduction status</p><h2>${title}</h2><p>${copy}</p><p class="small muted">Your place here is not measured by how quickly you meet someone.</p><div class="actions">${control("Return to your Mirror", "report")}${control("Review preferences", "settings", "", "true")}</div></section></div>`;
  }

  function introductions() {
    const p = viewPair();
    let body = "";
    if (scenario === "failed")
      body = waiting(
        "A brief interruption.",
        "We could not load your introduction. This is a simulated service failure, not a matching decision. Change the demo scenario to retry.",
      );
    else if (!own.portrait.approved)
      body =
        waiting(
          "Choose what they see.",
          "Your portrait is not ready. Choose and approve what another person can see before becoming available.",
        ) + control("Prepare your portrait", "portrait");
    else if (own.availability !== "available" && p?.status !== "mutual")
      body = waiting(
        "A little room for yourself.",
        "Introductions are paused. Your Mirror and journal remain available. Resume only when you want to.",
      );
    else if (!p)
      body = waiting(
        "No introduction is ready yet.",
        state.mode === "demo"
          ? "Your preferences are saved. This scenario contains no eligible introduction."
          : !liveEnabled
            ? "Your Mirror is available. Introductions are not active for your account’s local cohort yet. You can review your city interest in Account."
            : "Your preferences are saved. An introduction depends on mutual eligibility and someone being available in your approved cohort.",
      );
    else if (
      ["unavailable", "withdrawn", "declined", "closed", "blocked"].includes(
        p.status,
      )
    )
      body = waiting(
        "This chapter has closed.",
        "This introduction is no longer active. Closed and blocked pairs are not recycled automatically.",
      );
    else {
      const other =
        state.mode === "demo"
          ? world.users[world.pair.members.find((x) => x !== world.actor)]
          : null;
      const portrait = other
        ? J.shared({
            ...other,
            portrait: { ...other.portrait, approved: true },
          })
        : p.otherPortrait;
      const mutual = p.status === "mutual";
      if (!mutual) introView = "portrait";
      const rationale = `<section class="introduction-reasons"><p class="eyebrow">The thinking behind the introduction</p><h3>Why we thought<br>of you <em>together.</em></h3>${(p.reason || []).map((t) => `<p>${esc(t)}</p>`).join("")}<div class="reason-columns"><section><h4>A difference worth noticing</h4><p>${esc(p.difference)}</p></section><section><h4>What only meeting can tell you</h4><p>${esc(p.unknown)}</p></section></div><p class="small muted">${state.mode === "demo" ? "This rationale uses the two fictional approved portraits. It is not a prediction." : "These reasons use information authorized for this introduction."}</p></section>`;
      body = mutual
        ? `<div class="connection-banner"><div><span class="eyebrow">You are both interested</span><h3>${esc(portrait?.name || "Your introduction")} <span class="small muted">/ ${esc(portrait?.city || "")}</span></h3></div><span class="privacy-caption">${vector(paths.introductions)} Human connection</span></div><div class="mirror-subnav connection-tabs" aria-label="Introduction views">${[
            ["portrait", "Portrait & reasons"],
            ["conversation", "Conversation"],
            ["plan", "Plan to meet"],
          ]
            .map(([v, l]) =>
              control(
                l,
                "connection-view",
                `data-view="${v}" aria-pressed="${introView === v}"`,
                true,
              ),
            )
            .join("")}</div>`
        : "";
      if (introView === "portrait")
        body += (portrait ? sharedPortrait(portrait) : "") + rationale;
      if (!mutual) {
        body += p.myInterest
          ? notice(
              "Your interest is recorded. Contact remains closed until the other person chooses independently.",
            )
          : `<section class="interest-decision"><p>Would you like to start a conversation?</p><div class="actions">${control("I’m interested " + arrow, "interest")}${control("Not for me", "decline", "", "true")}${control("Decide later", "later", "", "true")}</div><p class="small muted">Interest is an invitation to connect. It is not a commitment to meet.</p></section>`;
        if (state.mode === "demo")
          body += notice(
            "To demonstrate mutuality, switch to " +
              (world.actor === "alex" ? "Rowan" : "Alex") +
              " in Demonstration controls and make their separate choice.",
          );
      } else if (introView === "conversation")
        body += `<div class="connection-room"><section class="human-conversation"><p class="eyebrow">Human conversation / ${esc(portrait?.name || "Your introduction")}</p><h2>A conversation<br><em>between you.</em></h2><p class="small muted">${state.mode === "demo" ? "Messages are simulated. Switch perspectives to write as the other fictional adult." : "Only the two participants can use this conversation. WONDER does not write or send messages for either person."}</p><div class="human-thread" role="log" aria-live="polite" aria-label="Conversation with your introduction">${(p.messages || []).map((m) => `<article class="${m.from === (world?.actor || state.user?.id) ? "mine" : ""}"><p class="eyebrow">${esc(state.mode === "demo" ? world.users[m.from].basics.name : m.from === state.user?.id ? "You" : portrait?.name || "Your introduction")}</p><p>${esc(m.body)}</p><span class="small muted">${state.mode === "demo" ? "Saved in demo" : "Sent"}</span></article>`).join("") || '<div class="conversation-empty"><h3>A small beginning.</h3><p>What in their portrait made you curious?</p></div>'}</div><form id="w-message">${area("Message to this person", "body", pendingMessage?.pairId === pair?.id ? pendingMessage.body : "", 'required maxlength="3000" placeholder="Something in your portrait caught my attention…"')}<button class="btn">${state.mode === "demo" ? "Send simulated message" : "Send message"} ${arrow}</button></form></section><aside class="connection-companion"><p class="eyebrow">Beyond the screen</p><h3>Make room<br><em>to meet.</em></h3><p>A conversation can begin here. The rest unfolds in person.</p>${control(p.plan ? "View your meeting plan" : "Plan a meeting", "connection-view", 'data-view="plan"')}<div class="companion-detail"><p class="eyebrow">A conversation idea</p><p>“What does an ordinary day you love look like?”</p></div><p class="small muted">Move at a pace that feels right to both of you.</p></aside></div>`;
      else if (introView === "plan") body += planView(p);
      body += `<details class="connection-safety"><summary>Connection choices & support</summary><p class="small">You can leave a connection without explaining your decision. Blocking closes contact immediately.</p><div class="actions safety-actions">${control("Block this person", "block", "", "true")}${control("Report a concern", "report-person", "", "true")}${control("Close this connection", "close", "", "true")}</div></details>`;
    }
    shell(
      "Introductions",
      "A person.<br><em>A reason to be curious.</em>",
      `${state.mode === "demo" ? "" : `<div class="actions connection-tools">${control("Refresh connections", "refresh-connections", "", "true")}${own.availability === "available" && liveEnabled ? control("Check for an introduction", "seek", "", "true") : ""}</div>${allConnections.length > 1 ? `<div class="connection-list">${allConnections.map((c) => control(c.otherPortrait?.name || "Closed connection", "open-connection", `data-id="${esc(c.id)}"`, true)).join("")}</div>` : ""}`}${body}`,
    );
  }

  function planView(p) {
    const plan = p.plan;
    const label =
      plan?.status === "confirmed"
        ? "Confirmed"
        : plan?.status === "cancelled"
          ? "Cancelled"
          : "Proposed — awaiting the other person";
    const date = plan?.when
      ? new Date(plan.when).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const time = plan?.when
      ? new Date(plan.when).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    return `<div class="meeting-layout"><aside class="meeting-atmosphere"><p class="eyebrow">Beyond the screen</p><h2>Meet in<br>the <em>real world.</em></h2><p>Arrive curious.<br>Leave room to be surprised.</p></aside><section class="meeting-plan"><p class="eyebrow">Plan to meet</p><h3>${plan ? "Your meeting plan" : "A day. A place. A beginning."}</h3>${plan ? `<div class="plan-ticket"><span class="status-pill">${esc(label)}</span><h3>${esc(date)}</h3><p>${esc(time)} · ${esc(plan.zone)}</p><p class="plan-place">${esc(plan.place)}</p>${plan.budget ? `<p><strong>Budget:</strong> ${esc(plan.budget)}</p>` : ""}${plan.access ? `<p><strong>Access:</strong> ${esc(plan.access)}</p>` : ""}<div class="actions">${plan.status === "proposed" && plan.by !== (world?.actor || state.user?.id) ? control("Accept this plan", "accept-plan") : ""}${plan.status === "confirmed" ? control("Export calendar event", "calendar", "", "true") : ""}${plan.status !== "cancelled" ? control("Cancel this plan", "cancel-plan", "", "true") : ""}</div></div>` : ""}<details ${!plan ? "open" : ""}><summary>${plan ? "Propose another time" : "Propose a day, time, and public place"}</summary><form id="w-plan" class="form-grid">${field("Day and time", "when", plan?.when || "", "datetime-local", "required")}${field("Time zone", "zone", plan?.zone || "America/Chicago", "text", "required")}${field("Public location or activity", "place", plan?.place || "", "text", 'required maxlength="300"')}${field("Budget preference (optional)", "budget", "", "text", 'maxlength="200"')}${field("Access needs to share (optional)", "access", "", "text", 'maxlength="300"')}<div class="full"><p class="small muted">A proposal needs the other person’s acceptance. No reservation is made. Calendar export is available once confirmed; automatic reminders are not connected.</p><button class="btn">Send proposal ${arrow}</button></div></form></details><p class="small muted">Choose a public place and your own way home. WONDER does not monitor meetings or provide emergency response.</p>${plan?.status === "confirmed" ? `<section class="meeting-preparation"><p class="eyebrow">Before you go</p><h4>What would help you be present rather than perform?</h4><p>Ask about an ordinary day they love, or something they recently changed their mind about.</p>${control("Record whether you met", "reflection")}</section>` : ""}</section></div>`;
  }

  function reflect(attendance = reflectionDraft?.attendance || "") {
    const d = reflectionDraft || {},
      latest = own.reflections.find((r) => r.pairId === pair?.id);
    const questions = [
      ["feeling", "Did being together feel comfortable?"],
      ["authentic", "Did you feel able to be yourself?"],
      ["understood", "Did you feel listened to and understood?"],
      ["attraction", "Was there attraction or interest?"],
      ["again", "Would you like another meeting?"],
    ];
    shell(
      "After the meeting",
      "What stayed<br><em>with you?</em>",
      `<div class="reflection-layout"><aside class="reflection-intro"><p class="eyebrow">For your eyes only</p><h2>Notice first.<br><em>Name it gently.</em></h2><p>You do not have to know what it all means yet. Begin with the experience you actually had.</p><p class="small muted">Your reflection is private. Nothing here sends a message or changes the other person’s status.</p></aside><section><form id="w-reflection">${select(
        "Did you meet?",
        "attendance",
        [
          ["", "Choose…"],
          ["yes", "Yes"],
          ["rescheduled", "Rescheduled"],
          ["cancelled", "Cancelled"],
          ["no", "It did not happen"],
          ["private", "Prefer not to say"],
        ],
        attendance,
      )}${
        attendance === "yes"
          ? questions
              .map(
                ([k, q], i) =>
                  `<fieldset class="reflection-question"><legend><span>${String(i + 1).padStart(2, "0")}</span> ${q}</legend><div class="reflection-options">${[
                    ["yes", "Yes"],
                    ["partly", "Partly"],
                    ["no", "No"],
                    ["unsure", "Not sure yet"],
                  ]
                    .map(
                      ([v, l]) =>
                        `<label><input type="radio" name="${k}" value="${v}" ${(d[k] || "unsure") === v ? "checked" : ""}><span>${l}</span></label>`,
                    )
                    .join("")}</div></fieldset>`,
              )
              .join("")
          : ""
      }${attendance ? area("Anything you want to remember? (optional)", "body", d.body || "", 'maxlength="8000" placeholder="What felt easy? What surprised you?"') : ""}<div class="actions">${attendance ? '<button class="btn">Save privately</button>' : ""}${control("Skip for now", "home", "", "true")}</div></form>${latest ? `<details class="reflection-history"><summary>Your latest private reflection</summary><p class="eyebrow">${esc(new Date(latest.at).toLocaleDateString())}</p><p>${esc({ yes: "You met", rescheduled: "Rescheduled", cancelled: "Cancelled", no: "You did not meet", private: "Attendance kept private" }[latest.attendance])}</p>${latest.attendance === "yes" ? questions.map(([k, q]) => `<p><strong>${q}</strong><br>${esc({ yes: "Yes", partly: "Partly", no: "No", unsure: "Not sure yet" }[latest.answers?.[k]] || "Not answered")}</p>`).join("") : ""}<p>${esc(latest.body)}</p></details>` : ""}<div class="actions">${control("Propose a learning update", "reflection-memory", "", "true")}${control("I need support / report a concern", "report-person", "", "true")}</div></section></div>`,
    );
  }

  function journal() {
    writeDraft = writeDraft || {
      id: crypto.randomUUID(),
      title: "",
      body: "",
      tags: "",
    };
    const d = writeDraft;
    const prompts = [
      "When did you feel most understood today?",
      "What did you want to say but leave unsaid?",
      "What felt easier than you expected?",
      "What are you still trying to name?",
    ];
    shell(
      "Journal",
      "A thought.<br><em>A little room.</em>",
      `<div class="journal-layout"><aside class="journal-sidebar"><div class="journal-library-head"><p class="eyebrow">Your pages / ${own.journal.length}</p>${control("New entry", "new-journal", "", "true")}</div><label class="field">Search entries<input id="w-search" type="search" placeholder="Title, words, or tags"></label><div id="w-entry-list">${entryList()}</div><details class="journal-options"><summary>Export & recovery</summary>${control("Export my journal", "export-journal", "", "true")}${control("Export the open draft", "export-draft", "", "true")}${state.mode === "demo" ? "" : control("Sign in again in another tab", "reauth-tab", "", "true")}</details></aside><section class="journal-editor"><div class="journal-dateline"><span class="eyebrow">${esc(new Date(d.at || Date.now()).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }))}</span><span class="privacy-caption">${vector("M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4V10Zm8 5v3")} Private writing</span></div><div class="journal-prompt"><p id="journal-prompt-text">${prompts[promptIndex % prompts.length]}</p>${control("Another prompt", "journal-prompt", "", "true")}</div><form id="w-journal">${field("Title (optional)", "title", d.title, "text", 'maxlength="160" placeholder="Give this thought a name"')}${area("Your writing", "body", d.body, 'maxlength="12000" placeholder="Begin wherever you are…"')}${field("Tags (optional)", "tags", d.tags, "text", 'maxlength="200" placeholder="e.g. closeness, everyday life"')}<div class="journal-bottom"><span id="w-save-state" role="status">${dirty ? "Not saved" : own.journal.some((e) => e.id === d.id) ? "Saved" : "A new private page"}</span><button class="btn">Save now</button></div></form><p class="small muted">Autosaved after you pause. No AI reads this entry automatically.</p><details class="journal-mirror-options"><summary>Explore this writing with Mirror</summary><p class="small">Choose an excerpt or the entry. You will review the selected context before sending it to Mirror.</p><div class="actions">${control("Reflect on selected text", "reflect-selection", "", "true")}${control("Reflect on this entry", "reflect-entry", "", "true")}</div></details>${own.journal.some((e) => e.id === d.id) ? control("Delete entry", "delete-journal", "", "true") : ""}</section></div>`,
    );
  }

  function entryList(query = "") {
    const found = own.journal.filter((e) =>
      (e.title + " " + e.body + " " + e.tags)
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return (
      found
        .map(
          (e) =>
            `<button class="entry-link ${writeDraft?.id === e.id ? "active" : ""}" data-w-action="open-journal" data-id="${esc(e.id)}" ${writeDraft?.id === e.id ? 'aria-current="true"' : ""}><span class="eyebrow">${esc(new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</span><strong>${esc(e.title)}</strong><span class="entry-excerpt">${esc(e.body.slice(0, 100))}${e.body.length > 100 ? "…" : ""}</span>${e.tags ? `<span class="small muted">${esc(e.tags)}</span>` : ""}</button>`,
        )
        .join("") ||
      `<div class="journal-empty"><p>${query ? "No entries match your search." : "Your first page is waiting."}</p><p class="small muted">${query ? "Try another word or tag." : "A line is enough. There is no daily obligation."}</p></div>`
    );
  }

  async function saveJournal() {
    clearTimeout(saveTimer);
    const data = { ...writeDraft };
    if (!data.body.trim()) {
      if (dirty)
        throw new Error(
          "Your entry is blank. Write a little, or delete the saved entry explicitly.",
        );
      return;
    }
    const indicator = document.querySelector("#w-save-state");
    if (indicator) indicator.textContent = "Saving";
    const work = saveChain
      .catch(() => {})
      .then(async () => {
        await change("journal", data);
        if (
          writeDraft?.id === data.id &&
          writeDraft.body === data.body &&
          writeDraft.title === data.title &&
          writeDraft.tags === data.tags
        )
          dirty = false;
        const el = document.querySelector("#w-save-state");
        if (el) el.textContent = dirty ? "Not saved" : "Saved";
        const list = document.querySelector("#w-entry-list");
        if (list)
          list.innerHTML = entryList(
            document.querySelector("#w-search")?.value || "",
          );
      });
    saveChain = work;
    try {
      await work;
    } catch (e) {
      const el = document.querySelector("#w-save-state");
      if (el) el.textContent = "Not saved — " + e.message;
      throw e;
    }
  }
  function account() {
    const categories = [
      ["profile", "Your space"],
      ["preferences", "Who you want to meet"],
      ["privacy", "Privacy & memories"],
      ["reading", "Reading & motion"],
      ["data", "Data & departure"],
    ];
    let body = "";
    if (accountView === "profile")
      body = `<p class="eyebrow">Your space</p><h2>${esc(own.basics.name || "Your account")}</h2><p>${esc(own.basics.city || "Add a city")} · ${state.mode === "demo" ? "Fictional adult account" : "Private member account"}</p><div class="account-link-rows"><button data-w-action="basics"><span><strong>Personal details</strong><small>Chosen name, private birth date, and broad location</small></span>${arrow}</button><button data-w-action="portrait"><span><strong>Connection Portrait</strong><small>${own.portrait.approved ? "Approved by you" : "Choose what an introduction can see"}</small></span>${arrow}</button>${state.mode === "demo" ? "" : `<button data-action="security"><span><strong>Password & device sign-in</strong><small>Manage secure return and registered passkeys</small></span>${arrow}</button>`}</div><section class="availability-panel"><p class="eyebrow">Your availability</p><h3>${own.availability === "seeing" ? "Making room for someone." : own.availability === "paused" ? "A pause is part of the journey." : "Open to an introduction."}</h3><p>${own.availability === "seeing" ? "New introductions are paused. This is not announced to anyone." : own.availability === "paused" ? "New introductions are paused. Your Mirror and journal remain yours." : "Available for eligible introductions. This does not promise an introduction by a particular date."}</p><div class="actions">${control("Resume introductions", "resume", "", "true")}${control("Pause introductions", "pause", "", "true")}${control("I’m seeing someone", "seeing", "", "true")}</div></section><section class="account-section"><h3>City access</h3><p>${state.mode === "demo" ? "This demonstration takes place in Dallas." : liveEnabled ? "Your account has access to its controlled introduction cohort." : "Your Mirror is available. Live introductions depend on local cohort access."}</p>${own.cityInterest ? notice("Your interest in " + esc(own.cityInterest.city) + " is saved. No queue position or access date is assigned. Check your access here; automated notifications are not connected.") : ""}${control(own.cityInterest ? "Withdraw city interest" : "Save interest in my city", own.cityInterest ? "withdraw-city" : "join-city", "", "true")}</section>`;
    if (accountView === "preferences")
      body = `<p class="eyebrow">Who you want to meet</p><h2>Space for what<br><em>matters to you.</em></h2><p>These choices help establish mutual eligibility. A requirement is a boundary, not a measure of someone’s worth.</p><form id="w-preferences">${select(
        "How you describe yourself",
        "gender",
        [
          ["", "Choose…"],
          ["woman", "Woman"],
          ["man", "Man"],
          ["nonbinary", "Nonbinary"],
          ["self-described", "Another identity"],
        ],
        own.preferences.gender || "",
      )}<fieldset><legend>Who would you like to meet?</legend>${[
        ["woman", "Women"],
        ["man", "Men"],
        ["nonbinary", "Nonbinary people"],
        ["self-described", "People with another identity"],
      ]
        .map(([v, l]) =>
          check(l, "meet_" + v, (own.preferences.meet || []).includes(v)),
        )
        .join("")}</fieldset>${select(
        "Relationship intention",
        "intention",
        [
          ["", "Choose…"],
          ["A committed relationship", "A committed relationship"],
          ["Meaningful dating", "Meaningful dating"],
          ["Self-understanding only", "Self-understanding only"],
        ],
        own.preferences.intention,
      )}${select(
        "Relationship structure (required)",
        "structure",
        [
          ["", "Choose…"],
          ["Monogamy", "Monogamy"],
          ["Consensual non-monogamy", "Consensual non-monogamy"],
        ],
        own.preferences.structure || "",
      )}<div class="form-grid">${field("Required minimum age", "minAge", own.preferences.minAge, "number", 'min="18" max="120" required')}${field("Required maximum age", "maxAge", own.preferences.maxAge, "number", 'min="18" max="120" required')}</div>${check("Same broad city is required.", "cityRequired", own.preferences.cityRequired)}${select(
        "Future family plans",
        "family",
        [
          ["", "Not specified"],
          ["Want children", "Want children"],
          ["Do not want children", "Do not want children"],
          ["Open or unsure", "Open or unsure"],
        ],
        own.preferences.family || "",
      )}${check("Shared family plans are required.", "familyRequired", own.preferences.familyRequired)}<p class="small muted">Saving changes pauses new introductions so you can review availability. Existing connections are checked again before actions.</p><button class="btn">Save required preferences</button></form>`;
    if (accountView === "privacy")
      body = `<p class="eyebrow">Privacy & memories</p><h2>Understood.<br><em>On your terms.</em></h2><div class="privacy-ledger"><section><h4>Only your approved portrait is shared</h4><p>Your Mirror, journal, corrections, and date reflections are private from other members.</p></section><section><h4>Writing is not automatic AI context</h4><p>You select the entry or excerpt to explore. Memory is a separate, reviewed choice.</p></section></div><form id="w-consent">${check("Process my discovery to provide my private Mirror.", "process", own.consent.process)}${check("Use eligible, permitted information for introductions.", "matching", own.consent.matching)}<p class="small muted">Research and model-improvement use is off and unavailable. Withdrawing processing pauses introductions and removes optional memories. Authorized service operators may access records to run and support the service.</p><button class="btn">Save permissions</button></form><section class="account-section"><h3>Remembered insights</h3><p class="small muted">Private reflection and introduction use are separate permissions. Forgetting an insight pauses new introductions for review.</p>${own.memories.length ? own.memories.map((m) => `<article class="memory"><p>${esc(m.body)}</p><p class="small">${esc(m.context)}</p><span class="status-pill">${m.matching ? "Introduction use permitted" : "Private reflection only"}</span>${control("Forget this insight", "forget", `data-id="${esc(m.id)}"`, true)}</article>`).join("") : '<p class="notice">No optional insights remembered. Nothing needs to be added.</p>'}</section>`;
    if (accountView === "reading")
      body = `<p class="eyebrow">Reading & motion</p><h2>A space that<br><em>meets you.</em></h2><p>Choose how the interface feels. These preferences do not inform your psychological portrait or introductions.</p><form id="w-display">${check("Larger text", "largeText", own.display.largeText)}${check("Reduced motion", "reducedMotion", own.display.reducedMotion)}<button class="btn">Save reading preferences</button></form><div class="reading-sample"><p class="eyebrow">A reading sample</p><h3>You can take<br><em>your time.</em></h3><p>A little attention, a little curiosity, and room to revise what you thought you knew.</p></div>`;
    if (accountView === "data")
      body = `<p class="eyebrow">Data & departure</p><h2>Leave with<br><em>your choices intact.</em></h2><section class="account-section"><h3>Your data, to keep</h3><p>Export your private writing, portrait, and account records.</p>${control("Export my private data", "export")}</section><section class="account-section"><h3>Your membership</h3><p>Introductions are free during the controlled beta. There is no active subscription checkout in this app.</p>${btn(state.mode === "demo" ? "Exit demo" : "Sign out", "logout", "", "secondary")}</section><section class="account-section"><h3>Delete your account</h3><p>${state.mode === "demo" ? "Demo deletion clears this actor’s private records and closes the simulated connection. Reset can recreate the fictional fixtures." : "Deletion removes active account access, private records, model records, and stored portraits. Provider backups follow their retention schedules; they are not an active product surface."}</p>${control(state.mode === "demo" ? "Delete this fictional account" : "Delete my account", "delete-account", "", "true")}</section>`;
    shell(
      "Account",
      "Your space.<br><em>Your decisions.</em>",
      `<div class="account-layout"><nav class="account-navigation" aria-label="Account sections">${categories.map(([v, l]) => `<button data-w-action="account-view" data-view="${v}" ${accountView === v ? 'aria-current="page"' : ""}><span>${l}</span>${arrow}</button>`).join("")}</nav><section class="account-content">${body}</section></div>`,
    );
  }
  async function render(screen) {
    if (screen === "how") {
      how();
      return;
    }
    await load(
      state.mode === "beta" &&
        ["home", "settings", "introductions", "portrait"].includes(screen),
    );
    if (own.deleted) {
      shell(
        "Account deleted",
        "You have <em>left the demonstration.</em>",
        `<p>Your active private records and connection access were removed.</p>${control("Reset fictional data", "reset")}`,
      );
      return;
    }
    if (state.mode === "demo") {
      world.reports = world.reports || {};
      world.assessments = world.assessments || {};
      if (state.report) world.reports[world.actor] = state.report;
      if (state.assessment) world.assessments[world.actor] = state.assessment;
      storeDemo();
    }
    if (screen === "home") home();
    else if (screen === "basics") basics();
    else if (screen === "report" || screen === "ai") {
      if (screen === "ai") tab = "conversation";
      await mirror();
    } else if (screen === "introductions") introductions();
    else if (screen === "reflection") reflect();
    else if (screen === "journal") journal();
    else if (screen === "portrait") portrait();
    else if (screen === "settings") account();
  }
  async function dispatch(a, b) {
    if (a === "connection-view") {
      introView = b.dataset.view;
      return introductions();
    }
    if (a === "account-view") {
      accountView = b.dataset.view;
      return account();
    }
    if (a === "journal-prompt") {
      promptIndex++;
      return journal();
    }
    if (a === "preview-portrait") return portrait(true);
    if (a === "review-section") {
      sectionId = b.dataset.id;
      tab = "full";
      return mirror();
    }

    if (
      [
        "home",
        "report",
        "introductions",
        "journal",
        "settings",
        "portrait",
        "basics",
        "reflection",
        "atlas",
      ].includes(a)
    ) {
      pendingCorrection = null;
      return go(a);
    }
    if (a === "mirror-tab") {
      tab = b.dataset.tab;
      return mirror();
    }
    if (a === "section") {
      sectionId = b.dataset.id;
      tab = "full";
      return mirror();
    }
    if (a === "correct") {
      const s = sections().find((x) => x.id === b.dataset.id);
      pendingCorrection = {
        claim: s.id,
        fit: b.dataset.fit,
        original: s.body,
        revision: "",
        reportVersion: state.report.version,
      };
      return correction();
    }
    if (a === "edit-correction") return correction();
    if (a === "apply-correction") {
      await change("correct", pendingCorrection);
      pendingCorrection = null;
      tab = "changes";
      return mirror();
    }
    if (a === "reviewed") {
      await change("review_mirror");
      toast("Your review is saved.");
      return go("portrait");
    }
    if (a === "explore-claim") {
      const s = sections().find((x) => x.id === b.dataset.id);
      selectedContext = { title: s.title, text: s.body };
      tab = "conversation";
      return mirror();
    }
    if (a === "remove-context") {
      selectedContext = null;
      mirrorMessages = [];
      return mirror();
    }
    if (a === "mirror-prompt") {
      document.querySelector("#w-mirror [name=message]").value =
        b.dataset.prompt;
      return;
    }
    if (a === "agent-propose") {
      const d = await api("/api/chat", {
        action: "propose_memory",
        message: mirrorMessages
          .filter((m) => m.role === "user")
          .map((m) => m.body)
          .join("\n")
          .slice(-6000),
        context: selectedContext,
        process_context: !!selectedContext,
        history: mirrorMessages
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.body })),
      });
      agentProposal = d.proposal;
      return shell(
        "Mirror / Review an action",
        "Remember only<br><em>what you choose.</em>",
        `<div class="reading-column"><p>This is a proposed interpretation. Edit the words and choose its permitted use before it becomes a memory.</p><form id="w-agent">${area("Proposed takeaway", "body", agentProposal.body, 'required maxlength="1500"')}${area("Context and uncertainty", "context", agentProposal.context, 'maxlength="1500"')}${check("Remember this privately.", "remember", false)}${check("Separately allow relevant introduction use.", "matching", false)}<button class="btn">Approve this memory</button></form>${control("Decline and remove proposal", "agent-decline", "", "true")}</div>`,
      );
    }
    if (a === "agent-decline") {
      await api("/api/chat", { action: "decline", id: agentProposal.id });
      agentProposal = null;
      return mirror();
    }
    if (a === "memory") return memory();
    if (a === "reflection-memory") return memory("Private date reflection");
    if (a === "approve-portrait") {
      await change("approve_portrait");
      return go("settings");
    }
    if (a === "refresh-connections") {
      await load(true);
      return introductions();
    }
    if (a === "open-connection") {
      introView = "portrait";
      reflectionDraft = null;
      pair = allConnections.find((c) => c.id === b.dataset.id);
      return introductions();
    }
    if (a === "seek") {
      const result = await api("/api/journey", { action: "seek" });
      if (result.connection) pair = result.connection;
      else
        toast(
          result.message ||
            "No eligible introduction is ready. Your preferences are saved.",
        );
      await load(true);
      return introductions();
    }
    if (["interest", "decline", "later", "close"].includes(a)) {
      await connect(a);
      if (a === "interest" && viewPair()?.status === "mutual")
        introView = "conversation";
      if (a === "later") return go("home");
      return introductions();
    }
    if (a === "accept-plan") {
      await connect("accept_plan");
      return introductions();
    }
    if (a === "cancel-plan") {
      if (
        await confirm(
          "Cancel this plan?",
          "The other person will see that the plan is cancelled.",
        )
      ) {
        await connect("cancel_plan");
        introductions();
      }
      return;
    }
    if (a === "block") {
      if (
        !(await confirm(
          "Block this person?",
          "Contact closes immediately. This pair cannot be introduced again. A report is optional.",
        ))
      )
        return;
      if (state.mode === "demo") {
        const other = world.pair.members.find((x) => x !== world.actor);
        await connect("block");
        await change("block", { userId: other });
      } else await connect("block");
      return introductions();
    }
    if (a === "report-person")
      return shell(
        "Support",
        "Make a concern <em>clear.</em>",
        `<div class="reading-column">${notice(state.mode === "demo" ? "This is a local demonstration. No moderator will receive this report." : "This report enters WONDER’s restricted support queue. It is not an emergency service; no immediate response time is promised.")}<form id="w-report">${area("What happened?", "reason", "", 'required maxlength="3000"')}<button class="btn">${state.mode === "demo" ? "Save simulated report" : "Submit to support"}</button></form><p>For immediate danger, contact local emergency services. Blocking does not require a report.</p></div>`,
      );
    if (a === "calendar") {
      const p = viewPair().plan;
      if (p?.status !== "confirmed")
        throw new Error("Only a confirmed plan can be exported.");
      const safe = (x) => x.replace(/[\r\n]/g, " ").replace(/[,;]/g, " ");
      download(
        "WONDER-meeting.ics",
        `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//WONDER//Meeting//EN\r\nBEGIN:VEVENT\r\nUID:${pair.id}@wonder\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\nDTSTART;TZID=${safe(p.zone)}:${p.when.replace(/[-:]/g, "")}00\r\nSUMMARY:WONDER meeting\r\nLOCATION:${safe(p.place)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
        "text/calendar",
      );
      return;
    }
    if (a === "export-draft")
      return download("WONDER-unsaved-draft.json", writeDraft || {});
    if (a === "reauth-tab") {
      window.open("/#account", "_blank", "noopener");
      return;
    }
    if (a === "new-journal") {
      if (dirty) await saveJournal();
      writeDraft = null;
      return journal();
    }
    if (a === "open-journal") {
      if (dirty) await saveJournal();
      writeDraft = { ...own.journal.find((e) => e.id === b.dataset.id) };
      return journal();
    }
    if (a === "delete-journal") {
      if (
        !(await confirm(
          "Delete this entry?",
          "The saved entry and active selected context will be removed.",
        ))
      )
        return;
      clearTimeout(saveTimer);
      await saveChain.catch(() => {});
      await change("delete_journal", { id: writeDraft.id });
      selectedContext = null;
      writeDraft = null;
      dirty = false;
      return journal();
    }
    if (a === "export-journal")
      return download("WONDER-private-journal.json", own.journal);
    if (a === "reflect-entry" || a === "reflect-selection") {
      const input = document.querySelector("#w-journal [name=body]");
      const text =
        a === "reflect-selection"
          ? input.value.slice(input.selectionStart, input.selectionEnd)
          : input.value;
      if (!text.trim())
        throw new Error(
          a === "reflect-selection"
            ? "Select the excerpt you want to use first."
            : "Write an entry first.",
        );
      if (
        !(await confirm(
          "Use this selected material with Mirror?",
          state.mode === "demo"
            ? "This excerpt will be shown beside a clearly labeled sample response. It is not saved as a memory."
            : "Only this selected material will be sent to the configured inference service when you send your next message. It will not be remembered automatically.",
        ))
      )
        return;
      selectedContext = {
        title:
          a === "reflect-selection"
            ? "Selected journal excerpt"
            : "Selected journal entry",
        text,
        sourceId: writeDraft.id,
      };
      tab = "conversation";
      return go("report");
    }
    if (["resume", "pause", "seeing"].includes(a)) {
      if (a === "resume" && state.mode !== "demo" && !liveEnabled)
        throw new Error(
          "Your Mirror is available. Introductions open when your local cohort access is approved.",
        );
      await change("availability", {
        value: { resume: "available", pause: "paused", seeing: "seeing" }[a],
      });
      return account();
    }
    if (a === "join-city" || a === "withdraw-city") {
      await change("city_interest", { active: a === "join-city" });
      return account();
    }
    if (a === "forget") {
      await change("forget", { id: b.dataset.id });
      selectedContext = null;
      mirrorMessages = [];
      return account();
    }
    if (a === "export")
      return download(
        "WONDER-private-export.json",
        state.mode === "demo"
          ? { journey: own, report: state.report, assessment: state.assessment }
          : await api("/api/journey", { action: "export" }),
      );
    if (a === "delete-account") {
      if (
        !(await confirm(
          "Delete this account?",
          state.mode === "demo"
            ? "This erases this fictional adult’s private data and closes their connection."
            : "This permanently removes your account under the disclosed retention policy.",
        ))
      )
        return;
      if (state.mode === "demo") {
        await change("delete");
        world.pair.status = "withdrawn";
        world.pair.messages = [];
        world.pair.plan = null;
        world.pair.reminders = [];
        storeDemo();
        mirrorMessages = [];
        selectedContext = null;
        writeDraft = null;
        state.report = null;
        return go("settings");
      }
      return shell(
        "Account / Departure",
        "Leave with <em>your decisions intact.</em>",
        `<div class="reading-column"><p>Export anything you wish to keep first. Deletion removes your active private records, model records, portraits, and connection access. A limited deletion receipt is kept to prevent access while removal completes. Provider backups expire according to their own retention schedule.</p><form id="w-delete-account">${field("Confirm your password", "password", "", "password", 'required autocomplete="current-password" minlength="10" maxlength="128"')}<button class="btn">Permanently delete my account</button></form>${control("Keep my account", "settings", "", "true")}</div>`,
      );
    }
    if (a === "switch") {
      if (dirty) await saveJournal();
      world.reports = world.reports || {};
      world.assessments = world.assessments || {};
      world.reports[world.actor] = state.report;
      world.assessments[world.actor] = state.assessment;
      world.actor = world.actor === "alex" ? "rowan" : "alex";
      mirrorDraft = "";
      pendingMessage = null;
      reflectionDraft = null;
      introView = "portrait";
      accountView = "profile";
      storeDemo();
      owner = null;
      own = null;
      writeDraft = null;
      selectedContext = null;
      mirrorMessages = [];
      state.report = null;
      state.assessment = null;
      await load();
      return go("home");
    }
    if (a === "reset" || a === "fresh") {
      if (
        !(await confirm(
          "Reset this demonstration?",
          "This clears fictional writing, messages, and changes in this tab only.",
        ))
      )
        return;
      world = J.fixture();
      if (a === "fresh") {
        world.users.alex = J.initial();
        state.assessment = null;
        state.report = null;
      }
      storeDemo();
      owner = null;
      own = null;
      writeDraft = null;
      selectedContext = null;
      mirrorMessages = [];
      state.report = null;
      state.assessment = null;
      state.entries = [];
      state.messages = [];
      await load();
      return go(a === "fresh" ? "basics" : "home");
    }
  }
  const forms = {
    "w-agent": async (p) => {
      const d = await api("/api/chat", {
        action: "apply",
        id: agentProposal.id,
        ...p,
        remember: p.remember === "on",
        matching: p.matching === "on",
      });
      own = d.state;
      agentProposal = null;
      toast("Your reviewed memory is saved.");
      return go("settings");
    },
    "w-delete-account": async (p) => {
      const d = await api("/api/journey", {
        action: "delete_account",
        password: p.password,
      });
      await ctx.logout();
      toast(
        d.pending
          ? d.message
          : "Your active account and private records were deleted.",
      );
    },
    "w-basics": async (p) => {
      await change("basics", { ...p, process: p.process === "on" });
      state.name = own.basics.name;
      return go("atlas");
    },
    "w-correction": async (p) => correctionPreview(p),
    "w-memory": async (p) => {
      accountView = "privacy";
      await change("memory", {
        ...p,
        id: crypto.randomUUID(),
        sourceId: selectedContext?.sourceId,
        remember: p.remember === "on",
        matching: p.matching === "on",
      });
      accountView = "privacy";
      return go("settings");
    },
    "w-portrait": async (p) => {
      await change("portrait", {
        ...p,
        topics: [
          "Art",
          "Books",
          "Nature",
          "Music",
          "Food",
          "Movement",
          "Travel",
          "Design",
          "Science",
          "Community",
        ].filter((x) => p["topic_" + x] === "on"),
        photo: own.portrait.photo,
      });
      return portrait(true);
    },
    "w-preferences": async (p) => {
      await change("preferences", {
        ...p,
        cityRequired: p.cityRequired === "on",
        familyRequired: p.familyRequired === "on",
        meet: ["woman", "man", "nonbinary", "self-described"].filter(
          (x) => p["meet_" + x] === "on",
        ),
      });
      toast("Saved. Review availability before resuming.");
      return account();
    },
    "w-consent": async (p) => {
      await change("consent", {
        process: p.process === "on",
        matching: p.matching === "on",
      });
      selectedContext = null;
      mirrorMessages = [];
      return account();
    },
    "w-display": async (p) => {
      await change("display", {
        largeText: p.largeText === "on",
        reducedMotion: p.reducedMotion === "on",
      });
      return account();
    },
    "w-message": async (p) => {
      if (
        !pendingMessage ||
        pendingMessage.body !== p.body ||
        pendingMessage.pairId !== pair.id
      )
        pendingMessage = {
          id: crypto.randomUUID(),
          body: p.body,
          pairId: pair.id,
        };
      await connect("message", { ...p, id: pendingMessage.id });
      pendingMessage = null;
      introView = "conversation";
      return introductions();
    },
    "w-plan": async (p) => {
      await connect("plan", p);
      introView = "plan";
      return introductions();
    },
    "w-reflection": async (p) => {
      if (!p.attendance) throw new Error("Choose whether you met.");
      await change("reflection", {
        ...p,
        id: crypto.randomUUID(),
        pairId: pair?.id,
        answers: p,
      });
      reflectionDraft = null;
      toast("Saved privately. Nothing was sent to your date.");
      return memory("Private date reflection");
    },
    "w-report": async (p) => {
      if (state.mode === "demo")
        await change("report", {
          ...p,
          userId: pair?.members?.find((x) => x !== world.actor),
        });
      else
        await api("/api/journey", {
          action: "support",
          reason: p.reason,
          connection_id: pair?.id,
        });
      toast(
        state.mode === "demo"
          ? "Simulated report saved."
          : "Your report was submitted to the support queue.",
      );
      return go("settings");
    },
    "w-journal": async () => {
      await saveJournal();
    },
    "w-mirror": async (p) => {
      const requestedOwner = owner;
      let reply;
      if (state.mode === "demo")
        reply =
          "Written sample: What did you directly notice, and what did you infer from it? Those may tell different stories. Name one concrete moment before deciding whether it describes a broader pattern.";
      else
        reply = (
          await api("/api/chat", {
            message: p.message,
            history: mirrorMessages
              .slice(-6)
              .map((m) => ({ role: m.role, content: m.body })),
            context: selectedContext
              ? { label: selectedContext.title, text: selectedContext.text }
              : null,
            process_context: !!selectedContext,
          })
        ).reply;
      if (owner !== requestedOwner) return;
      mirrorDraft = "";
      mirrorMessages.push(
        { role: "user", body: p.message },
        { role: "assistant", body: reply },
      );
      return mirror();
    },
  };
  document.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest("[data-w-action]");
      if (!b || b.disabled) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      b.disabled = true;
      dispatch(b.dataset.wAction, b)
        .catch((x) => error(x.message))
        .finally(() => (b.disabled = false));
    },
    true,
  );
  document.addEventListener(
    "submit",
    (e) => {
      if (e.target.id !== "w-photo") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const f = e.target,
        b = f.querySelector("button");
      if (b.disabled) return;
      b.disabled = true;
      const file = f.elements.photo.files[0];
      (async () => {
        if (
          !file ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 15000000
        )
          throw new Error("Choose a JPEG, PNG, or WebP file under 15 MB.");
        const image = await createImageBitmap(file),
          canvas = document.createElement("canvas"),
          scale = Math.min(1, 1400 / image.width, 1800 / image.height);
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        image.close();
        const data = canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
        const d = await api("/api/photos", {
          action: "upload",
          expected_version: own.version,
          data,
        });
        own = d.state;
        toast("Photo saved for review.");
        portrait();
      })()
        .catch((x) => error(x.message))
        .finally(() => (b.disabled = false));
    },
    true,
  );
  document.addEventListener(
    "submit",
    (e) => {
      const fn = forms[e.target.id];
      if (!fn) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const b = e.target.querySelector("[type=submit],button:not([type])");
      if (b?.disabled) return;
      if (b) b.disabled = true;
      const status = document.querySelector("#status");
      if (status) {
        status.hidden = false;
        status.className = "status";
        status.textContent =
          e.target.id === "w-message"
            ? "Sending…"
            : e.target.id === "w-mirror"
              ? "Preparing your reflection. The Mirror may take a moment to wake."
              : "Saving…";
      }
      const data = Object.fromEntries(new FormData(e.target));
      fn(data)
        .catch((x) => error(x.message))
        .finally(() => {
          if (b) b.disabled = false;
        });
    },
    true,
  );
  document.addEventListener("input", (e) => {
    if (
      e.target.closest("#w-message") &&
      pendingMessage?.body !== e.target.value
    )
      pendingMessage = {
        id: crypto.randomUUID(),
        body: e.target.value,
        pairId: pair?.id,
      };
    if (e.target.closest("#w-mirror")) mirrorDraft = e.target.value;
    if (e.target.closest("#w-reflection"))
      reflectionDraft = Object.fromEntries(
        new FormData(e.target.closest("form")),
      );
    if (e.target.id === "w-search") {
      document.querySelector("#w-entry-list").innerHTML = entryList(
        e.target.value,
      );
      return;
    }
    if (e.target.closest("#w-journal")) {
      writeDraft[e.target.name] = e.target.value;
      dirty = true;
      document.querySelector("#w-save-state").textContent = "Not saved";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveJournal().catch(() => {}), 900);
    }
  });
  document.addEventListener("change", (e) => {
    const name = e.target.name;
    if (name === "report-section") {
      sectionId = e.target.value;
      mirror().catch((x) => error(x.message));
    }
    if (name === "report-archetype") {
      state.report = state.catalog.find((x) => x.name === e.target.value);
      mirror().catch((x) => error(x.message));
    }
    if (name === "lens")
      change("lens", { value: e.target.value })
        .then(() => mirror())
        .catch((x) => error(x.message));
    if (name === "attendance") {
      reflectionDraft = Object.fromEntries(
        new FormData(e.target.closest("form")),
      );
      const v = e.target.value;
      reflect(v);
    }
    if (name === "demo-scenario") {
      scenario = e.target.value;
      world.scenario = scenario;
      if (scenario === "cancelled") {
        world.pair.status = "mutual";
        world.pair.interest = { alex: "interested", rowan: "interested" };
        world.pair.plan = {
          when: "2026-10-02T16:00",
          zone: "America/Chicago",
          place: "Public gallery (fictional plan)",
          by: "alex",
          status: "cancelled",
        };
        world.pair.reminders = [];
      }
      storeDemo();
      go("introductions");
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  return {
    render,
    nav,
    load,
    current: () => own,
    change,
    handles: (s) =>
      [
        "home",
        "report",
        "ai",
        "introductions",
        "journal",
        "reflection",
        "settings",
        "portrait",
        "basics",
        "how",
      ].includes(s),
    beforeQuiz: async () => {
      await load();
      if (
        !own.consent.process ||
        J.age(own.basics.dob) < 18 ||
        J.age(own.basics.dob) === null
      ) {
        await go("basics");
        return false;
      }
      return true;
    },
    flush: async () => {
      if (dirty) await saveJournal();
    },
    clear: () => {
      world = null;
      pair = null;
      allConnections = [];
      owner = null;
      own = null;
      writeDraft = null;
      selectedContext = null;
      mirrorMessages = [];
      mirrorLive = null;
      mirrorDraft = "";
      pendingMessage = null;
      reflectionDraft = null;
      introView = "portrait";
      accountView = "profile";
      agentProposal = null;
      dirty = false;
      clearTimeout(saveTimer);
    },
  };
};
