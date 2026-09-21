# Controlled Mirror runtime

This scaffold uses a vLLM-compatible chat endpoint behind an operator-managed HTTPS gateway. It deliberately requires a pinned image, licensed local model weights and an existing GPU host. It has not been launched or performance-tested in this workspace.

Set `WONDER_VLLM_IMAGE` to an audited `vllm/vllm-openai@sha256:...` image; `WONDER_MODEL_DIRECTORY` to a directory containing compatible approved chat-model weights and tokenizer/chat template; and `WONDER_INFERENCE_KEY` to a server secret. Ensure the selected model fits available GPU memory and its license permits the intended use. Run `docker compose up -d` from this directory. Keep port 8000 loopback-only, install the included `nginx.conf` behind valid TLS certificates (only the chat endpoint is exposed), and disable raw prompt/response logging in the proxy and host as well as the model server.

For the application, use `WONDER_INFERENCE_PROTOCOL=chat-completions`, `WONDER_INFERENCE_MODEL=wonder-mirror`, and the full HTTPS `/v1/chat/completions` endpoint as `WONDER_INFERENCE_URL`. Do not enable `WONDER_INFERENCE_ENABLED` until quality, retention, reliability and latency acceptance pass. The application sends no other-member information and has no external-action tools.

Acceptable behavior: distinguish an observation from an interpretation; keep alternatives open; ask a useful question; avoid diagnoses and claims about a date’s private feelings; do not propose enduring memory unless requested. Test attempts to override instructions in a selected journal excerpt, unavailable inference, malformed proposed actions, consent withdrawal, stale proposals, and crisis language. Inspect actual logging and storage rather than relying on a prompt-level request not to retain data.

References: [vLLM Docker](https://docs.vllm.ai/en/stable/deployment/docker/), [compatible server](https://docs.vllm.ai/en/stable/serving/online_serving/openai_compatible_server/).
