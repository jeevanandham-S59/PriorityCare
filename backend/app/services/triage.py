"""
Priority Triage Scoring Engine for PriorityCare.

Calculates a transparent priority score (0-100) based on configurable factors:
1. Symptom Severity (max 40 pts) - mapped from 1-10 scale
2. Symptom Duration (max 15 pts) - acute vs chronic
3. Age Band (max 15 pts) - infants/elderly get higher priority
4. Chronic Conditions (max 15 pts) - multiple conditions increase priority
5. Pregnancy Status (max 15 pts) - pregnant patients get higher priority

Priority Levels:
  Critical: score >= 80
  High:     60 <= score < 80
  Medium:   40 <= score < 60
  Low:      score < 40
"""

from datetime import date, datetime


def calculate_age(dob) -> int:
    """Calculate age from date of birth."""
    if isinstance(dob, datetime):
        dob = dob.date()
    if not isinstance(dob, date):
        return 30  # Default to adult age if dob is missing
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def compute_severity_points(severity: int, weights: dict) -> int:
    """Map severity from 1-10 scale to point allocation.
    1-3: mild, 4-6: moderate, 7-10: severe
    """
    severity_weights = weights.get("symptom_severity", {"severe": 40, "moderate": 25, "mild": 10})
    if severity >= 7:
        return severity_weights.get("severe", 40)
    elif severity >= 4:
        return severity_weights.get("moderate", 25)
    else:
        return severity_weights.get("mild", 10)


def compute_duration_points(duration_days: int, weights: dict) -> int:
    """Map symptom duration to point allocation.
    < 1 day (0): acute, 1-7 days: sub-acute, > 7 days: chronic
    """
    duration_weights = weights.get("symptom_duration", {"acute": 15, "sub_acute": 10, "chronic": 5})
    if duration_days <= 0:
        return duration_weights.get("acute", 15)
    elif duration_days <= 7:
        return duration_weights.get("sub_acute", 10)
    else:
        return duration_weights.get("chronic", 5)


def compute_age_points(age: int, weights: dict) -> int:
    """Map age to point allocation.
    < 2 or >= 65: infant/elderly, 2-12 or 50-64: child/older adult, 13-49: adult
    """
    age_weights = weights.get("age_band", {"infant_elderly": 15, "child_older_adult": 10, "adult": 5})
    if age < 2 or age >= 65:
        return age_weights.get("infant_elderly", 15)
    elif age <= 12 or age >= 50:
        return age_weights.get("child_older_adult", 10)
    else:
        return age_weights.get("adult", 5)


def compute_chronic_points(conditions: list, weights: dict) -> int:
    """Map chronic conditions count to points."""
    chronic_weights = weights.get("chronic_conditions", {"multiple": 15, "single": 10, "none": 0})
    count = len(conditions) if conditions else 0
    if count >= 2:
        return chronic_weights.get("multiple", 15)
    elif count == 1:
        return chronic_weights.get("single", 10)
    else:
        return chronic_weights.get("none", 0)


def compute_pregnancy_points(is_pregnant: bool, weights: dict) -> int:
    """Add pregnancy bonus points."""
    if is_pregnant:
        return weights.get("pregnancy", 15)
    return 0


def classify_priority(score: int) -> str:
    """Classify total score into a priority level."""
    if score >= 80:
        return "Critical"
    elif score >= 60:
        return "High"
    elif score >= 40:
        return "Medium"
    else:
        return "Low"


def calculate_priority(
    severity: int,
    symptom_duration_days: int,
    patient_dob,
    chronic_conditions: list,
    is_pregnant: bool,
    weights: dict
) -> dict:
    """
    Calculate full triage priority score with transparent breakdown.
    
    Returns a dict with:
      - priority_score: int (0-100)
      - priority_level: str (Critical/High/Medium/Low)
      - score_breakdown: dict of individual factor scores
    """
    age = calculate_age(patient_dob)

    severity_pts = compute_severity_points(severity, weights)
    duration_pts = compute_duration_points(symptom_duration_days, weights)
    age_pts = compute_age_points(age, weights)
    chronic_pts = compute_chronic_points(chronic_conditions, weights)
    pregnancy_pts = compute_pregnancy_points(is_pregnant, weights)

    total = severity_pts + duration_pts + age_pts + chronic_pts + pregnancy_pts
    # Cap at 100
    total = min(total, 100)

    return {
        "priority_score": total,
        "priority_level": classify_priority(total),
        "score_breakdown": {
            "severity_points": severity_pts,
            "duration_points": duration_pts,
            "age_points": age_pts,
            "chronic_condition_points": chronic_pts,
            "pregnancy_points": pregnancy_pts,
            "patient_age": age,
        }
    }
