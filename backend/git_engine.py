from __future__ import annotations

import os
import json
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

PROJECT_PATHS_FILE = Path(__file__).resolve().parent / "data" / "project_paths.json"

def get_project_sandbox_dir(project_name: str) -> Path:
    """Returns the subdirectory for a specific project sandbox, checking custom imported paths."""
    if PROJECT_PATHS_FILE.exists():
        try:
            with open(PROJECT_PATHS_FILE, "r", encoding="utf-8") as f:
                paths = json.load(f)
                if project_name in paths:
                    p = Path(paths[project_name])
                    p.mkdir(parents=True, exist_ok=True)
                    return p
        except Exception:
            pass
            
    dir_path = SANDBOX_DIR / project_name
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path

def set_project_sandbox_dir(project_name: str, path_str: str) -> None:
    """Saves a custom sandbox path for a project."""
    PROJECT_PATHS_FILE.parent.mkdir(parents=True, exist_ok=True)
    paths = {}
    if PROJECT_PATHS_FILE.exists():
        try:
            with open(PROJECT_PATHS_FILE, "r", encoding="utf-8") as f:
                paths = json.load(f)
        except Exception:
            pass
    paths[project_name] = path_str
    with open(PROJECT_PATHS_FILE, "w", encoding="utf-8") as f:
        json.dump(paths, f, indent=2)

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

def init_project_structure(project_name: str, framework: str) -> dict[str, str]:
    """Writes standard template files in sandbox/project_name and returns them."""
    p_sandbox = get_project_sandbox_dir(project_name)
    files = {}
    
    if framework == "react":
        files["package.json"] = json.dumps({
            "name": project_name,
            "private": True,
            "version": "0.0.0",
            "type": "module",
            "scripts": {
                "dev": "vite",
                "build": "vite build",
                "preview": "vite preview"
            },
            "dependencies": {
                "react": "^18.3.1",
                "react-dom": "^18.3.1"
            },
            "devDependencies": {
                "@types/react": "^18.3.3",
                "@types/react-dom": "^18.3.0",
                "@vitejs/plugin-react": "^4.3.1",
                "vite": "^5.3.1"
            }
        }, indent=2)
        files["index.html"] = (
            "<!doctype html>\n"
            "<html lang=\"en\">\n"
            "  <head>\n"
            "    <meta charset=\"UTF-8\" />\n"
            "    <title>React App</title>\n"
            "  </head>\n"
            "  <body>\n"
            "    <div id=\"root\"></div>\n"
            "    <script type=\"module\" src=\"/src/main.jsx\"></script>\n"
            "  </body>\n"
            "</html>\n"
        )
        files["src/main.jsx"] = (
            "import React from 'react'\n"
            "import ReactDOM from 'react-dom/client'\n"
            "import App from './App.jsx'\n\n"
            "ReactDOM.createRoot(document.getElementById('root')).render(\n"
            "  <React.StrictMode>\n"
            "    <App />\n"
            "  </React.StrictMode>,\n"
            ")\n"
        )
        files["src/App.jsx"] = (
            "import React, { useState } from 'react'\n\n"
            "function App() {\n"
            "  const [count, setCount] = useState(0)\n"
            "  return (\n"
            "    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>\n"
            "      <h1>Welcome to React Sandbox</h1>\n"
            "      <button onClick={() => setCount(count + 1)}>Count: {count}</button>\n"
            "    </div>\n"
            "  )\n"
            "}\n"
            "export default App\n"
        )
    elif framework == "fastapi":
        files["main.py"] = (
            "from fastapi import FastAPI\n\n"
            "app = FastAPI(title=\"FastAPI Sandbox\")\n\n"
            "@app.get(\"/\")\n"
            "def read_root():\n"
            "    return {\"message\": \"Welcome to FastAPI Vibe Sandbox!\"}\n"
        )
        files["requirements.txt"] = (
            "fastapi>=0.110.0\n"
            "uvicorn>=0.28.0\n"
        )
    elif framework == "django":
        files["manage.py"] = (
            "#!/usr/bin/env python\n"
            "import os\n"
            "import sys\n\n"
            "def main():\n"
            "    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')\n"
            "    try:\n"
            "        from django.core.management import execute_from_command_line\n"
            "    except ImportError as exc:\n"
            "        raise ImportError(\"Couldn't import Django.\") from exc\n"
            "    execute_from_command_line(sys.argv)\n\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        )
        files["project/settings.py"] = (
            "SECRET_KEY = 'vibe-secret-key'\n"
            "DEBUG = True\n"
            "ALLOWED_HOSTS = ['*']\n"
            "ROOT_URLCONF = 'project.urls'\n"
        )
        files["project/urls.py"] = (
            "from django.urls import path\n"
            "from django.http import JsonResponse\n\n"
            "def home(request):\n"
            "    return JsonResponse({\"message\": \"Hello from Django Sandbox!\"})\n\n"
            "urlpatterns = [\n"
            "    path('', home),\n"
            "]\n"
        )
    elif framework == "nestjs":
        files["package.json"] = json.dumps({
            "name": "nest-app",
            "version": "0.0.1",
            "dependencies": {
                "@nestjs/common": "^10.0.0",
                "@nestjs/core": "^10.0.0",
                "reflect-metadata": "^0.1.13",
                "rxjs": "^7.8.1"
            }
        }, indent=2)
        files["src/app.module.ts"] = (
            "import { Module } from '@nestjs/common';\n"
            "import { AppController } from './app.controller';\n\n"
            "@Module({\n"
            "  controllers: [AppController],\n"
            "})\n"
            "export class AppModule {}\n"
        )
        files["src/app.controller.ts"] = (
            "import { Controller, Get } from '@nestjs/common';\n\n"
            "@Controller()\n"
            "export class AppController {\n"
            "  @Get()\n"
            "  getHello(): string {\n"
            "    return 'Hello from NestJS Vibe Sandbox!';\n"
            "  }\n"
            "}\n"
        )
        files["src/main.ts"] = (
            "import { NestFactory } from '@nestjs/core';\n"
            "import { AppModule } from './app.module';\n\n"
            "async function bootstrap() {\n"
            "  const app = await NestFactory.create(AppModule);\n"
            "  await app.listen(3000);\n"
            "}\n"
            "bootstrap();\n"
        )
    elif framework == "springboot":
        files["pom.xml"] = (
            "<project>\n"
            "  <modelVersion>4.0.0</modelVersion>\n"
            "  <groupId>com.example</groupId>\n"
            "  <artifactId>demo</artifactId>\n"
            "  <version>0.0.1-SNAPSHOT</version>\n"
            "</project>\n"
        )
        files["src/main/java/com/example/demo/DemoApplication.java"] = (
            "package com.example.demo;\n\n"
            "import org.springframework.boot.SpringApplication;\n"
            "import org.springframework.boot.autoconfigure.SpringBootApplication;\n"
            "import org.springframework.web.bind.annotation.GetMapping;\n"
            "import org.springframework.web.bind.annotation.RestController;\n\n"
            "@SpringBootApplication\n"
            "@RestController\n"
            "public class DemoApplication {\n"
            "    public static void main(String[] args) {\n"
            "        SpringApplication.run(DemoApplication.class, args);\n"
            "    }\n"
            "    @GetMapping(\"/\")\n"
            "    public String hello() {\n"
            "        return \"Hello from Spring Boot Vibe Sandbox!\";\n"
            "    }\n"
            "}\n"
        )
    else:  # plain
        files["main.py"] = (
            "# Welcome to Plain Sandbox!\n"
            "def main():\n"
            "    print(\"Hello, Vibe Coding!\")\n\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        )
        
    files["README.md"] = (
        f"# {project_name.capitalize()} Project\n\n"
        f"Initialized as a `{framework}` project in the VibeGit virtual git environment.\n"
    )
    
    # Write files to folder
    for path, content in files.items():
        full_path = p_sandbox / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        
    return files

async def create_project_sandbox(project_name: str, framework: str) -> None:
    """Initializes workspace files in sandbox folder and registers them under root commit in DB."""
    # Write template files
    files = init_project_structure(project_name, framework)
    root_hash = f"root-{project_name}"
    
    # Save files to database
    for path, content in files.items():
        await save_file_version(root_hash, path, content)

async def import_existing_git_history(project_name: str, local_path: Path) -> None:
    """Reads actual Git commits and file versions from local_path and imports them into VibeGit DB."""
    import subprocess
    import datetime
    try:
        # Check if it has a .git folder or is a git repo
        git_dir = local_path / ".git"
        if not git_dir.exists():
            return
            
        # Run git log to get last 10 commits
        cmd = ["git", "log", "-n", "10", "--pretty=format:%H|%P|%s|%ct"]
        res = subprocess.run(cmd, cwd=str(local_path), capture_output=True, text=True, encoding="utf-8", errors="ignore")
        if res.returncode != 0:
            return
            
        lines = res.stdout.strip().split("\n")
        if not lines or not lines[0]:
            return
            
        # We import commits in chronological order (oldest to newest)
        lines.reverse()
        
        # Clear any existing auto-created root commit for this project if we are importing history
        from database import get_db
        db = await get_db()
        try:
            await db.execute("DELETE FROM commits WHERE project_name = ?", (project_name,))
            await db.execute(
                "DELETE FROM file_versions WHERE commit_hash IN (SELECT hash FROM commits WHERE project_name = ?)",
                (project_name,)
            )
            await db.commit()
        finally:
            await db.close()

        parent_hash = None
        for line in lines:
            parts = line.split("|")
            if len(parts) < 4:
                continue
            commit_hash, parents, subject, timestamp_str = parts[0], parts[1], parts[2], parts[3]
            
            # Parent hash is the first parent if multiple
            p_hash = parents.split(" ")[0] if parents else None
            if not p_hash:
                p_hash = parent_hash  # fallback chain

            dt = datetime.datetime.fromtimestamp(int(timestamp_str))
            iso_time = dt.isoformat()
            
            # Register commit in database
            await create_commit(
                commit_hash=commit_hash,
                parent_hash=p_hash,
                project_name=project_name,
                raw_prompt=subject,
                optimized_prompt=f"Imported from Git: {subject}",
                eval_score=1.0,
                eval_feedback="Imported Git Commit",
                status="success",
                tokens_before=0,
                tokens_after=0,
                cost=0.0,
                duration_ms=0
            )
            
            # Get files list in this commit
            files_cmd = ["git", "ls-tree", "-r", "--name-only", commit_hash]
            files_res = subprocess.run(files_cmd, cwd=str(local_path), capture_output=True, text=True, encoding="utf-8", errors="ignore")
            if files_res.returncode == 0:
                file_paths = files_res.stdout.strip().split("\n")
                for f_path in file_paths:
                    if not f_path or is_ignored(Path(f_path)):
                        continue
                    # Get file contents at this commit
                    show_cmd = ["git", "show", f"{commit_hash}:{f_path}"]
                    show_res = subprocess.run(show_cmd, cwd=str(local_path), capture_output=True, text=True, encoding="utf-8", errors="ignore")
                    if show_res.returncode == 0:
                        await save_file_version(commit_hash, f_path, show_res.stdout)
            
            parent_hash = commit_hash
            
    except Exception as e:
        print(f"Failed to import git history: {e}")
