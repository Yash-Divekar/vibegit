from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers.projects import router as projects_router
from routers.settings import router as settings_router
from routers.commits import router as commits_router
from routers.sandbox import router as sandbox_router
from routers.prompt import router as prompt_router
from routers.explorer import router as explorer_router
from routers.stats import router as stats_router

app = FastAPI(title="VibeGit API", version="1.0.0")

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

@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "vibegit-backend"}
