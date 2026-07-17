from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

CHRONIC_CONDITIONS_OPTIONS = [
    "Diabetes", "Hypertension", "COPD", "Asthma", "Heart Disease",
    "Kidney Disease", "Liver Disease", "Cancer", "Stroke", "Epilepsy",
    "Thyroid Disorder", "Arthritis", "HIV/AIDS", "Tuberculosis", "Other"
]

BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

class PatientProfileCreate(BaseModel):
    date_of_birth: date
    gender: str = Field(..., pattern=r"^(male|female|other)$")
    address: str = Field(..., min_length=5, max_length=500)
    emergency_contact: str = Field(..., min_length=5, max_length=200)
    blood_group: Optional[str] = None
    chronic_conditions: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    is_pregnant: Optional[bool] = None

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v):
        if v is not None and v not in BLOOD_GROUP_OPTIONS:
            raise ValueError(f"Blood group must be one of: {', '.join(BLOOD_GROUP_OPTIONS)}")
        return v

    @field_validator("chronic_conditions")
    @classmethod
    def validate_chronic_conditions(cls, v):
        for item in v:
            if item not in CHRONIC_CONDITIONS_OPTIONS:
                raise ValueError(f"Invalid chronic condition: {item}. Must be one of: {', '.join(CHRONIC_CONDITIONS_OPTIONS)}")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob_not_future(cls, v):
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v

class PatientProfileUpdate(BaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    chronic_conditions: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    is_pregnant: Optional[bool] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v is not None and v not in ("male", "female", "other"):
            raise ValueError("Gender must be male, female, or other")
        return v

    @field_validator("blood_group")
    @classmethod
    def validate_blood_group(cls, v):
        if v is not None and v not in BLOOD_GROUP_OPTIONS:
            raise ValueError(f"Blood group must be one of: {', '.join(BLOOD_GROUP_OPTIONS)}")
        return v

    @field_validator("chronic_conditions")
    @classmethod
    def validate_chronic_conditions(cls, v):
        if v is not None:
            for item in v:
                if item not in CHRONIC_CONDITIONS_OPTIONS:
                    raise ValueError(f"Invalid chronic condition: {item}")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob_not_future(cls, v):
        if v is not None and v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v

class PatientProfileResponse(BaseModel):
    id: str
    user_id: str
    date_of_birth: date
    gender: str
    address: str
    emergency_contact: str
    blood_group: Optional[str] = None
    chronic_conditions: List[str] = []
    allergies: List[str] = []
    is_pregnant: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

def profile_helper(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "date_of_birth": doc.get("date_of_birth"),
        "gender": doc.get("gender", ""),
        "address": doc.get("address", ""),
        "emergency_contact": doc.get("emergency_contact", ""),
        "blood_group": doc.get("blood_group"),
        "chronic_conditions": doc.get("chronic_conditions", []),
        "allergies": doc.get("allergies", []),
        "is_pregnant": doc.get("is_pregnant"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }
