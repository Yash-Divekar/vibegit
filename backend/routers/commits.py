from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from database import (
    get_commits,
    get_commit,
    get_file_versions
)
from git_engine import get_commit_diff, rollback_to_commit
from rlm_engine import search_context_in_commits

router = APIRouter(tags=["commits"])

class RollbackPayload(BaseModel):
    commit_hash: str = Field(..., min_length=1)
    project_name: str = "default"

@router.get("/api/commits")
async def get_all_commits(project: str = "default"):
    return await get_commits(project)

@router.get("/api/commits/{commit_hash}")
async def get_commit_details(commit_hash: str):
    commit = await get_commit(commit_hash)
    if not commit:
        raise HTTPException(status_code=404, detail="Commit not found")
    
    file_versions = await get_file_versions(commit_hash)
    return {
        **commit,
        "files": {fv["file_path"]: fv["content"] for fv in file_versions}
    }

@router.get("/api/commits/{commit_hash}/diff")
async def get_commit_difference(commit_hash: str):
    diff = await get_commit_diff(commit_hash)
    if not diff:
        raise HTTPException(status_code=404, detail="Commit not found")
    return diff

@router.post("/api/rollback")
async def rollback(payload: RollbackPayload):
    try:
        await rollback_to_commit(payload.project_name, payload.commit_hash)
        return {"status": "success", "active_commit": payload.commit_hash}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/search")
async def search_commits(query: str, project: str = "default"):
    commits = await search_context_in_commits(query, project, top_k=5)
    return commits
