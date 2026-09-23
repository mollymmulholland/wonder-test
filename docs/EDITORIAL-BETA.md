> Implementation status has advanced. See [SANCTUARY-RELEASE.md](SANCTUARY-RELEASE.md) for the current state and remaining release gates.

> Historical September 18 implementation record. For the current development branch, see [UNDERSTANDING-JOURNEY.md](UNDERSTANDING-JOURNEY.md). New changes are not yet deployed.

# WONDER editorial beta

This change extends the existing vanilla-JavaScript/Vercel application and its Supabase backend. It does not replace the production waitlist or either investor site.

## Experience
- Interface icons are monochrome inline SVG, never emoji or platform-dependent symbol glyphs. Mirror instructions use the same no-emoji brand rule.
- Five-element assessment retains the 35 core items and 6–10 adaptive refinement items.
- Server-side scoring uses the existing 20-archetype v2 model, with primary and secondary interpretations.
- Each archetype has a complete editorial report; personalized observations remain distinct from generic archetype chapters.
- Demo profiles, journal records, and guided mirror responses use a separate browser session store. The demo never creates a Supabase user, match, assessment snapshot, or traction record.
- Real journal entries and post-date reflections are private account-owned database records.
- Live AI requires OPENAI_API_KEY and optionally OPENAI_MODEL. It reads only the authenticated user's assessment and conversation history. It does not read journal entries.
- The mirror uses a local water photograph with WebGL displacement and touch waves. Nature panels use slow photographic movement; reduced motion is respected.

## Local preview
Run `node scripts/dev-server.js`. Demo, public report catalog, and demo assessment work without credentials. Real account flows require the Vercel runtime environment.

## Deployment
Deploy this branch to the existing `wonder-mvp-preview` project. Preserve the public waitlist and other project domains. Required existing variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). AI requires OPENAI_API_KEY. Do not place server credentials in frontend code.

## Media
Local photographs downloaded from Unsplash. Source pages:
- Water: https://unsplash.com/photos/sunlight-patterns-on-the-sandy-ocean-floor-tuNmneX1f6k — fady haff.
- Fern: https://unsplash.com/photos/a-close-up-of-a-fern-leaf-in-the-dark-9ODVk8G244c — Louis Gaudiau.
- Forest: https://unsplash.com/s/photos/peaceful-landscape — underlying image photo-1731361968477-859322bd74be.
Fonts: Cormorant Garamond and DM Sans through Google Fonts. No user reference image is republished as product photography.

## Interpretation
Archetypes and matching scores are product hypotheses, not validated psychometrics or guarantees. No probability of relationship success is displayed. The demo introduction is explicitly fictional and its nature study is not a portrait of a real member.

## Verified September 18, 2026
- Hosted protected preview: account creation/sign-in, 45 saved answers, backend assignment (Catalyst in the synthetic run), persisted personalized report, preferences, journal save/reload, post-date reflection, matching empty state, logout, and rejected signed-out journal access.
- Browser: welcome/home, all-20 report selector, portrait-to-journal prompt, journal save, fictional introduction reaction, five-rating date reflection, guided mirror exchange, pool tap, and quiz forward/back with answer retention.
- Local: three complete adaptive assessments (41/45/45 responses), all report definitions, malformed input rejection, unauthenticated access and origin checks; existing archetype, precision, and matching suites.
- Production asset build succeeds; backend files are excluded from public output. One allowlisted Vercel API router serves the application.
- Applied migrations seed the twenty reports and fix the pre-existing shared event trigger, which attempted to read a nonexistent status column on model snapshots and journal rows.
- The disposable synthetic account and its linked records were removed after verification. Existing users, waitlist records, and the independent demo dataset were not altered.

## Remaining release dependencies
- Live AI is wired but the connected provider returned HTTP 429 / credit_balance_exhausted. Replenish provider credits and rerun a signed-in Mirror exchange before enabling AI for beta testers. No successful live AI generation or chat-history persistence is claimed. The demo explicitly uses written guided responses.
- Verified signup and password recovery now use server-bound PKCE, signed HttpOnly recovery cookies, and durable database request limits. Provider-mocked contract tests cover confirmation enforcement, expired/tampered links, account-bound recovery, token privacy, session revocation, and origin checks. No real email was sent during this test pass.
- Supabase public settings confirm email confirmation is enabled. Custom SMTP delivery and the exact deployment/branch redirect allowlist still require verification in the authenticated Supabase dashboard before inviting beta users. The dashboard is not signed in in this session.
- Add the intended HTTPS app origins to Supabase Auth URL Configuration. For custom domains, also set WONDER_AUTH_ORIGINS on Vercel. The confirmation/reset link must be opened in the browser that requested it.
- The preview-only /layout-check page renders the deployed app at selected CSS viewport widths; it is excluded from production builds.
- Responsive breakpoints and reduced-motion styles are implemented. Desktop browser and 390px/768px embedded viewport verification passed; physical mobile/Safari and assistive-technology testing remain before a wider release.
- The real match pool is empty; the demonstrated Rowan introduction is fictional and does not populate real account matching.
