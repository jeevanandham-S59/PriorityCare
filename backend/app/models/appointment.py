from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

SEVERITY_LABELS = {
    1: "Minimal", 2: "Mild", 3: "Mild-Moderate", 4: "Moderate",
    5: "Moderate", 6: "Moderate-Severe", 7: "Severe",
    8: "Severe", 9: "Very Severe", 10: "Critical/Emergency"
}

TIME_SLOT_OPTIONS = ["morning", "afternoon", "evening"]

STATUS_OPTIONS = ["pending", "assigned", "confirmed", "completed", "cancelled"]

class AppointmentRequestCreate(BaseModel):
    department_id: str = Field(..., min_length=1)
    symptoms: str = Field(..., min_length=10, max_length=2000)
    symptom_duration_days: int = Field(..., ge=0, le=365)
    severity: int = Field(..., ge=1, le=10)
    preferred_date: date
    preferred_time_slot: str

    @field_validator("preferred_date")
    @classmethod
    def validate_preferred_date_not_past(cls, v):
        if v < date.today():
            raise ValueError("Preferred date cannot be in the past")
        return v

    @field_validator("preferred_time_slot")
    @classmethod
    def validate_time_slot(cls, v):
        if v not in TIME_SLOT_OPTIONS:
            raise ValueError(f"Time slot must be one of: {', '.join(TIME_SLOT_OPTIONS)}")
        return v

class AppointmentRequestResponse(BaseModel):
    id: str
    patient_id: str
    department_id: str
    department_name: Optional[str] = None
    symptoms: str
    symptom_duration_days: int
    severity: int
    severity_label: Optional[str] = None
    preferred_date: date
    preferred_time_slot: str
    priority_score: Optional[int] = None
    priority_level: Optional[str] = None
    priority_explanation: Optional[str] = None
    score_breakdown: Optional[dict] = None
    status: str
    assigned_doctor_id: Optional[str] = None
    assigned_doctor_name: Optional[str] = None
    appointment_datetime: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AppointmentListItem(BaseModel):
    id: str
    department_name: Optional[str] = None
    severity: int
    severity_label: Optional[str] = None
    priority_level: Optional[str] = None
    priority_score: Optional[int] = None
    status: str
    preferred_date: date
    created_at: Optional[datetime] = None

def appointment_helper(doc, dept_name=None, doctor_name=None) -> dict:
    severity_val = doc.get("severity", 1)
    return {
        "id": str(doc["_id"]),
        "patient_id": str(doc["patient_id"]),
        "department_id": str(doc["department_id"]),
        "department_name": dept_name or doc.get("department_name"),
        "symptoms": doc.get("symptoms", ""),
        "symptom_duration_days": doc.get("symptom_duration_days", 0),
        "severity": severity_val,
        "severity_label": SEVERITY_LABELS.get(severity_val, "Unknown"),
        "preferred_date": doc.get("preferred_date"),
        "preferred_time_slot": doc.get("preferred_time_slot", ""),
        "priority_score": doc.get("priority_score"),
        "priority_level": doc.get("priority_level"),
        "priority_explanation": doc.get("priority_explanation"),
        "score_breakdown": doc.get("score_breakdown"),
        "status": doc.get("status", "pending"),
        "assigned_doctor_id": str(doc["assigned_doctor_id"]) if doc.get("assigned_doctor_id") else None,
        "assigned_doctor_name": doctor_name,
        "appointment_datetime": doc.get("appointment_datetime"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }

def appointment_list_helper(doc, dept_name=None) -> dict:
    severity_val = doc.get("severity", 1)
    return {
        "id": str(doc["_id"]),
        "department_name": dept_name or doc.get("department_name"),
        "severity": severity_val,
        "severity_label": SEVERITY_LABELS.get(severity_val, "Unknown"),
        "priority_level": doc.get("priority_level"),
        "priority_score": doc.get("priority_score"),
        "status": doc.get("status", "pending"),
        "preferred_date": doc.get("preferred_date"),
        "created_at": doc.get("created_at"),
    }
