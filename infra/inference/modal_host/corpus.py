"""Validate an explicit synthetic corpus. There is no connection to application data."""
import argparse
import hashlib
import json
from pathlib import Path

from config import POLICY_PATH, TRAIN_TOKENS, system_message


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def input_messages(row):
    return [{"role": "system", "content": system_message(row["task"])}] + row["messages"]


def validate_bundle(directory, include_test=True):
    directory = Path(directory)
    manifest = json.loads((directory / "manifest.json").read_text())
    if manifest.get("origin") != "authored-synthetic" or manifest.get("contains_member_data") is not False:
        raise ValueError("This workflow accepts authored synthetic examples only")
    if manifest.get("policy_sha256") != sha256(POLICY_PATH):
        raise ValueError("Corpus and application policy differ; rebuild and review the corpus")
    splits = ("train", "dev", "test") if include_test else ("train", "dev")
    ids, groups, prompts, result = set(), {}, {}, {}
    for split in splits:
        path = directory / (split + ".jsonl")
        expected = manifest["files"][path.name]
        if sha256(path) != expected["sha256"]:
            raise ValueError("Corpus file digest mismatch: " + split)
        rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        if len(rows) != expected["count"] or not rows:
            raise ValueError("Incorrect corpus count: " + split)
        for row in rows:
            identity, group = row["id"], row["scenario_group"]
            if not isinstance(identity, str) or identity in ids:
                raise ValueError("Duplicate or invalid example ID")
            ids.add(identity)
            if group in groups and groups[group] != split:
                raise ValueError("Scenario group leaks between splits")
            groups[group] = split
            if row.get("origin") != "authored-synthetic" or row.get("contains_member_data") is not False:
                raise ValueError("Missing row-level provenance")
            if row.get("training_allowed") is not (split != "test"):
                raise ValueError("Invalid training permission for split")
            messages = row["messages"]
            if not isinstance(messages, list) or not 1 <= len(messages) <= 7 or messages[-1].get("role") != "user":
                raise ValueError("Invalid conversation")
            for message in messages:
                if set(message) != {"role", "content"} or message["role"] not in ("user", "assistant"):
                    raise ValueError("Only user/assistant text may appear in evidence")
                if not isinstance(message["content"], str) or not message["content"].strip():
                    raise ValueError("Empty message")
            signature = hashlib.sha256(json.dumps(messages, sort_keys=True).encode()).hexdigest()
            if signature in prompts:
                raise ValueError("Duplicate prompt across corpus")
            prompts[signature] = split
            system_message(row["task"])
            if split != "test":
                if not isinstance(row.get("completion"), str) or not row["completion"].strip():
                    raise ValueError("Missing authored target")
                if row["task"] == "memory":
                    memory = json.loads(row["completion"])
                    if set(memory) != {"body", "context"} or any(not isinstance(v, str) or not v or len(v) > 1500 for v in memory.values()):
                        raise ValueError("Invalid memory target")
            elif "completion" in row or not row.get("criteria") or not isinstance(row.get("critical"), bool):
                raise ValueError("Holdout requires criteria, never a training target")
        result[split] = rows
    return manifest, result


def tokenize_row(row, tokenizer, max_length=TRAIN_TOKENS):
    prompt = tokenizer.apply_chat_template(
        input_messages(row), tokenize=True, add_generation_prompt=True, enable_thinking=False
    )
    completion = tokenizer.encode(row["completion"], add_special_tokens=False) + [tokenizer.eos_token_id]
    tokens = prompt + completion
    if len(tokens) > max_length:
        raise ValueError("Example exceeds token budget; edit it rather than silently truncate: " + row["id"])
    return {"input_ids": tokens, "attention_mask": [1] * len(tokens),
            "labels": [-100] * len(prompt) + completion}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    _, rows = validate_bundle(args.directory)
    print(json.dumps({"counts": {k: len(v) for k, v in rows.items()},
                      "manifest_sha256": sha256(args.directory / "manifest.json")}))
