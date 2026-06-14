from __future__ import annotations

import os
from pathlib import Path
from typing import Any
import aiosqlite

DB_PATH = Path(__file__).resolve().parent / "data" / "vibegit.db"

async def get_db() -> aiosqlite.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

def row_to_dict(row: aiosqlite.Row) -> dict[str, Any]:
    return dict(row)

async def init_db() -> None:
    db = await get_db()
    try:
        # Create projects table
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                framework TEXT NOT NULL DEFAULT 'plain',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        
        # Create commits table
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS commits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hash TEXT NOT NULL UNIQUE,
                parent_hash TEXT,
                project_name TEXT NOT NULL DEFAULT 'default',
                raw_prompt TEXT NOT NULL,
                optimized_prompt TEXT,
                eval_score REAL DEFAULT 0.0,
                eval_feedback TEXT,
                status TEXT NOT NULL,
                tokens_before INTEGER DEFAULT 0,
                tokens_after INTEGER DEFAULT 0,
                cost REAL DEFAULT 0.0,
                duration_ms INTEGER DEFAULT 0,
                timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        
        # Create file_versions table
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS file_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                commit_hash TEXT NOT NULL,
                file_path TEXT NOT NULL,
                content TEXT NOT NULL,
                FOREIGN KEY (commit_hash) REFERENCES commits (hash) ON DELETE CASCADE
            )
            """
        )
        
        # Create settings table
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        
        # --- MIGRATIONS ---
        # 1. Ensure project_name column exists in commits
        try:
            await db.execute("SELECT project_name FROM commits LIMIT 1")
        except aiosqlite.OperationalError:
            await db.execute("ALTER TABLE commits ADD COLUMN project_name TEXT NOT NULL DEFAULT 'default'")
            await db.commit()

        # 2. Ensure framework column exists in projects
        try:
            await db.execute("SELECT framework FROM projects LIMIT 1")
        except aiosqlite.OperationalError:
            await db.execute("ALTER TABLE projects ADD COLUMN framework TEXT NOT NULL DEFAULT 'plain'")
            await db.commit()

        # 3. Insert default project if not exists
        cursor = await db.execute("SELECT COUNT(*) FROM projects WHERE name = 'default'")
        exists = (await cursor.fetchone())[0]
        if exists == 0:
            await db.execute("INSERT INTO projects (name, framework) VALUES ('default', 'plain')")
            
        # 4. Check if we need to insert root commit for default project
        cursor = await db.execute("SELECT COUNT(*) FROM commits WHERE project_name = 'default'")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await db.execute(
                """
                INSERT INTO commits (hash, parent_hash, project_name, raw_prompt, optimized_prompt, status, eval_score)
                VALUES ('root-default', NULL, 'default', 'Initial Workspace State', 'Initial Workspace State', 'success', 1.0)
                """
            )
            
        await db.commit()
    finally:
        await db.close()

async def create_project(name: str, framework: str = "plain") -> None:
    db = await get_db()
    try:
        # Save project name and framework
        await db.execute(
            "INSERT OR IGNORE INTO projects (name, framework) VALUES (?, ?)",
            (name, framework)
        )
        
        # Check if project already has a root commit
        cursor = await db.execute("SELECT COUNT(*) FROM commits WHERE project_name = ?", (name,))
        count = (await cursor.fetchone())[0]
        if count == 0:
            root_hash = f"root-{name}"
            await db.execute(
                """
                INSERT INTO commits (hash, parent_hash, project_name, raw_prompt, optimized_prompt, status, eval_score)
                VALUES (?, NULL, ?, 'Initial Workspace State', 'Initial Workspace State', 'success', 1.0)
                """,
                (root_hash, name)
            )
        await db.commit()
    finally:
        await db.close()

async def get_projects() -> list[dict[str, Any]]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM projects ORDER BY name ASC")
        rows = await cursor.fetchall()
        return [row_to_dict(row) for row in rows]
    finally:
        await db.close()

async def create_commit(
    commit_hash: str,
    parent_hash: str | None,
    project_name: str,
    raw_prompt: str,
    optimized_prompt: str | None,
    eval_score: float,
    eval_feedback: str | None,
    status: str,
    tokens_before: int = 0,
    tokens_after: int = 0,
    cost: float = 0.0,
    duration_ms: int = 0
) -> None:
    db = await get_db()
    try:
        await db.execute(
            """
            INSERT INTO commits (
                hash, parent_hash, project_name, raw_prompt, optimized_prompt,
                eval_score, eval_feedback, status, tokens_before,
                tokens_after, cost, duration_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                commit_hash, parent_hash, project_name, raw_prompt, optimized_prompt,
                eval_score, eval_feedback, status, tokens_before,
                tokens_after, cost, duration_ms
            )
        )
        await db.commit()
    finally:
        await db.close()

async def update_commit_status(commit_hash: str, status: str, eval_score: float, eval_feedback: str | None) -> None:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE commits SET status = ?, eval_score = ?, eval_feedback = ? WHERE hash = ?",
            (status, eval_score, eval_feedback, commit_hash)
        )
        await db.commit()
    finally:
        await db.close()

async def save_file_version(commit_hash: str, file_path: str, content: str) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO file_versions (commit_hash, file_path, content) VALUES (?, ?, ?)",
            (commit_hash, file_path, content)
        )
        await db.commit()
    finally:
        await db.close()

async def get_commits(project_name: str = "default") -> list[dict[str, Any]]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM commits WHERE project_name = ? ORDER BY timestamp ASC, id ASC",
            (project_name,)
        )
        rows = await cursor.fetchall()
        return [row_to_dict(row) for row in rows]
    finally:
        await db.close()

async def get_commit(commit_hash: str) -> dict[str, Any] | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM commits WHERE hash = ?", (commit_hash,))
        row = await cursor.fetchone()
        return row_to_dict(row) if row else None
    finally:
        await db.close()

async def get_file_versions(commit_hash: str) -> list[dict[str, Any]]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT file_path, content FROM file_versions WHERE commit_hash = ?",
            (commit_hash,)
        )
        rows = await cursor.fetchall()
        return [row_to_dict(row) for row in rows]
    finally:
        await db.close()

async def get_setting(key: str, default: str = "") -> str:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = await cursor.fetchone()
        return row[0] if row else default
    finally:
        await db.close()

async def save_setting(key: str, value: str) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, value)
        )
        await db.commit()
    finally:
        await db.close()
