from datetime import datetime
from pydantic import BaseModel, Field

class AppointmentNoteCreate(BaseModel):
    note: str = Field(..., min_length=2, max_length=5000)

class AppointmentNoteResponse(BaseModel):
    id: str
    appointment_request_id: str
    author_id: str
    author_name: str
    note: str
    created_at: datetime

def note_helper(doc, author_name: str = "Unknown Staff") -> dict:
    return {
        "id": str(doc["_id"]),
        "appointment_request_id": str(doc["appointment_request_id"]),
        "author_id": str(doc["author_id"]),
        "author_name": author_name,
        "note": doc.get("note", ""),
        "created_at": doc.get("created_at")
    }
