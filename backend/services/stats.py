from database import get_commits

async def calculate_project_stats(project: str) -> dict:
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
