# WONDER model host and first adaptation experiment

Prepared September 21, 2026. **No Modal account is connected, no GPU job has run, no adapter exists, and live inference remains disabled.** The application uses an existing replaceable inference interface; this package adds a concrete hosting/training path without changing the scoring or matching system.

## Choice and cost

Use Modal Starter with a single L4 per endpoint/job, US compute placement, and scale-to-zero serving. Qwen3-8B is a candidate baseline chosen for a manageable single-GPU experiment and existing tool support, not a claim that it is the newest or best model. It is [Apache-2.0 licensed](https://huggingface.co/Qwen/Qwen3-8B). The exact weight revision is `b968826d9c46dd6066d109eabc6255188de91218`. Retain its license and notices with any distributed weights/adapter.

The proposed experiment budget is **$50 gross workspace usage for the first billing cycle**, subject to owner approval. Set the workspace usage limit before running any cloud commands. Modal distinguishes gross usage budgets from net spend limits after credits. It stops workloads when the applicable limit is reached. This code cannot set or confirm a billing limit. [Budget behavior](https://modal.com/docs/guide/budgets)

Current published rates: Starter has no platform subscription fee and includes $30 monthly compute. L4 is $0.000222/second. CPU is $0.0000131/core/second and RAM $0.00000222/GiB/second. US placement adds a 1.15 multiplier. Volume storage is additional. [Pricing](https://modal.com/pricing)

Calculated from those rates and this configuration:

| Allocation | Estimated allocated-hour cost |
|---|---:|
| Serving: L4, 2 CPU cores, 16 GiB RAM, US | $1.17 |
| Training: L4, 4 CPU cores, 32 GiB RAM, US | $1.43 |

These are estimates before credits, storage and other applicable charges. Startup and five-minute idle windows count. Twenty allocated serving hours would be about $23.49; continuously running it is a very different bill. A two-hour training timeout bounds that job's requested resources, not all workspace spending. Avoid running baseline, candidate and training simultaneously. Actual training time, GPU fit, cold start and throughput are unmeasured.

## What is being trained

This is supervised QLoRA adaptation of an existing open-weight model. It is not foundation-model pretraining, clinical training, or training a compatibility predictor.

The private `wonder-authored-v1` bundle contains 64 authored targets for training, 16 for development loss, and 32 independent holdout prompts with human review criteria. No member answers, journals, corrections, contact data or private conversation history are included. The initial corpus is intentionally small and requires editorial review. Provenance declarations are checked in code; they do not replace inspecting the actual content.

The train/dev examples use the same policy as the application. User, system and earlier conversation tokens are excluded from loss; only the authored final response is learned. Qwen thinking is disabled. All 80 examples were checked with the real pinned tokenizer (171–265 tokens); none is truncated. Dataset hashes, policy hash, base revision, package versions, steps and adapter hashes accompany each run. A run is always marked candidate.

Training defaults: four-bit NF4, bfloat16 compute, rank-16 LoRA, batch 1, accumulation 8, seed 42, learning rate 0.0001, two passes (16 optimizer steps for this corpus), at most 100 steps. A callback stops after 90 minutes of training; Modal's hard function timeout is two hours. Retries, external experiment tracking and Hub publishing are disabled. The returned adapter is separate from immutable base weights. Quality cannot be inferred from lower development loss.

## Privacy and access

The serving primitive is a **Modal Server**, not a Web Function. Modal documents that Server request/response payloads are proxied without storage, while Function inputs/outputs can persist up to seven days. Only synthetic training data goes through Functions. [Provider retention](https://modal.com/docs/guide/security)

The Server requires platform Proxy Token authentication before autoscaling. Its two routes are `GET /health` and `POST /v1/chat/completions`. No model administration, tools, retrieval, uploads, responses store or docs route is exposed. The serving subprocess has stdout/stderr discarded so a backend exception cannot put intimate payloads in logs. This reduces debugging visibility: use health, status/latency and synthetic reproductions. Prefix caching and memory snapshots are disabled; weights and adapter mounts are read-only. No application database credential is present on Modal.

The runtime receives only text already authorized and submitted by the authenticated user's application request. There is no automatic journal or memory retrieval and no training-data collector. App-side reviewed memory proposals remain the only agent action. Choosing this host still requires the actual privacy disclosure and operator access arrangements to match its operation; this package does not claim zero provider metadata, physical memory erasure or HIPAA coverage.

Proxy Tokens differ from Modal deployment tokens. A server credential is `wk-<id>.ws-<secret>` in the existing Bearer header. Keep it in Vercel server environment variables, never frontend code or chat. Starter tokens do not offer the environment-scoped RBAC guarantees of plans that enable RBAC. [Authentication](https://modal.com/docs/guide/webhook-proxy-auth)

## Run sequence after account and budget approval

Run commands from the repository root. Use the existing authorized workspace, or create an owner-controlled account at [Modal signup](https://modal.com/signup). The owner completes sign-in, terms and payment details, and sets the approved usage limit in Usage & Billing. Then authorize the CLI through its browser flow; never paste account secrets into a conversation.

```sh
python3 -m venv .venv-model
. .venv-model/bin/activate
pip install -r infra/inference/modal_host/requirements.txt
modal setup
```

Extract the supplied private dataset under `model-private/wonder-authored-v1/`. That directory is ignored by git and excluded from the static site and Modal images. Validate and review it before upload:

```sh
python infra/inference/modal_host/corpus.py model-private/wonder-authored-v1
python -m unittest discover -s infra/inference/modal_host -p test_host.py -v
npm run test:model
```

1. Cache public base weights with a CPU job. This also initializes the empty run volume required by baseline serving. Cloud commands below can incur charges, including image builds.

```sh
modal run infra/inference/modal_host/jobs.py --action prepare --allow-paid-run
modal deploy infra/inference/modal_host/serve.py
```

2. Copy the actual baseline Server URL from deployment output. Create a Proxy Token in Modal settings. Set `WONDER_INFERENCE_URL` to its full `/v1/chat/completions` URL and `WONDER_INFERENCE_KEY` to the combined Proxy Token in a private local environment/secret manager. No credential is supplied by this package. Collect the baseline:

```sh
python infra/inference/modal_host/evaluate.py collect model-private/wonder-authored-v1 model-private/eval-baseline --label baseline --allow-paid-run
modal app stop wonder-mirror-baseline
```

The evaluation first verifies missing/invalid credentials are rejected, then warms the endpoint with a ten-minute limit. It submits each holdout once, saves local synthetic responses and leaves a blank human review CSV. It does not call a paid judge or score its own writing.

3. After reviewing the exact corpus, replace `REVIEWED_MANIFEST_SHA256` below with the digest printed by validation. Choose a new immutable run name. Only train/dev and the manifest are uploaded; holdout text stays local.

```sh
modal run infra/inference/modal_host/jobs.py --action train --dataset-dir model-private/wonder-authored-v1 --run-name wonder-v1-r01 --reviewed-dataset-sha REVIEWED_MANIFEST_SHA256 --allow-paid-run
```

If training fails or is interrupted, inspect only synthetic logs, preserve the failure evidence, and choose a new run name for a deliberate retry. No automatic retry or promotion is configured.

4. Inspect `run.json` and download the candidate artifacts for backup. Deploy the candidate separately:

```sh
modal volume get wonder-model-runs wonder-v1-r01 model-private/artifacts
WONDER_ADAPTER_RUN=wonder-v1-r01 modal deploy infra/inference/modal_host/serve.py
```

Point the private evaluation environment at the actual candidate URL. Collect once, then stop the candidate while reviewing:

```sh
python infra/inference/modal_host/evaluate.py collect model-private/wonder-authored-v1 model-private/eval-candidate --label candidate --allow-paid-run
modal app stop wonder-mirror-candidate
```

5. Read every response against its criteria. Enter named human reviews in both CSVs: each dimension uses 0 (unacceptable), 1 (needs revision), or 2 (meets the stated behavior). Dimensions are grounding, agency, usefulness, and voice. `critical_pass` is yes/no for respecting the case's essential boundaries, including on otherwise ordinary cases. Use a blinded, shuffled reading order when practical.

```sh
python infra/inference/modal_host/evaluate.py compare model-private/eval-baseline model-private/eval-candidate
```

The provisional experimental gate requires no failed cases/format failures, mean score at least 1.5/2, improvement of at least 0.1 over baseline, and warm p95 latency at most 20 seconds. These are product acceptance thresholds, not scientific calibration. A failed candidate is not deployed to users. If the baseline is better, keep the baseline and revise the training set using new development examples; do not repeatedly tune to the same holdout.

## Application connection and rollback

Deploy the accepted endpoint again only after review. Add these server-side variables to the intended Vercel environment; keep inference disabled until the hosted acceptance tests pass:

```text
WONDER_INFERENCE_ENABLED=false
WONDER_INFERENCE_PROTOCOL=chat-completions
WONDER_INFERENCE_MODEL=wonder-mirror
WONDER_INFERENCE_URL=<actual HTTPS Server URL>/v1/chat/completions
WONDER_INFERENCE_KEY=<private combined Proxy Token>
WONDER_INFERENCE_TIMEOUT_MS=110000
WONDER_INFERENCE_RETRY_COLD_START=true
```

The retry flag is specifically for the Server's pre-acceptance 503 cold-start response. Do not enable it for a provider whose 503 can mean accepted generation failed. The app retries neither ambiguous network failures nor generation failures. It retains entered text and gives useful busy/shorter-context errors. Browser/API/model time budgets are 115/120/110 seconds. A cold start can still exceed that; measure it and choose an affordable warm-container policy before any launch that requires predictable first-response latency. The five-minute idle setting and one-container limit prioritize experiment cost; they are not a throughput or availability promise. [Server behavior](https://modal.com/docs/guide/servers)

Before setting `WONDER_INFERENCE_ENABLED=true`, run two authenticated test accounts through actual Vercel → Modal requests: reflection, selected excerpt removal, no cross-account context, correction, proposal preview/decline/approval, separate matching permission, session expiry and unavailable/busy endpoint. Verify real headers, logs, budget and cold-start experience. SDK imports and CPU tests do not prove these properties on the deployed host.

Rollback: set `WONDER_INFERENCE_ENABLED=false` in the same Vercel environment and redeploy; saved reports/journals remain usable. Stop the relevant Modal app. Keep an accepted baseline configuration ready to redeploy if appropriate. Export artifacts before deleting training/adapter volumes. Model weights and synthetic files remain until deliberately deleted; stopping an app alone does not delete them. Do not delete a volume containing other approved runs.

## Verification completed here

- Modal 1.5.5 accepted the Server and Function definitions without a cloud invocation.
- All 80 train/dev examples passed the real pinned Qwen tokenizer and completion-only label checks.
- Eleven CPU tests passed: request surface, policy checks, context separation, retention/tool denial, sanitized errors, size limit, cancellation/concurrency, corpus integrity, member-data declarations and holdout exclusion.
- Application transport tests passed: policy parity, only supplied context, no storage request, HTTPS/no redirects, bounded 503 retry, no ambiguous replay, unavailable state.
- Existing full release suite and public-assets build passed. Training source/data is not in static output.

**Still unverified:** cloud image resolution/builds, weight download, L4 memory fit, GPU execution, actual hosted authentication/retention, training convergence, model behavior, real latency/cost, final Vercel credentials and end-to-end live acceptance. No successful train or host result is represented by a mock test.

Implementation references: [Modal vLLM example](https://modal.com/docs/examples/vllm_inference), [PEFT quantization](https://huggingface.co/docs/peft/developer_guides/quantization), [vLLM LoRA](https://docs.vllm.ai/en/stable/features/lora/). Serving and training have separate Torch environments; the baseline CUDA image is pinned by registry digest, and all explicitly used libraries are version pinned. Record resolved image IDs when the cloud builds actually run.
