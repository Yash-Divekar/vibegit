from __future__ import annotations

import json
import asyncio
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from database import (
    init_db,
    get_setting,
    save_setting,
    get_commits,
    get_commit,
    get_file_versions,
    get_projects,
    create_project
)
from git_engine import (
    get_sandbox_files,
    get_commit_diff,
    rollback_to_commit,
    get_project_sandbox_dir
)
from rlm_engine import run_rlm_pipeline, search_context_in_commits

app = FastAPI(title="VibeGit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SettingsPayload(BaseModel):
    gemini_key: str = ""
    openai_key: str = ""
    provider: str = "gemini"

class ProjectCreatePayload(BaseModel):
    name: str = Field(..., min_length=1)

class PromptPayload(BaseModel):
    prompt: str = Field(..., min_length=1)
    project_name: str = "default"

class RollbackPayload(BaseModel):
    commit_hash: str = Field(..., min_length=1)
    project_name: str = "default"

class FilePayload(BaseModel):
    file_path: str = Field(..., min_length=1)
    content: str = ""

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "vibegit-backend"}

# --- Project Manager Routes ---
@app.get("/api/projects")
async def list_all_projects() -> list[dict[str, Any]]:
    return await get_projects()

@app.post("/api/projects")
async def create_new_project(payload: ProjectCreatePayload) -> dict[str, str]:
    try:
        # Create folder and root commit
        await create_project(payload.name)
        # Ensure sandbox subfolder is created
        get_project_sandbox_dir(payload.name)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Settings ---
@app.get("/api/settings")
async def get_settings() -> dict[str, str]:
    gemini_key = await get_setting("GEMINI_API_KEY")
    openai_key = await get_setting("OPENAI_API_KEY")
    provider = await get_setting("PROVIDER", "gemini")
    
    def mask_key(k: str) -> str:
        if not k: return ""
        if len(k) <= 8: return "****"
        return f"{k[:4]}...{k[-4:]}"

    return {
        "gemini_key_masked": mask_key(gemini_key),
        "openai_key_masked": mask_key(openai_key),
        "provider": provider
    }

@app.post("/api/settings")
async def save_settings(payload: SettingsPayload) -> dict[str, str]:
    if payload.gemini_key and not payload.gemini_key.startswith("****"):
        await save_setting("GEMINI_API_KEY", payload.gemini_key)
    if payload.openai_key and not payload.openai_key.startswith("****"):
        await save_setting("OPENAI_API_KEY", payload.openai_key)
    await save_setting("PROVIDER", payload.provider)
    return {"status": "success"}

# --- Commits scoped by project ---
@app.get("/api/commits")
async def get_all_commits(project: str = "default") -> list[dict[str, Any]]:
    return await get_commits(project)

@app.get("/api/commits/{commit_hash}")
async def get_commit_details(commit_hash: str) -> dict[str, Any]:
    commit = await get_commit(commit_hash)
    if not commit:
        raise HTTPException(status_code=404, detail="Commit not found")
    
    file_versions = await get_file_versions(commit_hash)
    return {
        **commit,
        "files": {fv["file_path"]: fv["content"] for fv in file_versions}
    }

@app.get("/api/commits/{commit_hash}/diff")
async def get_commit_difference(commit_hash: str) -> dict[str, Any]:
    diff = await get_commit_diff(commit_hash)
    if not diff:
        raise HTTPException(status_code=404, detail="Commit not found")
    return diff

# --- Sandbox scoped by project ---
@app.get("/api/sandbox")
async def get_sandbox(project: str = "default") -> dict[str, Any]:
    files = get_sandbox_files(project)
    return {
        "sandbox_path": get_project_sandbox_dir(project).as_posix(),
        "files": files
    }

@app.post("/api/sandbox/file")
async def save_sandbox_file(payload: FilePayload, project: str = "default") -> dict[str, str]:
    try:
        p_sandbox = get_project_sandbox_dir(project)
        full_path = p_sandbox / payload.file_path
        if not full_path.resolve().as_posix().startswith(p_sandbox.resolve().as_posix()):
            raise HTTPException(status_code=400, detail="Invalid file path")
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(payload.content, encoding="utf-8")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sandbox/file")
async def delete_sandbox_file(file_path: str, project: str = "default") -> dict[str, str]:
    try:
        p_sandbox = get_project_sandbox_dir(project)
        full_path = p_sandbox / file_path
        if not full_path.resolve().as_posix().startswith(p_sandbox.resolve().as_posix()):
            raise HTTPException(status_code=400, detail="Invalid file path")
        if full_path.exists():
            full_path.unlink()
            return {"status": "success"}
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Rollback ---
@app.post("/api/rollback")
async def rollback(payload: RollbackPayload) -> dict[str, str]:
    try:
        await rollback_to_commit(payload.project_name, payload.commit_hash)
        return {"status": "success", "active_commit": payload.commit_hash}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Semantic Search scoped by project ---
@app.get("/api/search")
async def search_commits(query: str, project: str = "default") -> list[dict[str, Any]]:
    commits = await search_context_in_commits(query, project, top_k=5)
    return commits

# --- Prompt processing SSE scoped by project ---
@app.post("/api/prompt")
async def process_prompt(payload: PromptPayload):
    async def event_generator():
        queue = asyncio.Queue()

        def callback(step_name: str, step_data: Any):
            loop = asyncio.get_event_loop()
            loop.call_soon_threadsafe(queue.put_nowait, (step_name, step_data))

        pipeline_task = asyncio.create_task(run_rlm_pipeline(payload.project_name, payload.prompt, callback))
        
        while not pipeline_task.done() or not queue.empty():
            try:
                if not queue.empty():
                    step_name, step_data = queue.get_nowait()
                    yield f"data: {json.dumps({'step': step_name, 'data': step_data})}\n\n"
                    queue.task_done()
                else:
                    await asyncio.sleep(0.1)
            except Exception as e:
                yield f"data: {json.dumps({'step': 'error', 'data': str(e)})}\n\n"
                break
                
        if pipeline_task.done() and not pipeline_task.cancelled():
            result = pipeline_task.result()
            yield f"data: {json.dumps({'step': 'finished', 'data': result})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- Stats scoped by project ---
@app.get("/api/stats")
async def get_statistics(project: str = "default") -> dict[str, Any]:
    commits = await get_commits(project)
    root_hash = f"root-{project}"
    valid_commits = [c for c in commits if c["hash"] != root_hash]
    
    if not valid_commits:
        return {
            "total_commits": 0,
            "success_rate": 0.0,
            "avg_score": 0.0,
            "tokens_saved": 0,
            "avg_compression_ratio": 0.0,
            "cost_saved": 0.0,
            "improvement_trend": []
        }
        
    successes = [c for c in valid_commits if c["status"] == "success"]
    success_rate = round(len(successes) / len(valid_commits), 2)
    avg_score = round(sum(c["eval_score"] for c in valid_commits) / len(valid_commits), 2)
    
    total_tokens_before = sum(c["tokens_before"] for c in valid_commits)
    total_tokens_after = sum(c["tokens_after"] for c in valid_commits)
    tokens_saved = total_tokens_before - total_tokens_after
    
    non_zero_compressions = [c["tokens_before"] / c["tokens_after"] for c in valid_commits if c["tokens_after"] > 0]
    avg_compression = round(sum(non_zero_compressions) / len(non_zero_compressions), 2) if non_zero_compressions else 1.0
    cost_saved = round((tokens_saved / 1_000_000) * 15.0, 5)
    
    trend = [
        {
            "hash": c["hash"],
            "score": c["eval_score"],
            "timestamp": c["timestamp"],
            "prompt": c["raw_prompt"]
        }
        for c in valid_commits
    ]

    return {
        "total_commits": len(valid_commits),
        "success_rate": success_rate,
        "avg_score": avg_score,
        "tokens_saved": tokens_saved,
        "avg_compression_ratio": avg_compression,
        "cost_saved": cost_saved,
        "improvement_trend": trend
    }
