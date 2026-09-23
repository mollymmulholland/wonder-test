"""Explicit, bounded paid jobs. Never scheduled or called by the consumer app."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import modal
from config import MODEL_ID, MODEL_REVISION, safe_name
from corpus import sha256, validate_bundle
from images import download_image, training_image

app = modal.App("wonder-model-training")
models = modal.Volume.from_name("wonder-model-weights", create_if_missing=True)
datasets = modal.Volume.from_name("wonder-model-datasets", create_if_missing=True)
runs = modal.Volume.from_name("wonder-model-runs", create_if_missing=True)


@app.function(image=download_image, volumes={"/models": models}, cpu=(2, 2),
              memory=(4096, 4096), timeout=3600, retries=0, max_containers=1, region="us")
def prepare_weights():
    from huggingface_hub import snapshot_download
    directory = Path("/models/qwen3-8b")
    marker = directory / "wonder-base.json"
    expected = {"model": MODEL_ID, "revision": MODEL_REVISION}
    if marker.exists() and json.loads(marker.read_text()) == expected:
        return {"status": "already-cached", **expected}
    snapshot_download(MODEL_ID, revision=MODEL_REVISION, local_dir=str(directory),
                      allow_patterns=["*.json", "*.safetensors", "*.txt", "*.jinja", "LICENSE", "README.md"])
    marker.write_text(json.dumps(expected) + "\n")
    models.commit()
    return {"status": "cached", **expected}


@app.function(image=training_image, gpu="L4", cpu=(4, 4), memory=(32768, 32768),
              volumes={"/models": models.read_only(), "/datasets": datasets.read_only(), "/runs": runs},
              timeout=7200, retries=0, max_containers=1, scaledown_window=2,
              region="us", enable_memory_snapshot=False, single_use_containers=True)
def finetune(dataset_name: str, manifest_sha: str, run_name: str):
    from train import run_training
    result = run_training(dataset_name, manifest_sha, run_name)
    runs.commit()
    return result


@app.local_entrypoint()
def main(action: str = "inspect", dataset_dir: str = "", run_name: str = "",
         reviewed_dataset_sha: str = "", allow_paid_run: bool = False):
    if action == "inspect":
        print("No cloud job requested. Use prepare or train after setting a workspace budget.")
        return
    if not allow_paid_run:
        raise ValueError("Cloud execution requires --allow-paid-run after budget approval")
    if action == "prepare":
        # Create the empty artifact volume needed by the baseline server as well.
        runs.hydrate()
        print(json.dumps(prepare_weights.remote()))
        return
    if action != "train":
        raise ValueError("Choose inspect, prepare, or train")
    directory = Path(dataset_dir).resolve()
    manifest, _ = validate_bundle(directory)
    actual_sha = sha256(directory / "manifest.json")
    if actual_sha != reviewed_dataset_sha:
        raise ValueError("Review the corpus and provide its exact manifest digest")
    dataset_name = safe_name(manifest["name"] + "-" + actual_sha[:12])
    safe_name(run_name)
    # Holdout, review notes and application data are never sent to the training job.
    with datasets.batch_upload() as upload:
        for name in ("manifest.json", "train.jsonl", "dev.jsonl"):
            upload.put_file(directory / name, "/" + dataset_name + "/" + name)
    print(json.dumps(finetune.remote(dataset_name, actual_sha, run_name)))
