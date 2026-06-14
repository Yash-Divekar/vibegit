from fastapi import APIRouter
from pydantic import BaseModel
from database import get_setting, save_setting
from services.settings import mask_api_key

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsPayload(BaseModel):
    gemini_key: str = ""
    openai_key: str = ""
    provider: str = "gemini"

@router.get("")
async def get_settings():
    gemini_key = await get_setting("GEMINI_API_KEY")
    openai_key = await get_setting("OPENAI_API_KEY")
    provider = await get_setting("PROVIDER", "gemini")
    
    return {
        "gemini_key_masked": mask_api_key(gemini_key),
        "openai_key_masked": mask_api_key(openai_key),
        "provider": provider
    }

@router.post("")
async def save_settings(payload: SettingsPayload):
    if payload.gemini_key and not payload.gemini_key.startswith("****"):
        await save_setting("GEMINI_API_KEY", payload.gemini_key)
    if payload.openai_key and not payload.openai_key.startswith("****"):
        await save_setting("OPENAI_API_KEY", payload.openai_key)
    await save_setting("PROVIDER", payload.provider)
    return {"status": "success"}
