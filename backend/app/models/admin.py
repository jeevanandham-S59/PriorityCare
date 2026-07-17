from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

class DoctorCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    password: str = Field(..., min_length=8)
    department_id: str
    specialization: str = Field(..., min_length=2, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    schedule_slots: List[str] = Field(default_factory=lambda: ["morning", "afternoon", "evening"])

class DoctorUpdate(BaseModel):
    specialization: Optional[str] = Field(None, min_length=2, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    schedule_slots: Optional[List[str]] = None
    department_id: Optional[str] = None
    is_active: Optional[bool] = None

class PriorityOverrideRequest(BaseModel):
    priority_score: int = Field(..., ge=0, le=100)
    priority_level: str = Field(..., min_length=3, max_length=20)
    reason: str = Field(..., min_length=5, max_length=1000)

class AuditLogResponse(BaseModel):
    id: str
    actor_name: str
    actor_email: str
    action: str
    entity_type: str
    entity_id: str
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    created_at: datetime

def audit_log_helper(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "actor_name": doc.get("actor_name", "System"),
        "actor_email": doc.get("actor_email", ""),
        "action": doc.get("action", ""),
        "entity_type": doc.get("entity_type", ""),
        "entity_id": str(doc.get("entity_id", "")),
        "previous_value": doc.get("previous_value"),
        "new_value": doc.get("new_value"),
        "reason": doc.get("reason"),
        "created_at": doc.get("created_at")
    }
