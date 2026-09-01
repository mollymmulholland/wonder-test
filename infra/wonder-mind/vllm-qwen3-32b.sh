#!/usr/bin/env bash
set -euo pipefail

# Wonder Mind self-hosted inference profile.
# Run on Wonder-controlled GPU infrastructure. Do not expose this service publicly
# without network controls, TLS, authentication, rate limits, and observability.

: "${WONDER_MODEL_API_KEY:?Set WONDER_MODEL_API_KEY before serving}"
MODEL="${WONDER_MODEL_NAME:-Qwen/Qwen3-32B}"
PORT="${WONDER_MODEL_PORT:-8000}"
TP="${WONDER_TENSOR_PARALLEL_SIZE:-2}"
GPU_MEM="${WONDER_GPU_MEMORY_UTILIZATION:-0.90}"
MAX_LEN="${WONDER_MODEL_MAX_LEN:-32768}"

exec vllm serve "$MODEL" \
  --host 0.0.0.0 \
  --port "$PORT" \
  --api-key "$WONDER_MODEL_API_KEY" \
  --tensor-parallel-size "$TP" \
  --gpu-memory-utilization "$GPU_MEM" \
  --max-model-len "$MAX_LEN" \
  --reasoning-parser qwen3 \
  --enable-prefix-caching \
  --disable-log-requests
