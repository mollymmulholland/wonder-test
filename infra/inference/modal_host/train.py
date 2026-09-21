"""One bounded QLoRA experiment; produces a candidate, never a live release."""
import importlib.metadata
import json
import math
import time
from datetime import datetime, timezone

from config import DATA_PATH, MODEL_ID, MODEL_PATH, MODEL_REVISION, RUN_PATH, safe_name
from corpus import sha256, tokenize_row, validate_bundle


def run_training(dataset_name, manifest_sha, run_name):
    from datasets import Dataset
    import torch
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig,
                              DataCollatorForSeq2Seq, Trainer, TrainerCallback, TrainingArguments, set_seed)

    directory = DATA_PATH / safe_name(dataset_name)
    output = RUN_PATH / safe_name(run_name)
    if output.exists():
        raise ValueError("Run names are immutable. Choose a new run name.")
    if sha256(directory / "manifest.json") != manifest_sha:
        raise ValueError("The reviewed dataset changed")
    base = json.loads((MODEL_PATH / "wonder-base.json").read_text())
    if base != {"model": MODEL_ID, "revision": MODEL_REVISION}:
        raise ValueError("Base model provenance mismatch")
    manifest, rows = validate_bundle(directory, include_test=False)
    set_seed(42)
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH), trust_remote_code=False, local_files_only=True)
    tokenizer.pad_token = tokenizer.eos_token
    train_data = Dataset.from_list([tokenize_row(r, tokenizer) for r in rows["train"]])
    dev_data = Dataset.from_list([tokenize_row(r, tokenizer) for r in rows["dev"]])
    model = AutoModelForCausalLM.from_pretrained(
        str(MODEL_PATH), trust_remote_code=False, local_files_only=True, torch_dtype=torch.bfloat16,
        device_map={"": 0}, attn_implementation="sdpa",
        quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                                             bnb_4bit_use_double_quant=True,
                                             bnb_4bit_compute_dtype=torch.bfloat16),
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    model = get_peft_model(model, LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    ))
    started = time.monotonic()

    class TimeCap(TrainerCallback):
        def on_step_end(self, args, state, control, **kwargs):
            if time.monotonic() - started > 5400:
                control.should_training_stop = True

    # Two passes on this small corpus, no more than 100 optimizer steps.
    steps = min(100, 2 * math.ceil(len(train_data) / 8))
    args = TrainingArguments(
        output_dir=str(output / "checkpoints"), per_device_train_batch_size=1,
        per_device_eval_batch_size=1, gradient_accumulation_steps=8,
        max_steps=steps, learning_rate=1e-4, warmup_ratio=0.1, lr_scheduler_type="cosine",
        bf16=True, gradient_checkpointing=True, optim="paged_adamw_8bit", max_grad_norm=1.0,
        eval_strategy="steps", eval_steps=max(1, steps // 2),
        save_strategy="no", logging_strategy="no", report_to=[], push_to_hub=False,
        seed=42, data_seed=42, disable_tqdm=True,
    )
    trainer = Trainer(
        model=model, args=args, train_dataset=train_data, eval_dataset=dev_data,
        data_collator=DataCollatorForSeq2Seq(tokenizer, padding=True, label_pad_token_id=-100),
        callbacks=[TimeCap()],
    )
    outcome = trainer.train()
    metrics = trainer.evaluate()
    output.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output, safe_serialization=True)
    # Keep the adapter loadable against the canonical public model, not a container path.
    config_path = output / "adapter_config.json"
    adapter_config = json.loads(config_path.read_text())
    adapter_config["base_model_name_or_path"] = MODEL_ID
    adapter_config["revision"] = MODEL_REVISION
    config_path.write_text(json.dumps(adapter_config, indent=2) + "\n")
    run = {
        "status": "candidate", "run": run_name, "model": MODEL_ID, "model_revision": MODEL_REVISION,
        "dataset": manifest["name"], "dataset_manifest_sha256": manifest_sha,
        "policy_sha256": manifest["policy_sha256"], "created_at": datetime.now(timezone.utc).isoformat(),
        "seed": 42, "optimizer_steps": trainer.state.global_step, "planned_steps": steps,
        "completed_planned_steps": trainer.state.global_step >= steps,
        "seconds": round(time.monotonic() - started),
        "training_loss": outcome.training_loss, "development_loss": metrics["eval_loss"],
        "packages": {name: importlib.metadata.version(name) for name in (
            "torch", "transformers", "peft", "accelerate", "datasets", "bitsandbytes")},
        "adapter_sha256": {p.name: sha256(p) for p in output.iterdir()
                           if p.name in ("adapter_config.json", "adapter_model.safetensors")},
        "quality_review": "pending; loss is not evidence of safe or helpful behavior",
    }
    (output / "run.json").write_text(json.dumps(run, indent=2) + "\n")
    (output / "README.md").write_text(
        "# WONDER Mirror experimental adapter\n\nBase: Qwen/Qwen3-8B (Apache-2.0). "
        "Authored synthetic data only. No member data. Not a trained matching model. "
        "Not clinically validated. Human evaluation and operator release are required. "
        "See run.json for provenance, exact package versions and metrics.\n")
    return {"run": run_name, "status": "candidate", "steps": trainer.state.global_step,
            "training_loss": outcome.training_loss, "development_loss": metrics["eval_loss"]}
