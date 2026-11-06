# Controlled Dallas beta: acceptance and operations

This checklist adds release evidence to the existing Sanctuary implementation. It does not replace the product, migrations, item bank, reports, or matching rules. No item is passed merely because code exists or a local test succeeds.

## Smallest launch scope

Keep verified email/password accounts, discovery and saved progress, authored Mirror reports and corrections, private journals, reviewed Connection Portraits, operator-approved `dallas-beta` membership, reciprocal introductions, mutual messaging, plans, blocking/reporting, export and deletion.

Keep live inference disabled. The configured adapter and model-host scaffold are experimental work. The RRE/ISD conceptual framework does not establish a trained, deployed, or evaluated relational intelligence system. Preserve this work for a separate evaluated release. No native app, payments, reminders, push delivery, or new model training is needed for this cohort.

Passkeys are optional for password users, but are currently exposed in the UI. Complete physical-device acceptance before inviting members, or explicitly disable their UI and server operations in a separately reviewed change. Do not treat cryptographic tests as iPhone acceptance.

## Release evidence record

Record the final HTTPS origin, Git SHA, production deployment ID, Supabase project, test date, tester, browser/device versions and outcome for each row. Keep private evidence, identities, screenshots, billing information, and credentials outside this public repository. Do not attach cookies, Auth URLs with tokens, service keys, or real member content.

| Gate | Required passing evidence |
|---|---|
| Backend availability | Supabase active; Auth and REST reachable; expected migrations, RLS, grants, private portrait bucket and authorized operators inspected in the hosted project. A clean advisor response from an inactive project is insufficient. |
| Stable public origin | Fresh unauthenticated desktop and phone sessions load the final origin, assets and `/privacy` without Vercel login or a temporary share link. Old origin redirects to the intended origin. |
| Account mail | Confirmation and reset emails arrive at two controlled inboxes; links land on the final origin and complete the flow in the requesting browser. Expired/replayed/different-browser links recover safely. |
| Password protection | Supabase leaked-password protection enabled and a deliberately known compromised test password rejected at signup and reset. Verify the provider configuration; the app's minimum-length rule is not this control. |
| Passkeys, if offered | Physical iPhone/Safari plus a second supported device: enrollment, sign-in, cancellation, removal, password fallback, reset/recovery, and old-credential rejection at the final origin. |
| Deployed product | Two isolated ordinary accounts complete the matrix below through Vercel, Auth, database and Storage. Operators use a separate authorized account. |
| Privacy publication | [BETA-PRIVACY-REVIEW.md](BETA-PRIVACY-REVIEW.md) decisions closed; responsible entity and tested signed-out contact approved; actual email service and retention/backup practices verified; final notice approved with effective date. Name a model provider only if one is actually enabled. |
| Operating coverage | Primary, backup and technical responder accept queue checks, privacy requests, deletion retries and incident response; access and absence handoff tested; earlier human-review scope explicitly reconciled. Privacy wording alone is not coverage. |

## Authentication setup

1. Choose the origin before account links or passkey enrollment. A custom origin needs `WONDER_AUTH_ORIGINS` as an exact HTTPS origin. The server also recognizes Vercel's deployment, branch and project production origins.
2. Verify Supabase Site URL and redirect allowlist against that origin. Keep email confirmation on. Configure SMTP delivery, sender identity and invitation-batch limits; default mail is not adequate evidence of external-user delivery.
3. Review provider password settings. Leaked-password protection requires an eligible plan; do not claim it is enabled based on the source code or local weak-password response test.
4. Use the normal signup UI with two owned inboxes. No admin auto-confirmation, magic-link shortcut, generated token, or service-role API may count as email acceptance.
5. Confirm password reset invalidates refresh sessions and requires a new sign-in. Inspect HttpOnly/Secure/SameSite cookie flags and no-store API headers without retaining token values.

The app deliberately binds confirmation/reset flows to the requesting browser with a signed PKCE verifier. Different-browser links should explain how to request a fresh link; this is not evidence of email failure by itself.

## Two-account acceptance matrix

Use fictional adult profiles A and B, separate browser contexts and owned inboxes. Keep both outside the matching cohort until the operator approves them. Never mix test identities with real users. Exercise the deployed UI/API, not only direct SQL.

| Step | Expected result |
|---|---|
| Signup/confirmation | Each account requires email confirmation; A cannot acquire B's session. Username/password and email/password return work. |
| Recovery | Reset arrives and works at final origin; replay, expiry and wrong-browser use fail safely. Former password fails after reset. |
| Essentials/discovery | Adult gate and processing permission enforced; progress survives reload and sign-out; all five elements complete. |
| Mirror | Authored report loads; review/correction history works; rejected/uncertain dimensions are excluded from matching evidence. |
| Journal | Save, reload, search, edit, tags, export and delete work. Concurrent saves return conflict and preserve unsaved draft. B cannot obtain A's content. |
| Photo review | JPEG/PNG/WebP upload succeeds; metadata removed; bucket private; no anonymous photo access; unapproved photo prevents availability. Operator sees and approves only intended test photograph. |
| Cohort control | Unapproved account cannot get introductions. Approving A and B in `dallas-beta` allows eligible reciprocal matching. |
| Mutuality | One-sided interest never opens messaging. Mutual interest does. Retried message identifier produces one message. |
| Plans | One person proposes; the other explicitly accepts. Time zone, calendar export and cancellation match the displayed plan. |
| Privacy boundaries | B cannot fetch A's journey, journal, assessment, report or unauthorized photo by guessing IDs. An ordinary account cannot open operations. |
| Stale state | Changes in preferences, permissions or availability invalidate stale proposed actions. Pausing stops new introductions. |
| Block/report | Block immediately closes contact; no pair recycling; report enters restricted queue and operator can resolve it. |
| Export/deletion | Export includes the intended test account only; omissions (connection messages/plans, photo bytes, operational/provider records) are disclosed and a manual request route exists. Password-confirmed deletion denies old session access after receipt creation, removes linked rows and photographs, and removes the stored connection for both participants. Test the surviving receipt, reporter-owned report deletion and retained third-party report text separately. Exercise pending-deletion retry safely in staging. |
| AI unavailable | Saved report, correction, journal and introductions work while conversational AI is explicitly unavailable. No external model is silently called. |

Record any failure with the action, expected result, observed result, deployment SHA and reproduction steps. Stop invitations on any authorization/privacy failure or unreliable account recovery. After deletion, confirm cleanup for both test identities without retaining their private content in the report.

## Operations before invitations

Assign an owner and backup for portrait review, cohort membership, support/abuse reports, pending deletions, service availability and incident response. A database role alone is not operational coverage. For the first cohort, schedule explicit queue checks and communicate the response window actually staffed. Confirm an accessible support email or monitored invitation reply address for people who cannot sign in.

The expanded `/privacy` copy is a draft, not an approved notice. Use [BETA-PRIVACY-REVIEW.md](BETA-PRIVACY-REVIEW.md) for the evidence matrix, proposed operator coverage, retention inventory and publication decisions. Finalize the public responsible entity/contact, email service, category-specific retention, backup/file-copy inventory and restore/deletion procedure. The source establishes some event-based deletion behavior; it cannot establish provider settings or staffing. Do not invent expiry periods, promise immediate backup erasure or claim validated compatibility.

Keep three distinct outcomes: privacy publication approval, staffed operating acceptance, and technical deployment/security acceptance. None substitutes for another. The source offers photo and cohort review, not approval of every introduction or sensitive Mirror claim. Resolve that difference from earlier governance requirements before invitations. Pause stops new introductions but does not alone stop an existing mutual connection; disabling cohort membership is not an emergency service-wide suspension.

Start with a small operator-managed group, for example 6-10 invited Dallas adults with reciprocal preferences. Self-reflection can work in a sparse cohort; introductions require eligible reciprocal candidates. Cohort membership gates introductions, not signup. If the entire application must be invite-only, add a server-enforced registration allowlist and review direct Supabase signup access separately.

## Repeatable checks

```sh
npm ci --ignore-scripts
npm run test:release
npm run build
node scripts/check-beta-public.js https://FINAL-APP-ORIGIN
```

`test:release` uses local PostgreSQL (PGlite), synthetic data, fake Auth transports, DOM simulations and real cryptographic signatures. It never proves actual inbox delivery, deployed Storage access or physical-device UX.

`GET /api/health` checks Auth settings reachability and a zero-row query against the journey table. It returns only `{ok:true}` or `{ok:false}`. It does not certify SMTP, Storage, RLS, operator coverage, or beta acceptance. The smoke script sends only anonymous checks; it creates no account and sends no email.

## Promotion and rollback

After resolving external service/configuration gates, validate the reviewed commit in a preview or staged deployment, then repeat final-origin acceptance against the exact production deployment before invitations. Preview success cannot validate production environment values or passkey origin behavior. Do not merge or promote solely because the build is READY.

Keep a known-good deployment and pause new cohort approvals if health, recovery, privacy or messaging fails. Disable live inference independently if ever introduced. Diagnose before destructive migrations or replacing backend infrastructure. Preserve existing data and engineering work.
