import json
import asyncio
from typing import Any
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from rlm_engine import run_rlm_pipeline

router = APIRouter(tags=["prompt"])

class PromptPayload(BaseModel):
    prompt: str = Field(..., min_length=1)
    project_name: str = "default"

@router.post("/api/prompt")
async def process_prompt(payload: PromptPayload):
    async def event_generator():
        queue = asyncio.Queue()

        def callback(step_name: str, step_data: Any):
            loop = asyncio.get_event_loop()
            loop.call_soon_threadsafe(queue.put_nowait, (step_name, step_data))

        pipeline_task = asyncio.create_task(run_rlm_pipeline(payload.project_name, payload.prompt, callback))
        
        while not pipeline_task.done() or not queue.empty():
            try:
                if not queue.empty():
                    step_name, step_data = queue.get_nowait()
                    yield f"data: {json.dumps({'step': step_name, 'data': step_data})}\n\n"
                    queue.task_done()
                else:
                    await asyncio.sleep(0.1)
            except Exception as e:
                yield f"data: {json.dumps({'step': 'error', 'data': str(e)})}\n\n"
                break
                
        if pipeline_task.done() and not pipeline_task.cancelled():
            result = pipeline_task.result()
            yield f"data: {json.dumps({'step': 'finished', 'data': result})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
