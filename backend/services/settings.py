def mask_api_key(k: str) -> str:
    if not k: return ""
    if len(k) <= 8: return "****"
    return f"{k[:4]}...{k[-4:]}"
