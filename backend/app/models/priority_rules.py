from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class ThresholdsSchema(BaseModel):
    critical: int = Field(70, ge=0, le=100)
    high: int = Field(50, ge=0, le=100)
    medium: int = Field(30, ge=0, le=100)

class DurationRulesSchema(BaseModel):
    acute_days: int = Field(1, ge=0)
    acute_points: int = Field(15, ge=0, le=100)
    sub_acute_days: int = Field(7, ge=0)
    sub_acute_points: int = Field(10, ge=0, le=100)
    chronic_points: int = Field(5, ge=0, le=100)

class WeightsSchema(BaseModel):
    severity_multiplier: float = Field(4.0, ge=0.0, le=10.0)
    duration: DurationRulesSchema = Field(default_factory=DurationRulesSchema)
    age_65_or_above: int = Field(10, ge=0, le=100)
    chronic_condition_present: int = Field(10, ge=0, le=100)
    pregnancy: int = Field(10, ge=0, le=100)
    urgent_keywords: int = Field(15, ge=0, le=100)

class PriorityRulesBase(BaseModel):
    thresholds: ThresholdsSchema = Field(default_factory=ThresholdsSchema)
    weights: WeightsSchema = Field(default_factory=WeightsSchema)
    urgent_keywords: List[str] = Field(default_factory=lambda: [
        "chest pain", "shortness of breath", "bleeding", "severe pain",
        "unconscious", "stroke", "difficulty breathing", "heart attack", "head injury"
    ])

class PriorityRulesResponse(PriorityRulesBase):
    id: str
    is_active: bool
    updated_at: datetime

def rules_helper(doc) -> dict:
    return {
        "id": str(doc["_id"]),
        "thresholds": doc.get("thresholds", {
            "critical": 70,
            "high": 50,
            "medium": 30
        }),
        "weights": doc.get("weights", {
            "severity_multiplier": 4.0,
            "duration": {
                "acute_days": 1,
                "acute_points": 15,
                "sub_acute_days": 7,
                "sub_acute_points": 10,
                "chronic_points": 5
            },
            "age_65_or_above": 10,
            "chronic_condition_present": 10,
            "pregnancy": 10,
            "urgent_keywords": 15
        }),
        "urgent_keywords": doc.get("urgent_keywords", [
            "chest pain", "shortness of breath", "bleeding", "severe pain",
            "unconscious", "stroke", "difficulty breathing", "heart attack", "head injury"
        ]),
        "is_active": doc.get("is_active", True),
        "updated_at": doc.get("updated_at", datetime.now())
    }
