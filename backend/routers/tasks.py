from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from backend.auth import verify_token
from backend.firestore_client import get_user_tasks, create_task, update_task, delete_task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.get("")
async def get_tasks(uid: str = Depends(verify_token)):
    """Fetch all tasks for the authenticated user."""
    try:
        tasks = get_user_tasks(uid)
        return {"tasks": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_new_task(text: str = Body(..., embed=True), uid: str = Depends(verify_token)):
    """Create a new task."""
    try:
        task = create_task(uid, text)
        return {"task": task}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{task_id}")
async def patch_task(task_id: str, updates: Dict[str, Any] = Body(...), uid: str = Depends(verify_token)):
    """Update task (e.g., text or completed status)."""
    try:
        update_task(uid, task_id, updates)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def remove_task(task_id: str, uid: str = Depends(verify_token)):
    """Delete a task."""
    try:
        delete_task(uid, task_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
