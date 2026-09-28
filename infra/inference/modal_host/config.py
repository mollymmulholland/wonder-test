"""Pinned experiment configuration. Importing this module starts no cloud work."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
MODEL_ID = "Qwen/Qwen3-8B"
MODEL_REVISION = "b968826d9c46dd6066d109eabc6255188de91218"
MODEL_ALIAS = "wonder-mirror"
CONTEXT_TOKENS = 8192
OUTPUT_TOKENS = 700
TRAIN_TOKENS = 2048
MODEL_PATH = Path("/models/qwen3-8b")
DATA_PATH = Path("/datasets")
RUN_PATH = Path("/runs")
POLICY_PATH = HERE / "mirror-policy.json"
if not POLICY_PATH.exists():
    POLICY_PATH = HERE.parents[2] / "lib/mirror-policy.json"
POLICY = json.loads(POLICY_PATH.read_text())


def system_message(task="reflect"):
    if task not in POLICY["tasks"]:
        raise ValueError("Unsupported task")
    return (POLICY["instructions"] + " " + POLICY["tasks"][task]).strip()


def safe_name(value):
    import re
    if not isinstance(value, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,63}", value):
        raise ValueError("Use a 3–64 character lowercase run or dataset name")
    return value
