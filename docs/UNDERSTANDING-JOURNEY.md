# WONDER — Understanding-first journey

Development revision, September 21, 2026. This document supersedes EDITORIAL-BETA.md for this branch. Published to a protected review preview on September 21 after user approval. Production and hosted Supabase schema remain unchanged. Do not describe this branch as production-ready.

## What changed

The product now has five consumer destinations: Home, Mirror, Introductions, Journal, and Account. Mirror includes its overview, full report, conversation, corrections, and change history. Human conversation and meeting plans belong to an introduction. On phones, navigation is fixed at the bottom with labels, vector icons, and safe-area padding.

The existing vanilla JavaScript, Node handlers, Vercel, and Supabase architecture is retained. No frontend framework migration or new inference provider has been introduced. npm development dependencies are pinned and are used only for isolated verification.

## Reconciliation with the specification

The repository's current instrument has 35 core questions and 6–10 adaptive refinement items, presented as Earth, Water, Fire, Air, and Ether. The 36-interaction historical instrument and proposed six editorial chapters are not treated as canonical. Scored item IDs and weights remain intact. All scored items remain required for a complete report; users can pause and resume. Final review now offers an edit action for every response before report preparation. The unmeasured duration promise and response-time submission have been removed. New assessment completion evidence excludes speed and change-count interpretation.

Twenty archetypes remain supported, rather than silently replacing them with the twelve historical names. All twenty now contain fifteen navigable sections (300 section records). Existing authored interpretations remain separate from personal observations derived from supported dimensions. Sections include basis, context, uncertainty, and a reflection. Mixed, provisional, unassigned, and rejected lens states are supported. An unassigned report is returned when there is no supported primary archetype. The existing assignment algorithm itself has not been psychometrically validated or recalibrated.

## Screen inventory

| Destination | Screens and actions |
|---|---|
| Arrival | Brand promise, Begin, How WONDER works, Sign in, explicit demonstration |
| Access | Verified email account creation, chosen name, DOB eligibility check, broad city, recovery and expired-link paths retained |
| Discovery | Essential privacy/age step, existing five-element instrument, progress, saved responses, previous question, full response review, individual answer revision, report preparation/retry |
| Home | One next action based on essentials, unfinished discovery, Mirror review, shared portrait, availability, interest, or confirmed meeting; optional private prompt |
| Mirror | Overview, fifteen-section reader, archetype library in demo, lens rejection, claim fit/partial/reject/unsure, correction preview/apply, dated change history, distinct sample/live conversation, visible selected context, optional takeaway proposal |
| Introductions | Approved shared portrait, reason/difference/unknown, interested/decline/later, pending mutuality, human conversation, proposed/accepted/cancelled plan, calendar export, closure, block, private concern capture |
| Journal | Optional title, writing, tags, autosave, saved/error state, editing, search, export, deletion, selected excerpt/entry reflection with explicit confirmation |
| Account | Essentials, portrait edit/preview/approval, age/city requirements, city interest/withdrawal, availability/pause/seeing-someone, processing versus matching permission, remembered insights/withdrawal, larger text, reduced motion, export, departure |
| Post-date | Attendance first; yes/rescheduled/cancelled/no/private; optional experience questions with uncertainty; private text; proposed contextual takeaway; separate human-message action |

## Capability status

| Capability | Implemented status | Remaining release work |
|---|---|---|
| Resettable synthetic journey | Complete in application; two named fictional adults with independent private records and separate interest actions | Desktop opening, Mirror reader, introduction and independent mutual interest verified in a protected browser preview; mobile and accessibility review remain |
| Fifteen-section reports and corrections | Implemented; supporting dimensions and archetypal material labeled separately; revised claims replace originals; private history retained | Editorial review of all twenty lenses; stronger item-level supporting excerpts and versioned assessment history |
| Private journal, corrections, permissions, memories | Implemented UI, server event validation, optimistic versioned persistence, RLS migration, local PostgreSQL tests | Apply reviewed migration to a development Supabase project, then verify real cross-device auth and persistence |
| Shared portrait | Text edit, exact audience preview, approval, illustrated synthetic portraits | Real photo upload, storage authorization, moderation and approval workflow. Do not activate real introductions without these. |
| Human mutuality, messages and plans | Synthetic flow complete; authenticated server pair adapter and atomic PostgreSQL commit function implemented | Actual pair delivery/rationale pipeline, operational moderation, full hosted integration test. Real delivery remains gated. |
| Required preferences | Reciprocal adult age bounds and same-city requirement enforced in shared rules | Gender/audience eligibility, travel distances, full required/important preference taxonomy and remaining practical constraints |
| Waiting and city interest | Honest states and private city-interest save/withdrawal | Invitation/referral lifecycle, operational city waitlist notifications and access tooling |
| Interactive Mirror | Explicit sample responses in demo; stateless replaceable inference adapter, selected context only, no automatic retrieval or retention | Approved controlled inference endpoint, retention policy, evaluation, reliability and safety checks |
| Notifications / reminders | No delivery; UI says reminders are unavailable. Cancellation clears queued reminder data in the state machine. | Actual outbox, delivery, cancellation and retry infrastructure |
| Moderation / support | Block enforcement; explicitly local simulated report or private concern capture | Staff queue, delivery, review workflow, support contact and response policy |
| Export | New and existing private-data export endpoint, local downloadable demo export | Hosted export verification and large-export background jobs |
| Deletion | Synthetic actor deletion and access invalidation work; live endpoint refuses before changing anything | Complete verified deletion across Auth, legacy derived stores, storage, caches, exports, operational events and retention obligations |
| Payment | No charges, subscriptions, or checkout; beta free | Only implement a separately approved pricing experiment. No transaction or idempotent-payment claims are made. |
| Accessibility | Semantic controls, vector navigation, focus placement, dialog labels, readable labels, minimum touch sizes, explicit states, large-text and reduced-motion settings | Real browser rendering, keyboard, screen reader, physical mobile/Safari, and contrast review |

## State and permission boundaries

`public-shared/journey.js` contains deterministic state transitions. It has no network, analytics, inference, or embedded private data. The same transition checks are used by the UI demonstration and the server. The client is not trusted to authorize real requests.

Private state lives in `wonder_private_journey`, keyed by authenticated user ID. Authenticated clients have owner-only SELECT access and no direct mutation grants. The server derives the owner from the verified auth session, accepts allowlisted events, validates them, and writes only if the stored version matches the client's expected version. A concurrent edit produces a conflict; the draft stays in the composer. Existing journals are imported on first initialization without deleting their original records. Existing records are included in export.

The private object contains logically separate evidence references, corrections, memories, writing, reflections, permissions, and portrait drafts. The connection object is a separate database table and contains operational shared state only. A future normalized schema may split private collections as volume grows; this implementation does not claim they occupy separate tables already.

`wonder_connections` has no direct anon/authenticated table access. Its server adapter verifies membership and projects only permitted shared content. The atomic commit RPC is invoker-mode and service-role-only. It locks both participant records and the connection in a consistent order, verifies all versions, and refuses stale changes. The application transition is re-evaluated against both participants' current state before commit. A block is terminal; there is no unblock/reintroduction route. One-sided interest never opens messages or plans. Repeated message IDs do not append duplicate messages. Only the counterpart can accept a meeting proposal.

A correction pauses introductions. Rejected or partly fitting claims show the reviewed replacement. Unsure claims remain explicitly uncertain. Matching permission is separate from private retention, and turning matching permission off clears optional memories' and corrections' matching grants. It does not silently restore them later. Journal deletion removes linked optional memories and active context. Original report wording remains only in the private change history. Legacy automatic matching generation is disabled in this branch so rejected hypotheses cannot continue through that path.

The updated Mirror endpoint does not query stored journals, reports, memories, conversations, or other members. It processes the current message and an explicitly selected excerpt only. Provider calls use `store:false`; this requests provider behavior, not a guarantee of zero provider retention. Operator approval of the actual service policy is still required. No conversation persistence or enduring profile mutation occurs in that route.

## Inference and cohort configuration

No provider is enabled by default. `WONDER_INFERENCE_ENABLED=true`, `WONDER_INFERENCE_URL`, `WONDER_INFERENCE_KEY`, and `WONDER_INFERENCE_MODEL` must identify an explicitly approved Responses-compatible service. The URL must use HTTPS. The earlier automatic OpenAI dependency is removed. An unavailable endpoint returns an honest error and preserves the composer. Demo responses never call this adapter.

Real connection access requires `WONDER_COHORT_ACTIVE=true` and server-controlled `app_metadata.wonder_cohort='dallas-beta'`. User metadata is not an authorization source. Activation also requires photo moderation approval stored server-side, portrait approval, review, adult eligibility, relevant consents and availability. This is an implementation gate, not evidence that those operational processes have been completed. Do not switch it on until the missing constraints and release checks above are resolved.

No live migration, cohort changes, email, notification, charge or model request occurred during this revision.

## Demonstration procedure

1. Open the development build and choose Explore the demonstration. The seeded Alex and Rowan are fictional adults; their vector portraits are original illustrations, not real member photographs.
2. In Mirror, read the overview, choose Full Mirror, then mark a claim Partly or Doesn't fit. Write the replacement, preview it, and apply it. Review Changes.
3. Preview or edit the Connection Portrait; approve it. In Account, review permission and availability before resuming after a correction.
4. Open Introductions as Alex and express interest. Contact stays closed. Use Demonstration controls to switch to Rowan and independently express interest.
5. Write a simulated human message. Propose a written day/time/time zone and public location. Switch actors and accept the plan.
6. Record whether you met. Save the reflection privately. Optionally write a context-specific takeaway and separately choose whether to remember it and permit introduction use.
7. Write a journal entry, pause for autosave, search it, and select just an excerpt for Mirror. Remove the active excerpt. Switch actors to verify the private entry is absent.
8. Try pause, changed requirements, blocked, cancelled, empty and failed scenarios. Delete one fictional account or reset all fictional records.
9. To show the complete discovery, choose Start with discovery. Complete private essentials, answer the approved instrument, review answers and generate the personalized report.

Synthetic records stay in a distinct sessionStorage store. They do not create Supabase accounts, live matches, payment records, messages, notifications, analytics or learning events. They persist across refresh within the same tab and clear with explicit reset. Do not write real intimate material into a shared demonstration device.

## Verification and commands

- `npm ci --ignore-scripts` installs pinned test-only dependencies.
- `npm run test:journey` tests the domain transitions, PostgreSQL policies/RPC using PGlite, authenticated handler contracts with fake transport, and the rendered DOM flow using jsdom.
- `node scripts/qa-auth-flows.js` tests verified signup, PKCE/recovery, cookie privacy, expiry and rate-control contracts with a fake provider. No mail is sent.
- `node scripts/qa-local-regression.js` runs three complete adaptive assessment paths against a local HTTP server.
- `node scripts/qa-archetype-system-v2.js` and `node scripts/qa-archetype-precision.js` verify existing assignment/adaptive behavior.
- `npm run build` creates public assets only. Backend code and test dependencies are not copied to the public directory.
- `npm run dev` starts the local application at localhost:3000.

Passed: twenty-by-fifteen section completeness; unchanged archetype/adaptive tests; adult gate; owner derivation; cross-account read denial; anonymous denial; direct mutation denial; concurrent/stale write rejection; RPC membership/version boundary; mutual interest; duplicate-message prevention; counterpart meeting acceptance; cancellation clearing queued reminder data; correction replacement; permission withdrawal; private projections; context removal; autosave; synthetic deletion; and the complete two-actor DOM journey. These are implementation tests, not scientific validation.

The remote browser rejected localhost with ERR_BLOCKED_BY_CLIENT. No browser restriction was bypassed, no public tunnel was created, and no alternative browser controller was used. jsdom verification does not prove layout, focus appearance, contrast, or Safari behavior. After publishing approval, the protected desktop preview was opened and visually inspected. The opening, fifteen-section reader, fictional portrait, pending interest and separate second-user mutuality were verified in the browser. Physical mobile, screen reader, contrast and full browser journey verification remain outstanding.

## Product decisions left explicit

- Keep current twenty archetypes and five elements pending an approved instrument revision.
- No numeric compatibility claims, psychological diagnosis, hidden readiness ranking or paid private disclosure.
- Free beta; live inference conditional; research/model-improvement disabled.
- Original illustrations are acceptable only for clearly labeled synthetic adults, not real dating profiles.
- Prior auth uses same-browser PKCE confirmation/recovery. Cross-device email-link completion is not implemented; signed-in stored discovery can resume after authentication on another device once the hosted persistence changes are applied.
- Section-view discovery, voice, richer communication preferences, exact audience preference constraints, auto-generated portrait prose, background generation and comprehensive longitudinal memory retrieval remain unimplemented. They are not presented as functioning controls.
