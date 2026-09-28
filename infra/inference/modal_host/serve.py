"""Deploy only after account, budget, weights and baseline acceptance are ready."""
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import modal
from config import safe_name
from images import serving_image

adapter = os.environ.get("WONDER_ADAPTER_RUN", "").strip()
if adapter:
    safe_name(adapter)
app = modal.App("wonder-mirror-candidate" if adapter else "wonder-mirror-baseline")
models = modal.Volume.from_name("wonder-model-weights", create_if_missing=False)
runs = modal.Volume.from_name("wonder-model-runs", create_if_missing=False)


@app.server(
    image=serving_image, gpu="L4", cpu=(2, 2), memory=(16384, 16384),
    port=8000, target_concurrency=1, min_containers=0, max_containers=1,
    buffer_containers=0, scaledown_window=300, startup_timeout=600,
    unauthenticated=False, enable_memory_snapshot=False,
    compute_region="us", routing_region="us-east",
    volumes={"/models": models.read_only(), "/runs": runs.read_only()},
    env={"WONDER_ADAPTER_RUN": adapter},
)
class MirrorServer:
    @modal.enter()
    def start(self):
        self.process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "gateway:app", "--host", "0.0.0.0",
            "--port", "8000", "--workers", "1", "--no-access-log", "--log-level", "critical",
        ], cwd="/opt/wonder", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    @modal.exit()
    def stop(self):
        self.process.terminate()
