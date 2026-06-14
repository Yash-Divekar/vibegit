from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from git_engine import (
    get_sandbox_files,
    get_project_sandbox_dir
)

router = APIRouter(tags=["sandbox"])

class FilePayload(BaseModel):
    file_path: str = Field(..., min_length=1)
    content: str = ""

class RunCommandPayload(BaseModel):
    command: str = Field(..., min_length=1)

@router.get("/api/sandbox")
async def get_sandbox(project: str = "default"):
    files = get_sandbox_files(project)
    if not files:
        from database import get_commits
        from git_engine import rollback_to_commit
        try:
            commits = await get_commits(project)
            if commits:
                success_commits = [c for c in commits if c["status"] == "success"]
                latest_hash = success_commits[-1]["hash"] if success_commits else commits[-1]["hash"]
                await rollback_to_commit(project, latest_hash)
                files = get_sandbox_files(project)
        except Exception as e:
            print(f"Auto-restore of sandbox failed for project {project}: {e}")

    return {
        "sandbox_path": get_project_sandbox_dir(project).as_posix(),
        "files": files
    }

@router.post("/api/sandbox/run")
async def run_sandbox_command(payload: RunCommandPayload, project: str = "default"):
    import subprocess
    import os
    try:
        p_sandbox = get_project_sandbox_dir(project)
        # Execute command in shell environment scoped to the project folder
        # Use powershell on Windows to allow relative path scripts and forward slash normalization
        extra_args = {}
        if os.name == "nt":
            extra_args["executable"] = "powershell"

        res = subprocess.run(
            payload.command,
            shell=True,
            cwd=str(p_sandbox),
            capture_output=True,
            text=True,
            timeout=15,
            **extra_args
        )
        return {
            "status": "success",
            "exit_code": res.returncode,
            "stdout": res.stdout,
            "stderr": res.stderr
        }
    except subprocess.TimeoutExpired as te:
        return {
            "status": "timeout",
            "exit_code": -1,
            "stdout": te.stdout or "",
            "stderr": te.stderr or "Error: Command timed out after 15 seconds."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/sandbox/file")
async def save_sandbox_file(payload: FilePayload, project: str = "default"):
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

@router.delete("/api/sandbox/file")
async def delete_sandbox_file(file_path: str, project: str = "default"):
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
