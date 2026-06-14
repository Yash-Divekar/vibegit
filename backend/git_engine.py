from __future__ import annotations

import os
import hashlib
import time
import difflib
from pathlib import Path
from typing import Any

from database import (
    create_commit,
    save_file_version,
    get_file_versions,
    get_commit,
    get_commits
)

SANDBOX_DIR = Path(__file__).resolve().parent.parent / "sandbox"

IGNORE_PATTERNS = {
    ".git",
    "__pycache__",
    ".venv",
    "node_modules",
    ".vibegit.db",
    ".DS_Store",
    "venv"
}

def is_ignored(path: Path) -> bool:
    for part in path.parts:
        if part in IGNORE_PATTERNS:
            return True
    return False

def get_project_sandbox_dir(project_name: str) -> Path:
    """Returns the subdirectory for a specific project sandbox."""
    dir_path = SANDBOX_DIR / project_name
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path

def get_sandbox_files(project_name: str) -> dict[str, str]:
    """Scans the project-specific sandbox directory and returns a dict mapping relative path to file contents."""
    files = {}
    p_sandbox = get_project_sandbox_dir(project_name)
    
    for path in p_sandbox.rglob("*"):
        if path.is_file() and not is_ignored(path.relative_to(p_sandbox)):
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
                rel_path = path.relative_to(p_sandbox).as_posix()
                files[rel_path] = content
            except Exception:
                pass
    return files

def generate_commit_hash(raw_prompt: str, parent_hash: str | None) -> str:
    """Generates a unique commit hash using prompt, parent hash, and timestamp."""
    entropy = f"{raw_prompt}-{parent_hash}-{time.time()}"
    return hashlib.sha1(entropy.encode("utf-8")).hexdigest()[:10]

async def make_virtual_commit(
    project_name: str,
    raw_prompt: str,
    optimized_prompt: str | None,
    eval_score: float,
    eval_feedback: str | None,
    status: str,
    tokens_before: int = 0,
    tokens_after: int = 0,
    cost: float = 0.0,
    duration_ms: int = 0,
    files_snapshot: dict[str, str] | None = None
) -> str:
    """Creates a new virtual commit for a project, saves files snapshot to DB, and returns hash."""
    all_commits = await get_commits(project_name)
    root_hash = f"root-{project_name}"
    
    parent_hash = root_hash
    if all_commits:
        success_commits = [c for c in all_commits if c["status"] == "success"]
        if success_commits:
            parent_hash = success_commits[-1]["hash"]
        else:
            parent_hash = all_commits[-1]["hash"]

    commit_hash = generate_commit_hash(raw_prompt, parent_hash)
    
    # Save commit metadata
    await create_commit(
        commit_hash=commit_hash,
        parent_hash=parent_hash,
        project_name=project_name,
        raw_prompt=raw_prompt,
        optimized_prompt=optimized_prompt,
        eval_score=eval_score,
        eval_feedback=eval_feedback,
        status=status,
        tokens_before=tokens_before,
        tokens_after=tokens_after,
        cost=cost,
        duration_ms=duration_ms
    )

    # Save file snapshots for this commit
    if files_snapshot is None:
        files_snapshot = get_sandbox_files(project_name)

    for rel_path, content in files_snapshot.items():
        await save_file_version(commit_hash, rel_path, content)
        
    return commit_hash

async def rollback_to_commit(project_name: str, commit_hash: str) -> None:
    """Restores the sandbox files for a specific project to the snapshot at commit_hash."""
    commit = await get_commit(commit_hash)
    if not commit:
        raise ValueError(f"Commit {commit_hash} does not exist.")

    file_versions = await get_file_versions(commit_hash)
    p_sandbox = get_project_sandbox_dir(project_name)
    
    # Step 1: Clean sandbox directory (remove files that are not in this commit)
    current_files = get_sandbox_files(project_name)
    commit_file_paths = {fv["file_path"] for fv in file_versions}
    
    for rel_path in current_files:
        if rel_path not in commit_file_paths:
            file_path = p_sandbox / rel_path
            if file_path.exists():
                file_path.unlink()

    # Step 2: Write back files from the commit
    for fv in file_versions:
        file_path = p_sandbox / fv["file_path"]
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(fv["content"], encoding="utf-8")

def compute_diff(old_text: str, new_text: str) -> list[dict[str, str]]:
    """Generates line-by-line diff between old_text and new_text."""
    diff = []
    old_lines = old_text.splitlines()
    new_lines = new_text.splitlines()
    
    matcher = difflib.SequenceMatcher(None, old_lines, new_lines)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for line in old_lines[i1:i2]:
                diff.append({"type": "normal", "content": line})
        elif tag == "replace":
            for line in old_lines[i1:i2]:
                diff.append({"type": "deleted", "content": line})
            for line in new_lines[j1:j2]:
                diff.append({"type": "added", "content": line})
        elif tag == "delete":
            for line in old_lines[i1:i2]:
                diff.append({"type": "deleted", "content": line})
        elif tag == "insert":
            for line in new_lines[j1:j2]:
                diff.append({"type": "added", "content": line})
    return diff

async def get_commit_diff(commit_hash: str) -> dict[str, Any]:
    """Computes the diff between this commit and its parent commit."""
    commit = await get_commit(commit_hash)
    if not commit:
        return {}

    parent_hash = commit["parent_hash"]
    
    current_files = {fv["file_path"]: fv["content"] for fv in await get_file_versions(commit_hash)}
    parent_files = {}
    
    if parent_hash:
        parent_files = {fv["file_path"]: fv["content"] for fv in await get_file_versions(parent_hash)}

    diffs = {}
    
    # Check for modified and added files
    for path, new_content in current_files.items():
        old_content = parent_files.get(path, "")
        if old_content != new_content:
            diffs[path] = {
                "status": "modified" if path in parent_files else "added",
                "lines": compute_diff(old_content, new_content)
            }

    # Check for deleted files
    for path, old_content in parent_files.items():
        if path not in current_files:
            diffs[path] = {
                "status": "deleted",
                "lines": compute_diff(old_content, "")
            }

    return {
        "commit": commit_hash,
        "parent": parent_hash,
        "diffs": diffs
    }
