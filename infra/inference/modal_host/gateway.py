"""Minimal HTTP surface. Modal Server Proxy Token authentication is mandatory.

This app deliberately has no tools, retrieval, uploads, response store, access logs,
or request tracing. Do not expose it directly outside the authenticated Server.
"""
import asyncio
import json
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator

from config import (MODEL_ALIAS, MODEL_ID, MODEL_PATH, MODEL_REVISION,
                    CONTEXT_TOKENS, OUTPUT_TOKENS, RUN_PATH, POLICY_PATH, safe_name, system_message)


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=18500)


class Completion(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    model: Literal["wonder-mirror"]
    messages: list[Message] = Field(min_length=2, max_length=8)
    max_tokens: int = Field(default=700, ge=1, le=OUTPUT_TOKENS)
    temperature: float = Field(default=0.35, ge=0, le=0.7)
    stream: Literal[False] = False
    store: Literal[False] = False

    @model_validator(mode="after")
    def validate_conversation(self):
        if self.messages[0].role != "system" or self.messages[0].content.strip() not in {
            system_message(task) for task in ("reflect", "memory", "preparation")
        }:
            raise ValueError("Use the current WONDER policy")
        if any(m.role == "system" for m in self.messages[1:]) or self.messages[-1].role != "user":
            raise ValueError("Invalid conversation roles")
        if sum(len(m.content) for m in self.messages) > 32000:
            raise ValueError("Select less context")
        return self


class Engine:
    def __init__(self):
        # Frozen volumes contain public base weights and explicitly selected adapter only.
        from vllm import LLM
        from vllm.lora.request import LoRARequest
        manifest = json.loads((MODEL_PATH / "wonder-base.json").read_text())
        if manifest != {"model": MODEL_ID, "revision": MODEL_REVISION}:
            raise RuntimeError("Base model provenance does not match")
        adapter = os.environ.get("WONDER_ADAPTER_RUN", "").strip()
        self.adapter = None
        if adapter:
            directory = RUN_PATH / safe_name(adapter)
            run = json.loads((directory / "run.json").read_text())
            if run["model_revision"] != MODEL_REVISION or run["status"] != "candidate":
                raise RuntimeError("Adapter provenance does not match")
            from corpus import sha256
            if run["policy_sha256"] != sha256(POLICY_PATH) or not run["completed_planned_steps"]:
                raise RuntimeError("Adapter policy or completion gate failed")
            for name, digest in run["adapter_sha256"].items():
                if Path(name).name != name or sha256(directory / name) != digest:
                    raise RuntimeError("Adapter integrity check failed")
            self.adapter = LoRARequest(adapter, 1, str(directory))
        self.llm = LLM(
            model=str(MODEL_PATH), tokenizer=str(MODEL_PATH), trust_remote_code=False,
            dtype="bfloat16", max_model_len=CONTEXT_TOKENS, max_num_seqs=1,
            gpu_memory_utilization=0.88, enforce_eager=True,
            enable_prefix_caching=False, enable_lora=bool(self.adapter), max_lora_rank=16,
            disable_log_stats=True, seed=42,
        )
        self.tokenizer = self.llm.get_tokenizer()

    def reply(self, request):
        from vllm import SamplingParams
        messages = [m.model_dump() for m in request.messages]
        tokens = self.tokenizer.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=True, enable_thinking=False
        )
        if len(tokens) + request.max_tokens > CONTEXT_TOKENS:
            raise HTTPException(413, "Select a shorter excerpt or start a new conversation.")
        output = self.llm.chat(
            messages, SamplingParams(max_tokens=request.max_tokens, temperature=request.temperature),
            use_tqdm=False, lora_request=self.adapter, chat_template_kwargs={"enable_thinking": False},
        )[0]
        result = output.outputs[0]
        text = result.text.strip()
        if not text or len(text) > 12000 or "<think>" in text or "</think>" in text:
            raise HTTPException(502, "The model did not produce a usable response.")
        return text, len(tokens), len(result.token_ids), result.finish_reason


def create_app(engine_factory=Engine):
    @asynccontextmanager
    async def lifespan(app):
        app.state.engine = await asyncio.to_thread(engine_factory)
        app.state.lock = asyncio.Lock()
        app.state.pending = set()
        yield
        app.state.engine = None

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.exception_handler(RequestValidationError)
    async def invalid(_request, _error):
        # Pydantic's normal response includes the original input. Never echo it.
        return JSONResponse({"error": "Invalid Mirror request. Check the task, size, and fields."}, status_code=422)

    @app.middleware("http")
    async def private_response(request: Request, call_next):
        # Limit the streamed body too; do not trust Content-Length.
        if request.method == "POST":
            size, chunks = 0, []
            async for chunk in request.stream():
                size += len(chunk)
                if size > 160000:
                    return JSONResponse({"error": "Request too large."}, status_code=413,
                                        headers={"Cache-Control": "no-store"})
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/health")
    def health():
        return {"ready": True, "model": MODEL_ALIAS}

    @app.post("/v1/chat/completions")
    async def complete(payload: Completion):
        if app.state.lock.locked():
            raise HTTPException(429, "The Mirror is busy. Try again shortly.", headers={"Retry-After": "3"})
        await app.state.lock.acquire()
        work = asyncio.create_task(asyncio.to_thread(app.state.engine.reply, payload))
        app.state.pending.add(work)

        def finished(future):
            # The worker owns the lock: repeated HTTP cancellation cannot release it early.
            app.state.pending.discard(future)
            app.state.lock.release()
            if not future.cancelled():
                future.exception()  # Consume background errors without logging private detail.

        work.add_done_callback(finished)
        try:
            text, prompt_tokens, completion_tokens, finish = await asyncio.shield(work)
        except HTTPException:
            raise
        except Exception:
            # No traceback or upstream detail containing prompt/response material.
            return JSONResponse({"error": "Mirror inference failed."}, status_code=502)
        return {
            "id": "chatcmpl-" + uuid.uuid4().hex, "object": "chat.completion",
            "created": int(time.time()), "model": MODEL_ALIAS,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                         "finish_reason": finish}],
            "usage": {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
                      "total_tokens": prompt_tokens + completion_tokens},
        }

    return app


app = create_app()
