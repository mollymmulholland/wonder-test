# WONDER — Sanctuary release candidate

This record supersedes the implementation-status tables in EDITORIAL-BETA.md and UNDERSTANDING-JOURNEY.md. September 21, 2026. The repository remains vanilla JavaScript, Node, Vercel, and Supabase.

## What changed

The public experience starts with an immersive welcome and a real account form. After verification, a personal threshold leads to a five-place discovery map: Earth / The ground, Water / The crossing, Fire / The clearing, Air / The horizon, Ether / The inner room. Each chapter has an arrival and a consistent reading space. The approved item bank and scoring remain intact: 35 core items and 6–10 adaptive refinements. The map is exploratory; its use is never a psychological signal.

The design takes the sense of passage and a visible destination from [Journey](https://thatgamecompany.com/journey/), and question-led exploration from [Outer Wilds](https://www.mobiusdigitalgames.com/outer-wilds.html). These are design references, not evidence of a most-engaging game or of geometry inducing a particular mental state. No streaks, timers, points, scarcity, or compulsory animation were added.

The twenty current repository archetypes remain canonical. The historical twelve-name list was not substituted. Each has fifteen distinct report sections, with response-specific dimensional interpretation, supporting context, a reflection, optional pressure material, correction controls, and a usable report when the archetypal lens is rejected. The reports are interpretive, not validated predictive or clinical instruments.

## Implemented paths

| Area | Behavior |
|---|---|
| Account | Email verification and recovery, email or username/password sign-in, account-bound HttpOnly cookies, rate limits, adult gate |
| Secure return | Platform WebAuthn passkeys; public credentials only; password confirmation before enrollment/removal; origin, challenge, verification and counter checks |
| Discovery | Five elemental environments, map inspection, saved progress, review, compare-and-swap answers, resume, scored Mirror arrival |
| Mirror | Twenty authored archetypes, fifteen sections each, grounded observations, correction preview, history, mixed/unassigned/rejected lens |
| Journal | Private writing, autosave, search, edits, tags, deletion, saved export and separate open-draft export; no automatic model reading |
| Portrait | Editable approved narrative and interests, private JPEG/PNG/WebP upload, server re-encoding/metadata removal, human photo review, authenticated photo delivery |
| Introductions | Explicit cohort membership, reciprocal preferences, sufficient permitted assessment evidence, common approved interests, one new proposed pair at a time, no recycled pair |
| Human connection | Independent interest, mutual messaging, retry-safe message identifiers, explicit proposed/accepted plans, calendar export, cancellation, closure, blocking, multiple existing connections |
| Reflection | Attendance first, optional private reflection, uncertain responses, separate reviewed learning |
| Operations | Restricted #ops route for existing authorized staff; photo and cohort review, support queue, pending deletion retries |
| Departure | Password confirmation; access tombstone; stored portrait removal; Auth deletion and cascading private/derived records; pending removal is stated accurately |
| Installability | Web app manifest and icons; standalone launch; public offline screen only, with no private API caching |

## AI boundary

WONDER owns the existing scoring/person model, report library, matching rules, context permissions, and agent-action boundary. This change does **not** create or train a new foundation language model.

The conversational runtime accepts a replaceable, explicitly configured HTTPS endpoint using either Responses or Chat Completions protocol. A self-hosted open-weight model can serve the latter using [vLLM’s compatible server](https://docs.vllm.ai/en/stable/serving/online_serving/openai_compatible_server/). No external model provider was silently added and no paid model calls were made.

Required server variables: `WONDER_INFERENCE_ENABLED=true`, `WONDER_INFERENCE_URL` (full endpoint), `WONDER_INFERENCE_MODEL`, `WONDER_INFERENCE_KEY`, and `WONDER_INFERENCE_PROTOCOL=responses|chat-completions`. No live endpoint is configured by this release. Before enabling one, establish model license/weights, compute, retention/logging, evaluations, and measured latency. `infra/inference/compose.yaml` is a deployment scaffold, not evidence that an inference host is running.

The subsequent [model-host package](../infra/inference/modal_host/README.md) selects Modal Servers and a pinned Qwen3-8B candidate, with a private 64/16/32 authored train/development/holdout corpus, completion-only QLoRA and human evaluation. CPU contracts, tokenizer checks and transport tests pass; no GPU job or live model is connected. Hosting account and a proposed $50 gross experiment budget need owner action. Cloud deployment, quality and live acceptance remain release gates.

The Mirror receives only submitted conversation and explicitly selected material. It has no database tools or access to another member. It can propose a memory or prepare conversational questions. A memory requires an editable preview and separate choices for retention and introduction use. Proposals are owner-bound, expire after an hour, use account-version checks, and cannot replay. Expired proposals are removed on the next request from that user. Nothing autonomously sends a message, accepts a date, or changes a portrait.

## Matching scope

`lib/introduction-engine.js` compares permitted, evidenced dimensions and approved shared interests after reciprocal hard requirements. Pressure, shadow hypotheses, journals, messages, date feedback, and raw private corrections are excluded. Rejected or uncertain report dimensions are removed from comparison. The ordering threshold is a provisional product rule, not measured compatibility. No percentage is shown. Free-text memories are retained with permission but are not automatically reinterpreted as matching scores.

The first controlled cohort is configured as `dallas-beta`; an existing authorized operator chooses its members. No existing member has been activated automatically. Selecting an introduction does not send a notification or charge anyone. Email/push contact and date reminders are not connected; use in-app refresh and calendar export. Support submissions enter a restricted queue; an operator must actually staff it.

## Database applied

- `20260921210146_understanding_journey.sql`
- `20260921210152_sanctuary_release.sql`
- `20260921210401_private_account_guard.sql`

Hosted project: `ernpiurftcjkvnicogsp`. All new sensitive/operational tables use RLS; only the owner can read private journey state. Passkeys, connection storage, moderation and action proposals have no direct browser grants. Internal deletion checks live outside the exposed API schema. Portrait bucket is private and limited to 1 MB normalized photographs.

Existing private records are removed through the verified foreign-key cascade when Auth removes an account. The audit log is explicitly cleared for the user’s own activity and inference runs. A deletion receipt remains to deny active access. Legacy `photo_assets` records require operator handling if introduced later; there are zero such records in the inspected project. Backup expiry is controlled by provider retention, not by this application.

## Verification evidence

Passing local suites cover 300 report sections; three complete assessment paths (41, 45, 45 answers); all five new chapter gates and Mirror arrival; account verification/recovery contracts without sending email; a complete two-person DOM journey; actual PostgreSQL RLS, conflicts, single-use proposal acceptance, and deletion; reciprocal matching and rejected-inference exclusion; and real cryptographic WebAuthn signatures with wrong-origin, wrong-challenge, missing-verification, invalid-signature and replay rejection.

A transaction in the hosted Supabase project created two isolated synthetic users, proved each could read only their own journey, proved deletion immediately denied the existing identity, and rolled back all synthetic data. No real member’s private content was used in testing.

Run: `npm run test:release`. No test sends a real email, message, charge, or model request.

The Vercel release build completed successfully. Browser verification covered the deployed welcome, account-entry fields, 390 px phone layout, synthetic essentials, elemental map inspection, Earth chapter arrival, and saved question progression. No application console errors were observed in those checks. The phone check identified and corrected missing spacing at a responsive headline break. This browser verification does not substitute for the real-account, email, storage, and physical-device gates below.

## Remaining release gates

1. Public publishing access: Vercel project `wonder-mvp-preview` has authentication protection enabled. The connected app can inspect deployments and create temporary share links, but its deployment mutation tool is unavailable; the browser and CLI have no authenticated write session. A stable public app origin still requires Vercel configuration. User publishing permission is already granted; this is an access/capability gap.
2. Verify real confirmation/reset email delivery and return URLs on that stable origin. Existing tests use a fake Auth transport and do not establish SMTP delivery or inbox behavior. Confirm appropriate Supabase Auth SMTP, Site URL, redirect allowlist and rate limits before inviting users.
3. Supabase’s security advisor reports leaked-password protection is off. Enable [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) in Auth configuration. The earlier public definer-function warning was resolved.
4. Register, use, cancel, remove and recover from a passkey on physical iPhone/Safari and a second supported device at the final origin. A cryptographic test cannot establish actual Face ID UX; passkeys are tied to the origin where they are enrolled.
5. Choose and provision the controlled model runtime if live conversational Mirror is part of launch. Evaluate its reflective quality and safety before enabling it. Saved Mirror, correction, journal and matching do not require model credits.
6. Run two real isolated acceptance accounts through the deployed Auth/Storage/API chain on the final origin, including upload review, cohort membership, mutuality, stale actions, block and permanent deletion. Hosted RLS tests and local full-flow tests are narrower evidence.
7. Assign the existing operator to review portraits and support requests. Confirm the final privacy/support and backup-retention disclosures against actual operating practice.

This is an implemented release candidate with real backend boundaries. It is not a claim that the full public beta, live model, or native App Store binary is already released.
