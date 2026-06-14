from __future__ import annotations

import math
import re
import json
import time
import os
import sys
import subprocess
from pathlib import Path
from typing import Any, Tuple

from database import get_setting, get_commits, get_file_versions
from git_engine import get_sandbox_files, make_virtual_commit, get_project_sandbox_dir, rollback_to_commit

# --- TF-IDF Search Engine ---
def tokenize(text: str) -> list[str]:
    """Tokenizes text into words."""
    return re.findall(r"\w+", text.lower())

async def search_context_in_commits(query: str, project_name: str = "default", top_k: int = 3) -> list[dict[str, Any]]:
    """Searches past commits for a specific project for relevance to the query using TF-IDF."""
    commits = await get_commits(project_name)
    # Filter out root commit
    root_hash = f"root-{project_name}"
    commits = [c for c in commits if c["hash"] != root_hash]
    
    query_tokens = tokenize(query)
    if not query_tokens or not commits:
        return []
        
    docs = []
    for c in commits:
        files = await get_file_versions(c["hash"])
        file_paths_str = " ".join([f["file_path"] for f in files])
        text = f"{c['raw_prompt']} {c.get('optimized_prompt') or ''} {c['hash']} {file_paths_str}"
        docs.append((c, tokenize(text)))
        
    N = len(commits)
    df = {}
    for _, tokens in docs:
        unique_tokens = set(tokens)
        for token in unique_tokens:
            df[token] = df.get(token, 0) + 1
            
    idf = {}
    for token, freq in df.items():
        idf[token] = math.log((1 + N) / (1 + freq)) + 1
        
    scores = []
    for commit, tokens in docs:
        tf = {}
        for token in tokens:
            tf[token] = tf.get(token, 0) + 1
            
        score = 0.0
        for token in query_tokens:
            if token in tf and token in idf:
                score += tf[token] * idf[token]
        if score > 0:
            scores.append((score, commit))
            
    scores.sort(key=lambda x: x[0], reverse=True)
    return [c for score, c in scores[:top_k]]


# --- LLM Client Helpers ---
async def call_llm(prompt: str, system_instruction: str = "") -> str:
    """Calls Gemini or OpenAI based on settings."""
    gemini_key = await get_setting("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    openai_key = await get_setting("OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    provider = await get_setting("PROVIDER", "gemini")

    if provider == "gemini" and gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_instruction if system_instruction else None
            )
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            raise RuntimeError(f"Gemini API call failed: {str(e)}")

    elif provider == "openai" and openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            raise RuntimeError(f"OpenAI API call failed: {str(e)}")

    raise ValueError("No API keys found. Running in Mock Mode.")


# --- Recursive Language Model (RLM) Pipeline ---
async def run_rlm_pipeline(
    project_name: str,
    raw_prompt: str,
    on_step_callback=None
) -> dict[str, Any]:
    """
    Runs the VibeGit RLM pipeline scoped to a specific project.
    """
    start_time = time.time()
    p_sandbox = get_project_sandbox_dir(project_name)
    
    # Check if we can run real LLM
    gemini_key = await get_setting("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    openai_key = await get_setting("OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    use_mock = not (gemini_key or openai_key)

    def log_step(name: str, data: Any):
        if on_step_callback:
            on_step_callback(name, data)

    # --- Step 1: Context Retrieval ---
    log_step("retrieving", {"status": "searching_git_history"})
    related_commits = await search_context_in_commits(raw_prompt, project_name, top_k=2)
    active_files = get_sandbox_files(project_name)
    
    retrieved_commits_data = [
        {
            "hash": c["hash"],
            "prompt": c["raw_prompt"],
            "score": c["eval_score"],
            "timestamp": c["timestamp"]
        }
        for c in related_commits
    ]
    log_step("retrieved", {
        "commits": retrieved_commits_data,
        "active_files": list(active_files.keys())
    })

    # --- Step 2: Context Compression & Prompt Optimization ---
    log_step("optimizing", {"status": "compressing_context"})
    
    raw_context_str = json.dumps(active_files) + json.dumps(retrieved_commits_data)
    raw_tokens = len(raw_context_str) // 4 + len(raw_prompt) // 4
    
    optimized_prompt = ""
    compression_ratio = 1.0
    tokens_after = raw_tokens

    if use_mock:
        await asyncio_sleep(1)
        tokens_after = int(raw_tokens * 0.35)
        compression_ratio = round(raw_tokens / tokens_after, 2)
        optimized_prompt = (
            f"# Optimized Prompt for VibeGit (Project: {project_name})\n"
            f"**Goal**: {raw_prompt}\n\n"
            f"**Context**: Using relevant files: {', '.join(active_files.keys())}.\n"
            f"Please implement the changes in structured JSON format."
        )
    else:
        optimizer_sys_inst = (
            "You are a Prompt Optimizer agent. Your job is to compress codebase context "
            "and build a clean, highly structured, instruction-dense prompt for a coder LLM. "
            "Strip out boilerplate, duplicate code, and irrelevant history. Focus only on variables, "
            "function signatures, and critical business logic relevant to the user request. "
            "Output your optimized prompt in clean Markdown."
        )
        optimizer_prompt = (
            f"Project: {project_name}\n"
            f"User Prompt: {raw_prompt}\n\n"
            f"Sandbox Files Context:\n{json.dumps(active_files, indent=2)}\n\n"
            f"Related Past Commits:\n{json.dumps(retrieved_commits_data, indent=2)}\n\n"
            f"Produce the optimized prompt."
        )
        try:
            optimized_prompt = await call_llm(optimizer_prompt, optimizer_sys_inst)
            tokens_after = len(optimized_prompt) // 4
            compression_ratio = round(raw_tokens / max(tokens_after, 1), 2)
        except Exception as e:
            optimized_prompt = f"Failed to optimize prompt: {str(e)}. Using original."
            tokens_after = raw_tokens
            compression_ratio = 1.0

    log_step("optimized", {
        "optimized_prompt": optimized_prompt,
        "tokens_before": raw_tokens,
        "tokens_after": tokens_after,
        "compression_ratio": compression_ratio
    })

    # --- Step 3: Code Generation & Step 4: Self-Correction Loop ---
    max_retries = 3
    retry_count = 0
    success = False
    score = 0.0
    feedback = ""
    generated_files = {}
    history_log = []

    generator_sys_instruction = (
        "You are an expert AI coder agent. Your task is to generate file additions or edits "
        "based on the prompt. You MUST output your response in raw JSON format matching this schema:\n"
        "{\n"
        "  \"explanation\": \"Brief explanation of what changes you made and why.\",\n"
        "  \"file_operations\": [\n"
        "    {\n"
        "      \"file_path\": \"relative/path/to/file.py\",\n"
        "      \"operation\": \"write\", // write (create/update) or delete\n"
        "      \"content\": \"full file content here\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Output ONLY the raw JSON. Do not wrap it in markdown code blocks like ```json."
    )

    while retry_count < max_retries and not success:
        run_id = retry_count + 1
        log_step("generating", {"retry_number": run_id, "status": "generating_code"})

        if use_mock:
            await asyncio_sleep(1.5)
            generated_files = generate_mock_files(raw_prompt, active_files)
            explanation = f"Simulated code generation for prompt: '{raw_prompt}'."
        else:
            feedback_context = f"\n\nPrevious attempt failed evaluation with score: {score * 100}%. Feedback: {feedback}\nPlease fix these issues." if retry_count > 0 else ""
            generation_prompt = f"Optimized Prompt:\n{optimized_prompt}{feedback_context}"
            try:
                raw_llm_response = await call_llm(generation_prompt, generator_sys_instruction)
                parsed = parse_llm_json(raw_llm_response)
                explanation = parsed.get("explanation", "")
                generated_files = {op["file_path"]: op["content"] for op in parsed.get("file_operations", []) if op.get("operation") == "write"}
            except Exception as e:
                explanation = f"Generation failed: {str(e)}"
                generated_files = {}

        # Apply changes temporarily
        written_files = []
        for file_path, content in generated_files.items():
            full_path = p_sandbox / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")
            written_files.append(file_path)

        # --- Step 4: Evaluation ---
        log_step("evaluating", {"retry_number": run_id, "status": "evaluating_changes"})
        
        syntax_errors = check_syntax(project_name, written_files)
        
        if syntax_errors:
            score = 0.4
            feedback = f"Syntax checks failed:\n" + "\n".join(syntax_errors)
        else:
            if use_mock:
                await asyncio_sleep(1.0)
                if retry_count == 0 and ("bug" in raw_prompt.lower() or "error" in raw_prompt.lower() or len(raw_prompt) % 2 == 0):
                    score = 0.72
                    feedback = "Syntax is valid, but missing edge-case error checks."
                else:
                    score = 0.95
                    feedback = "Perfect! Syntax is valid, tests passed, code satisfies all requirements."
            else:
                evaluator_sys_instruction = (
                    "You are an independent Code Evaluator agent. Your job is to assess the code changes "
                    "against the user prompt. Rate the changes from 0.0 (fails completely) to 1.0 (perfectly fits and robust). "
                    "You must output a JSON object with this schema:\n"
                    "{\n"
                    "  \"score\": 0.95,\n"
                    "  \"feedback\": \"detailed review of changes, noting any bugs or omissions\"\n"
                    "}"
                )
                eval_prompt = (
                    f"User Request: {raw_prompt}\n\n"
                    f"Generated Code Changes:\n{json.dumps(generated_files, indent=2)}\n\n"
                    f"Please score and review."
                )
                try:
                    eval_response = await call_llm(eval_prompt, evaluator_sys_instruction)
                    parsed_eval = parse_llm_json(eval_response)
                    score = float(parsed_eval.get("score", 0.5))
                    feedback = parsed_eval.get("feedback", "No feedback provided.")
                except Exception as e:
                    score = 0.5
                    feedback = f"Evaluation failed: {str(e)}"

        history_log.append({
            "attempt": run_id,
            "score": score,
            "feedback": feedback,
            "files": list(generated_files.keys())
        })

        log_step("evaluated", {
            "retry_number": run_id,
            "score": score,
            "feedback": feedback,
            "attempts": history_log
        })

        if score >= 0.8:
            success = True
        else:
            retry_count += 1

    # --- Step 5: Commit or Rollback ---
    duration_ms = int((time.time() - start_time) * 1000)
    cost = 0.00015 * (raw_tokens + tokens_after) if not use_mock else 0.0

    if success:
        # Finalize commit
        commit_hash = await make_virtual_commit(
            project_name=project_name,
            raw_prompt=raw_prompt,
            optimized_prompt=optimized_prompt,
            eval_score=score,
            eval_feedback=feedback,
            status="success",
            tokens_before=raw_tokens,
            tokens_after=tokens_after,
            cost=cost,
            duration_ms=duration_ms,
            files_snapshot=get_sandbox_files(project_name)
        )
        log_step("committed", {
            "status": "success",
            "commit_hash": commit_hash,
            "score": score,
            "duration_ms": duration_ms
        })
        return {
            "status": "success",
            "commit_hash": commit_hash,
            "score": score,
            "attempts": history_log,
            "optimized_prompt": optimized_prompt
        }
    else:
        # Rollback project sandbox files to head if failed completely
        all_commits = await get_commits(project_name)
        if all_commits:
            success_commits = [c for c in all_commits if c["status"] == "success"]
            head_hash = success_commits[-1]["hash"] if success_commits else f"root-{project_name}"
            
            # Restore files
            file_versions = await get_file_versions(head_hash)
            current_files = get_sandbox_files(project_name)
            head_paths = {fv["file_path"] for fv in file_versions}
            
            for path in current_files:
                if path not in head_paths:
                    (p_sandbox / path).unlink(missing_ok=True)
                    
            for fv in file_versions:
                path = p_sandbox / fv["file_path"]
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(fv["content"], encoding="utf-8")
        
        # Commit the failure run
        commit_hash = await make_virtual_commit(
            project_name=project_name,
            raw_prompt=raw_prompt,
            optimized_prompt=optimized_prompt,
            eval_score=score,
            eval_feedback=feedback,
            status="failed",
            tokens_before=raw_tokens,
            tokens_after=tokens_after,
            cost=cost,
            duration_ms=duration_ms,
            files_snapshot=get_sandbox_files(project_name)
        )
        
        log_step("committed", {
            "status": "failed",
            "commit_hash": commit_hash,
            "score": score,
            "duration_ms": duration_ms
        })
        
        return {
            "status": "failed",
            "commit_hash": commit_hash,
            "score": score,
            "attempts": history_log,
            "optimized_prompt": optimized_prompt
        }


# --- Helpers ---
async def asyncio_sleep(seconds: float):
    import asyncio
    await asyncio.sleep(seconds)

def parse_llm_json(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(cleaned[start:end+1])
            except Exception:
                pass
        return {"explanation": "Parsing error", "file_operations": []}

def check_syntax(project_name: str, file_paths: list[str]) -> list[str]:
    errors = []
    p_sandbox = get_project_sandbox_dir(project_name)
    
    for rel_path in file_paths:
        full_path = p_sandbox / rel_path
        if not full_path.exists():
            continue
        if rel_path.endswith(".py"):
            try:
                subprocess.run(
                    [sys.executable, "-m", "py_compile", str(full_path)],
                    capture_output=True,
                    text=True,
                    check=True
                )
            except subprocess.CalledProcessError as e:
                errors.append(f"{rel_path}: {e.stderr.strip()}")
        elif rel_path.endswith((".js", ".jsx", ".ts", ".tsx")):
            content = full_path.read_text(encoding="utf-8")
            if content.count("{") != content.count("}") or content.count("[") != content.count("]"):
                errors.append(f"{rel_path}: Unbalanced curly braces or brackets detected.")
    return errors

def generate_mock_files(prompt: str, active_files: dict[str, str]) -> dict[str, str]:
    prompt_lower = prompt.lower()
    files = {}

    if "calculator" in prompt_lower or "math" in prompt_lower:
        files["calculator.py"] = (
            "def add(a, b):\n"
            "    \"\"\"Returns the sum of a and b\"\"\"\n"
            "    return a + b\n\n"
            "def subtract(a, b):\n"
            "    \"\"\"Returns the difference of a and b\"\"\"\n"
            "    return a - b\n\n"
            "def multiply(a, b):\n"
            "    \"\"\"Returns the product of a and b\"\"\"\n"
            "    return a * b\n\n"
            "def divide(a, b):\n"
            "    \"\"\"Returns the quotient of a and b. Raises ValueError on division by zero.\"\"\"\n"
            "    if b == 0:\n"
            "        raise ValueError(\"Cannot divide by zero\")\n"
            "    return a / b\n"
        )
        files["test_calculator.py"] = (
            "import unittest\n"
            "from calculator import add, subtract, multiply, divide\n\n"
            "class TestCalculator(unittest.TestCase):\n"
            "    def test_add(self):\n"
            "        self.assertEqual(add(2, 3), 5)\n"
            "        self.assertEqual(add(-1, 1), 0)\n\n"
            "    def test_divide(self):\n"
            "        self.assertEqual(divide(6, 2), 3)\n"
            "        with self.assertRaises(ValueError):\n"
            "            divide(5, 0)\n\n"
            "if __name__ == '__main__':\n"
            "    unittest.main()\n"
        )
    elif "fibonacci" in prompt_lower or "sequence" in prompt_lower:
        files["fibonacci.py"] = (
            "def fibonacci(n):\n"
            "    \"\"\"Returns the n-th Fibonacci number. Handles negative inputs.\"\"\"\n"
            "    if n < 0:\n"
            "        raise ValueError(\"n must be a non-negative integer\")\n"
            "    if n == 0:\n"
            "        return 0\n"
            "    if n == 1:\n"
            "        return 1\n"
            "    \n"
            "    a, b = 0, 1\n"
            "    for _ in range(2, n + 1):\n"
            "        a, b = b, a + b\n"
            "    return b\n"
        )
    elif "api" in prompt_lower or "server" in prompt_lower:
        files["server.py"] = (
            "from fastapi import FastAPI, HTTPException\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI(title=\"Mock API Server\")\n\n"
            "class Item(BaseModel):\n"
            "    name: str\n"
            "    price: float\n\n"
            "items_db = {}\n\n"
            "@app.get(\"/items/{item_id}\")\n"
            "async def read_item(item_id: int):\n"
            "    if item_id not in items_db:\n"
            "        raise HTTPException(status_code=404, detail=\"Item not found\")\n"
            "    return items_db[item_id]\n\n"
            "@app.post(\"/items/{item_id}\")\n"
            "async def create_item(item_id: int, item: Item):\n"
            "    items_db[item_id] = item\n"
            "    return {\"status\": \"item_created\", \"id\": item_id}\n"
        )
    else:
        files["vibe_code.py"] = (
            f"# Generated code for: {prompt}\n"
            f"# Committed automatically in VibeGit environment.\n\n"
            f"def execute_task():\n"
            f"    print(\"Executing vibe task: {prompt}\")\n"
            f"    return True\n\n"
            f"if __name__ == '__main__':\n"
            f"    execute_task()\n"
        )
        
    return files
