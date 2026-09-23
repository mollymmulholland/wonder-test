import modal
from config import HERE, POLICY_PATH

PRIVACY_ENV = {
    "HF_HUB_DISABLE_TELEMETRY": "1",
    "DO_NOT_TRACK": "1",
    "VLLM_NO_USAGE_STATS": "1",
    "VLLM_LOGGING_LEVEL": "ERROR",
    "WANDB_DISABLED": "true",
    "TOKENIZERS_PARALLELISM": "false",
}


def source(image):
    # Never include datasets, model artifacts, credentials, or the repository root.
    for name in ("config.py", "gateway.py", "corpus.py", "train.py"):
        image = image.add_local_file(HERE / name, "/opt/wonder/" + name)
    return image.add_local_file(POLICY_PATH, "/opt/wonder/mirror-policy.json").workdir("/opt/wonder")


serving_image = source(
    # CUDA 12.9.0-devel-ubuntu22.04, registry digest verified 2026-09-21.
    modal.Image.from_registry("nvidia/cuda@sha256:26cd7d00c09c1f3ff187929c7f4aa7e9273020cb18e86730f40e062e8ffa4d33", add_python="3.12")
    .pip_install("vllm==0.21.0", "transformers==4.57.6", "huggingface-hub==0.36.2",
                 "fastapi==0.135.1", "uvicorn==0.41.0", "jinja2==3.1.6",
                 "starlette==1.6.0", "pydantic==2.13.5")
    .env(PRIVACY_ENV)
)
training_image = source(
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("torch==2.9.1", "transformers==4.57.6", "huggingface-hub==0.36.2",
                 "peft==0.18.1", "accelerate==1.12.0", "datasets==4.4.2", "bitsandbytes==0.49.0", "jinja2==3.1.6")
    .env(PRIVACY_ENV)
)
download_image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "huggingface-hub==0.36.2"
).env(PRIVACY_ENV)
