"""Holdout collection and explicit human review. No paid LLM judge or auto-promotion."""
import argparse
import csv
import json
import os
import statistics
import time
from pathlib import Path
from urllib.parse import urlparse

from config import MODEL_ALIAS, MODEL_REVISION
from corpus import input_messages, sha256, validate_bundle

DIMENSIONS = ("grounding", "agency", "usefulness", "voice")


def checks(row, text):
    flags = []
    if not text.strip():
        flags.append("empty")
    if "<think>" in text or "</think>" in text:
        flags.append("reasoning_markup")
    if any(ord(c) >= 0x1F000 for c in text):
        flags.append("pictographic_output")
    if row["task"] == "memory":
        try:
            body = json.loads(text)
            if set(body) != {"body", "context"} or any(not isinstance(v, str) or not v or len(v) > 1500 for v in body.values()):
                flags.append("memory_schema")
        except (ValueError, TypeError):
            flags.append("memory_schema")
    return flags


def collect(directory, output, label, allow_paid_run):
    import httpx
    if not allow_paid_run:
        raise ValueError("Evaluation makes paid endpoint requests; provide --allow-paid-run after budget approval")
    _, splits = validate_bundle(directory)
    endpoint, key = os.environ.get("WONDER_INFERENCE_URL", ""), os.environ.get("WONDER_INFERENCE_KEY", "")
    parsed = urlparse(endpoint)
    if parsed.scheme != "https" or parsed.username or parsed.password or not key or not parsed.path.endswith("/v1/chat/completions"):
        raise ValueError("Set the HTTPS chat endpoint and server-only Proxy Token in the environment")
    if output.exists():
        raise ValueError("Keep evaluation runs immutable; choose a new output directory")
    output.mkdir(parents=True, mode=0o700)
    headers = {"Authorization": "Bearer " + key}
    with httpx.Client(timeout=110, follow_redirects=False) as client:
        # Missing and invalid credentials must be rejected at the actual host.
        for authorization in (None, "Bearer invalid-test-credential"):
            probe = client.get(endpoint.rsplit("/v1/", 1)[0] + "/health",
                               headers={"Authorization": authorization} if authorization else {})
            if probe.status_code not in (401, 403):
                raise ValueError("Host authentication did not reject the probe. Stop before inference.")
        # Explicit warmup. A scale-to-zero Server can return 503 until ready.
        start = time.monotonic()
        while True:
            warm = client.get(endpoint.rsplit("/v1/", 1)[0] + "/health", headers=headers)
            if warm.status_code == 200:
                break
            if warm.status_code != 503 or time.monotonic() - start > 600:
                raise ValueError("The authenticated endpoint did not become ready")
            time.sleep(3)
        warmup = round(time.monotonic() - start, 3)
        records = []
        # No retries on ambiguous generation failures: each holdout is requested once.
        for row in splits["test"]:
            started = time.monotonic()
            try:
                response = client.post(endpoint, headers=headers, json={
                    "model": MODEL_ALIAS, "messages": input_messages(row),
                    "max_tokens": 700, "temperature": 0.35, "store": False,
                })
                text = response.json()["choices"][0]["message"]["content"] if response.status_code == 200 else ""
                status = response.status_code
            except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
                text, status = "", "request_failed"
            records.append({"id": row["id"], "label": label, "task": row["task"],
                            "messages": row["messages"], "critical": row["critical"],
                            "criteria": row["criteria"], "response": text, "status": status,
                            "seconds": round(time.monotonic() - started, 3), "flags": checks(row, text)})
    response_path = output / "responses.jsonl"
    response_path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in records))
    response_path.chmod(0o600)
    with (output / "review.csv").open("w") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "critical_pass", *DIMENSIONS, "reviewer", "notes"])
        writer.writeheader()
        writer.writerows({"id": r["id"]} for r in records)
    (output / "evaluation.json").write_text(json.dumps({
        "label": label, "model_revision": MODEL_REVISION,
        "dataset_sha256": sha256(Path(directory) / "manifest.json"),
        "responses_sha256": sha256(response_path), "count": len(records),
        "auth_probes_passed": True, "warmup_seconds": warmup,
        "human_review": "pending", "promotion": "not authorized by this script",
    }, indent=2) + "\n")
    print(json.dumps({"collected": len(records), "output": str(output), "human_review": "required"}))


def summarize(directory):
    run = json.loads((directory / "evaluation.json").read_text())
    if sha256(directory / "responses.jsonl") != run["responses_sha256"]:
        raise ValueError("Responses changed after collection")
    rows = [json.loads(line) for line in (directory / "responses.jsonl").read_text().splitlines()]
    reviews = list(csv.DictReader((directory / "review.csv").open()))
    if len(reviews) != len(rows) or len({r["id"] for r in reviews}) != len(rows):
        raise ValueError("Every case needs one review")
    index = {r["id"]: r for r in reviews}
    scores, failures = [], []
    for row in rows:
        review = index[row["id"]]
        values = [int(review[d]) for d in DIMENSIONS]
        if any(v not in (0, 1, 2) for v in values) or not review["reviewer"].strip() or review["critical_pass"] not in ("yes", "no"):
            raise ValueError("Complete the named human review with scores 0–2 and yes/no")
        scores.extend(values)
        if row["status"] != 200 or row["flags"] or review["critical_pass"] != "yes":
            failures.append(row["id"])
    ordered = sorted(r["seconds"] for r in rows)
    return {"label": run["label"], "dataset_sha256": run["dataset_sha256"],
            "mean_score": round(statistics.mean(scores), 3), "failed_cases": failures,
            "p95_warm_seconds": ordered[max(0, int(len(ordered) * .95 + .999) - 1)],
            "auth_probes_passed": run["auth_probes_passed"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("collect")
    run.add_argument("dataset", type=Path)
    run.add_argument("output", type=Path)
    run.add_argument("--label", choices=("baseline", "candidate"), required=True)
    run.add_argument("--allow-paid-run", action="store_true")
    review = sub.add_parser("compare")
    review.add_argument("baseline", type=Path)
    review.add_argument("candidate", type=Path)
    args = parser.parse_args()
    if args.command == "collect":
        collect(args.dataset, args.output, args.label, args.allow_paid_run)
    else:
        baseline, candidate = summarize(args.baseline), summarize(args.candidate)
        if baseline["dataset_sha256"] != candidate["dataset_sha256"]:
            raise ValueError("Use the same held-out cases for both models")
        eligible = (not candidate["failed_cases"] and candidate["auth_probes_passed"]
                    and candidate["mean_score"] >= max(1.5, baseline["mean_score"] + 0.1)
                    and candidate["p95_warm_seconds"] <= 20)
        print(json.dumps({"baseline": baseline, "candidate": candidate,
                          "candidate_meets_experiment_gate": eligible,
                          "promoted": False, "note": "Operator review and application acceptance are still required."}, indent=2))
