import logging
from typing import List, Dict, Any, Optional
from google.cloud import firestore
from backend.config import PROJECT_ID

logger = logging.getLogger("journal-api.firestore")

db = firestore.Client(project=PROJECT_ID)

def get_user_sessions(uid: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch sessions strictly scoped to the given uid."""
    sessions_ref = (
        db.collection("users")
        .document(uid)
        .collection("sessions")
        .order_by("updatedAt", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in sessions_ref.stream()]

def get_session_messages(uid: str, session_id: str, limit: int = 200) -> List[Dict[str, Any]]:
    """
    Fetch messages for a session. Because the path is uid-scoped,
    this will naturally return empty/fail if trying to access another user's session.
    """
    messages_ref = (
        db.collection("users")
        .document(uid)
        .collection("sessions")
        .document(session_id)
        .collection("messages")
        .order_by("createdAt")
        .limit(limit)
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in messages_ref.stream()]

def create_or_update_session(uid: str, session_id: str, title: str) -> None:
    """Updates session metadata."""
    session_ref = db.collection("users").document(uid).collection("sessions").document(session_id)
    session_doc = session_ref.get()
    
    update_data = {
        "updatedAt": firestore.SERVER_TIMESTAMP,
        "messageCount": firestore.Increment(2),
    }
    
    if not session_doc.exists or not session_doc.to_dict().get("title"):
        update_data["title"] = title[:80]
    
    session_ref.set(update_data, merge=True)
    
    if not session_doc.exists or not session_doc.to_dict().get("createdAt"):
        session_ref.update({"createdAt": firestore.SERVER_TIMESTAMP})

def add_message_to_session(uid: str, session_id: str, role: str, content: str, mood: Optional[str] = None, stress_level: Optional[int] = None) -> None:
    """Appends a message to the session strictly scoped to uid."""
    msg_data = {
        "role": role,
        "content": content,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    if mood:
        msg_data["mood"] = mood
    if stress_level is not None:
        msg_data["stress_level"] = stress_level
        
    messages_ref = db.collection("users").document(uid).collection("sessions").document(session_id).collection("messages")
    messages_ref.add(msg_data)

def save_summary(uid: str, session_id: str, encrypted_summary: bytes, mood: str, tags: List[str], embedding: List[float]) -> str:
    """Saves an encrypted summary and its embedding strictly scoped to uid."""
    summary_doc = {
        "sessionId": session_id,
        "summary": encrypted_summary,  # Ciphertext
        "mood": mood,
        "tags": tags,
        "embedding": embedding,
        "isFavorite": False,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    doc_ref = db.collection("users").document(uid).collection("summaries").document()
    doc_ref.set(summary_doc)
    return doc_ref.id

def get_user_summaries(uid: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch summaries strictly scoped to uid."""
    summaries_ref = (
        db.collection("users")
        .document(uid)
        .collection("summaries")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in summaries_ref.stream()]

def toggle_summary_favorite(uid: str, summary_id: str, is_favorite: bool) -> None:
    """Toggles the favorite status of a summary securely scoped to uid."""
    doc_ref = db.collection("users").document(uid).collection("summaries").document(summary_id)
    doc_ref.update({"isFavorite": is_favorite})

def delete_user_data(uid: str) -> None:
    """Permanently deletes all data for the given uid across all collections."""
    logger.warning(f"Initiating crypto-nuke for user {uid}")
    
    # 1. Delete all messages within all sessions
    sessions_ref = db.collection("users").document(uid).collection("sessions")
    for session_doc in sessions_ref.stream():
        messages_ref = session_doc.reference.collection("messages")
        for msg_doc in messages_ref.stream():
            msg_doc.reference.delete()
        # 2. Delete the session document itself
        session_doc.reference.delete()
        
    # 3. Delete all summaries
    summaries_ref = db.collection("users").document(uid).collection("summaries")
    for summary_doc in summaries_ref.stream():
        summary_doc.reference.delete()
        
    # 4. Delete all tasks
    tasks_ref = db.collection("users").document(uid).collection("tasks")
    for task_doc in tasks_ref.stream():
        task_doc.reference.delete()
        
    # 5. Delete the main user document
    db.collection("users").document(uid).delete()
    
    logger.info(f"Crypto-nuke complete for user {uid}")

def get_user_tasks(uid: str) -> List[Dict[str, Any]]:
    """Fetch all tasks for the user."""
    tasks_ref = (
        db.collection("users")
        .document(uid)
        .collection("tasks")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in tasks_ref.stream()]

def create_task(uid: str, text: str) -> Dict[str, Any]:
    """Create a new task."""
    tasks_ref = db.collection("users").document(uid).collection("tasks")
    new_task = {
        "text": text,
        "completed": False,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }
    _, doc_ref = tasks_ref.add(new_task)
    return {"id": doc_ref.id, **new_task}

def update_task(uid: str, task_id: str, updates: Dict[str, Any]) -> None:
    """Update an existing task (e.g. toggle completed, edit text)."""
    task_ref = db.collection("users").document(uid).collection("tasks").document(task_id)
    if "updatedAt" not in updates:
        updates["updatedAt"] = firestore.SERVER_TIMESTAMP
    task_ref.update(updates)

def delete_task(uid: str, task_id: str) -> None:
    """Delete a task."""
    task_ref = db.collection("users").document(uid).collection("tasks").document(task_id)
    task_ref.delete()
