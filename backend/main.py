from __future__ import annotations

import os
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from rate_limiter import limiter

from database import init_db
from routers.projects import router as projects_router
from routers.settings import router as settings_router
from routers.commits import router as commits_router
from routers.sandbox import router as sandbox_router
from routers.prompt import router as prompt_router
from routers.explorer import router as explorer_router
from routers.stats import router as stats_router

app = FastAPI(title="VibeGit API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # 1. Initialize DB structures
    await init_db()
    
    # 2. Ensure default project sandbox files are initialized if root commit is empty
    try:
        from database import get_file_versions
        default_files = await get_file_versions("root-default")
        if not default_files:
            from git_engine import create_project_sandbox
            await create_project_sandbox("default", "plain")
    except Exception as e:
        print(f"Failed to auto-initialize default sandbox: {e}")

# Register APIRouters
app.include_router(projects_router)
app.include_router(settings_router)
app.include_router(commits_router)
app.include_router(sandbox_router)
app.include_router(prompt_router)
app.include_router(explorer_router)
app.include_router(stats_router)

dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(dist_path):
    assets_path = os.path.join(dist_path, "assets")
    if os.path.isdir(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
        
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    async def root() -> dict[str, str]:
        return {"status": "ok", "service": "vibegit-backend"}
