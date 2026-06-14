from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from database import get_projects, create_project
from git_engine import (
    get_sandbox_files,
    get_project_sandbox_dir,
    create_project_sandbox
)

router = APIRouter(tags=["projects"])

class ProjectCreatePayload(BaseModel):
    name: str = Field(..., min_length=1)
    framework: str = "plain"
    import_path: str = ""

@router.get("/api/projects")
async def list_all_projects():
    return await get_projects()

@router.post("/api/projects")
async def create_new_project(payload: ProjectCreatePayload):
    from pathlib import Path
    try:
        name_clean = payload.name.strip().replace(" ", "-").lower()
        if payload.import_path:
            import_p = Path(payload.import_path.strip())
            if not import_p.exists() or not import_p.is_dir():
                raise HTTPException(status_code=400, detail="Import path does not exist or is not a directory")
            
            # Save custom path mapping
            from git_engine import set_project_sandbox_dir, import_existing_git_history
            set_project_sandbox_dir(name_clean, import_p.resolve().as_posix())
            
            # Register project
            await create_project(name_clean, "imported")
            
            # Import history if it has .git
            await import_existing_git_history(name_clean, import_p)
            
            # Check if there are no commits imported, create default root commit
            from database import get_commits
            existing_commits = await get_commits(name_clean)
            if not existing_commits:
                root_hash = f"root-{name_clean}"
                from database import create_commit, save_file_version
                await create_commit(
                    commit_hash=root_hash,
                    parent_hash=None,
                    project_name=name_clean,
                    raw_prompt="Initial Workspace State",
                    optimized_prompt="Initial Workspace State",
                    eval_score=1.0,
                    eval_feedback="Project Imported",
                    status="success",
                    tokens_before=0,
                    tokens_after=0,
                    cost=0.0,
                    duration_ms=0
                )
                from git_engine import get_sandbox_files
                files = get_sandbox_files(name_clean)
                for path, content in files.items():
                    await save_file_version(root_hash, path, content)
        else:
            # 1. Create project row and root commit metadata in DB
            await create_project(name_clean, payload.framework)
            # 2. Write initial boilerplate files in sandbox and register in DB under root commit
            await create_project_sandbox(name_clean, payload.framework)
            
        return {"status": "success"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/project/search")
async def project_global_search(query: str, project: str = "default"):
    try:
        files = get_sandbox_files(project)
        matches = []
        query_lower = query.lower()
        for file_path, content in files.items():
            lines = content.splitlines()
            for idx, line in enumerate(lines):
                if query_lower in line.lower():
                    matches.append({
                        "file_path": file_path,
                        "line_number": idx + 1,
                        "line_content": line.strip()
                    })
        return matches[:50]  # Cap at 50 results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
