from datetime import date, datetime
from typing import List, Tuple
from bson import ObjectId

from app.database import get_database
from app.models.priority_rules import rules_helper

# Default rules fallback
DEFAULT_RULES = {
    "thresholds": {
        "critical": 70,
        "high": 50,
        "medium": 30
    },
    "weights": {
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
    },
    "urgent_keywords": [
        "chest pain", "shortness of breath", "bleeding", "severe pain",
        "unconscious", "stroke", "difficulty breathing", "heart attack", "head injury"
    ]
}

class PriorityService:
    @staticmethod
    async def get_active_rules(db) -> dict:
        """Fetch active priority rules configuration from MongoDB. Fallback to default if not found."""
        try:
            doc = await db.priority_rules.find_one({"is_active": True})
            if doc:
                return rules_helper(doc)
        except Exception:
            pass
        return {
            "id": "default",
            **DEFAULT_RULES,
            "is_active": True,
            "updated_at": datetime.now()
        }

    @staticmethod
    def calculate_age(dob) -> int:
        """Calculate age from date of birth."""
        if isinstance(dob, datetime):
            dob = dob.date()
        if not isinstance(dob, date):
            return 30
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    @classmethod
    def calculate_priority(
        cls,
        severity: int,
        symptom_duration_days: int,
        symptoms: str,
        patient_dob,
        chronic_conditions: List[str],
        is_pregnant: bool,
        rules: dict
    ) -> dict:
        """
        Calculate total priority score, category, and plain-language explanation.
        """
        weights = rules["weights"]
        thresholds = rules["thresholds"]
        keywords = rules["urgent_keywords"]

        # 1. Symptom severity score
        severity_multiplier = weights.get("severity_multiplier", 4.0)
        severity_points = min(int(severity * severity_multiplier), 40)

        # 2. Symptom duration score
        dur_config = weights.get("duration", DEFAULT_RULES["weights"]["duration"])
        acute_days = dur_config.get("acute_days", 1)
        sub_acute_days = dur_config.get("sub_acute_days", 7)

        if symptom_duration_days <= acute_days:
            duration_points = dur_config.get("acute_points", 15)
        elif symptom_duration_days <= sub_acute_days:
            duration_points = dur_config.get("sub_acute_points", 10)
        else:
            duration_points = dur_config.get("chronic_points", 5)

        # 3. Age score (65 or above)
        age = cls.calculate_age(patient_dob)
        age_points = weights.get("age_65_or_above", 10) if age >= 65 else 0

        # 4. Chronic condition score
        has_chronic = len(chronic_conditions) > 0 if chronic_conditions else False
        chronic_points = weights.get("chronic_condition_present", 10) if has_chronic else 0

        # 5. Pregnancy score
        pregnancy_points = weights.get("pregnancy", 10) if is_pregnant else 0

        # 6. Urgent keywords check
        symptoms_lower = symptoms.lower() if symptoms else ""
        matched_keywords = [kw for kw in keywords if kw.lower() in symptoms_lower]
        has_urgent_keyword = len(matched_keywords) > 0
        urgent_keyword_points = weights.get("urgent_keywords", 15) if has_urgent_keyword else 0

        # Sum total score (capped at 100)
        total_score = severity_points + duration_points + age_points + chronic_points + pregnancy_points + urgent_keyword_points
        total_score = min(max(total_score, 0), 100)

        # Determine Priority Category
        if total_score >= thresholds.get("critical", 70):
            priority_level = "Critical"
        elif total_score >= thresholds.get("high", 50):
            priority_level = "High"
        elif total_score >= thresholds.get("medium", 30):
            priority_level = "Medium"
        else:
            priority_level = "Low"

        # Generate Plain-Language Explanation
        factors = []
        if severity >= 7:
            factors.append("high reported severity")
        elif severity >= 4:
            factors.append("moderate reported severity")
        else:
            factors.append("reported severity")

        if symptom_duration_days <= acute_days:
            factors.append("acute symptom duration")
        elif symptom_duration_days <= sub_acute_days:
            factors.append("sub-acute symptom duration")

        if age >= 65:
            factors.append("patient age 65 or above")

        if has_chronic:
            factors.append("chronic condition present")

        if is_pregnant:
            factors.append("pregnancy status")

        if has_urgent_keyword:
            factors.append("urgent symptom keyword match")

        if not factors:
            explanation = f"{priority_level} priority based on default clinical triage criteria."
        elif len(factors) == 1:
            explanation = f"{priority_level} priority because of {factors[0]}."
        else:
            explanation = f"{priority_level} priority because of {', '.join(factors[:-1])}, and {factors[-1]}."

        return {
            "priority_score": total_score,
            "priority_level": priority_level,
            "priority_explanation": explanation,
            "score_breakdown": {
                "severity_points": severity_points,
                "duration_points": duration_points,
                "age_points": age_points,
                "chronic_condition_points": chronic_points,
                "pregnancy_points": pregnancy_points,
                "urgent_keyword_points": urgent_keyword_points,
                "patient_age": age,
                "matched_keywords": matched_keywords
            }
        }
