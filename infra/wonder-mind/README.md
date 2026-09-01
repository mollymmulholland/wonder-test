# Wonder Mind inference substrate

Wonder Mind is designed to remain independent from proprietary inference providers. The neural substrate is replaceable; Wonder's constitution, cognitive routing, memory, provenance, ethics, evaluation, and product behavior remain owned by Wonder.

## Initial candidate

Primary candidate: `Qwen/Qwen3-32B` served on Wonder-controlled infrastructure through vLLM.

Why this candidate:
- dense 32B scale is materially more capable than lightweight local chat models while remaining self-hostable;
- Apache-2.0 published license;
- explicit reasoning/non-reasoning modes;
- current vLLM support for Qwen3 reasoning parsing and structured outputs;
- compatible with the gateway already implemented in `lib/wonder-model-gateway.js`.

This is a candidate, not an unquestioned production dependency. Promotion requires passing Wonder's constitutional, epistemic, behavioral, latency, and structured-output gates.

## Required production topology

Consumer Wonder app -> Vercel API boundary -> Wonder Mind runtime -> private Wonder model gateway -> Wonder-controlled GPU service -> model weights.

The GPU service should not be directly reachable from the public internet unless protected by a hardened ingress layer. Minimum controls: TLS, API-key rotation, private networking or allowlisting where available, request-size limits, rate controls, centralized logs, health probes, GPU/VRAM telemetry, and separate staging/production credentials.

## Application environment

Configure the Wonder application with:

- `WONDER_MODEL_BASE_URL=https://<private-inference-host>`
- `WONDER_MODEL_NAME=Qwen/Qwen3-32B`
- `WONDER_MODEL_CANDIDATE=qwen3-32b`
- `WONDER_MODEL_API_KEY=<strong-random-secret>`
- `WONDER_MODEL_STRUCTURED_OUTPUTS=true`

The gateway calls `/v1/models` for readiness and `/v1/chat/completions` for inference. An OpenAI-compatible wire protocol does not imply use of OpenAI; it is simply the serving contract implemented by vLLM.

## Reasoning policy

Wonder does not run every request at the same reasoning depth.

- `match`, `post_date`, `relationship`, and `mirror`: deliberate reasoning.
- `assessment`: balanced reasoning.
- ordinary `chat`: adaptive reasoning.

The model substrate may expose reasoning tokens internally, but Wonder's user-facing and administrative APIs must not expose hidden chain-of-thought. The runtime persists concise auditable claims, evidence, alternatives, counterevidence, confidence, ethics results, and falsification conditions instead.

## Promotion gates

A candidate model may not become the production Wonder substrate merely because it sounds intelligent. It must satisfy the gates in `lib/wonder-mind-model-registry.js`, including zero critical constitutional violations, structured-output validity, epistemic calibration, corrigibility, third-party humility, acceptable latency, and licensing review.

## Rollback principle

Model promotion must be reversible. Wonder's application code should refer to a model-version record and environment-selected candidate, not hard-code cognition to a single vendor or family. A substrate can be retired without rewriting Wonder's constitution or cognitive architecture.
