import pytest
from httpx import AsyncClient
from app.database import get_database
from tests.test_appointments import register_and_login_patient, create_patient_profile, get_department_id

pytestmark = pytest.mark.anyio

async def register_and_login_admin(client: AsyncClient):
    # Register an admin directly or insert one in the DB (like seed)
    db = get_database()
    from app.utils.security import get_password_hash
    from datetime import datetime, timezone
    admin_doc = {
        "full_name": "System Admin Test",
        "email": "admintest@example.com",
        "password_hash": get_password_hash("AdminPass123!"),
        "role": "admin",
        "phone": "+10000000009",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.users.delete_many({"email": admin_doc["email"]})
    await db.users.insert_one(admin_doc)
    
    resp = await client.post("/api/auth/login", json={
        "email": admin_doc["email"],
        "password": "AdminPass123!"
    })
    return resp.json()["access_token"]


async def test_get_default_rules(client: AsyncClient):
    token = await register_and_login_patient(client, "patient_rules@example.com")
    resp = await client.get("/api/rules", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "thresholds" in data
    assert "weights" in data
    assert "urgent_keywords" in data
    assert data["thresholds"]["critical"] == 70


async def test_admin_update_rules_success(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    
    new_rules = {
        "thresholds": {
            "critical": 80,
            "high": 60,
            "medium": 40
        },
        "weights": {
            "severity_multiplier": 5.0,
            "duration": {
                "acute_days": 2,
                "acute_points": 20,
                "sub_acute_days": 5,
                "sub_acute_points": 12,
                "chronic_points": 4
            },
            "age_65_or_above": 15,
            "chronic_condition_present": 12,
            "pregnancy": 12,
            "urgent_keywords": 20
        },
        "urgent_keywords": ["stroke", "chest pain"]
    }
    
    resp = await client.put("/api/rules", json=new_rules, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["thresholds"]["critical"] == 80
    assert data["weights"]["severity_multiplier"] == 5.0
    assert data["urgent_keywords"] == ["stroke", "chest pain"]


async def test_patient_cannot_update_rules(client: AsyncClient):
    patient_token = await register_and_login_patient(client, "p_no_rules_edit@example.com")
    
    new_rules = {
        "thresholds": {"critical": 80, "high": 60, "medium": 40},
        "weights": {
            "severity_multiplier": 5.0,
            "duration": {
                "acute_days": 2, "acute_points": 20,
                "sub_acute_days": 5, "sub_acute_points": 12,
                "chronic_points": 4
            },
            "age_65_or_above": 15,
            "chronic_condition_present": 12,
            "pregnancy": 12,
            "urgent_keywords": 20
        },
        "urgent_keywords": ["stroke"]
    }
    
    resp = await client.put("/api/rules", json=new_rules, headers={"Authorization": f"Bearer {patient_token}"})
    assert resp.status_code == 403


async def test_rule_changes_affect_scoring(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    patient_token = await register_and_login_patient(client, "patient_triage_flow@example.com")
    await create_patient_profile(client, patient_token)
    dept_id = await get_department_id(client)

    # 1. Booking before rules edit (Default rules match: chest pain is keyword worth 15 points)
    # Severity 8 -> 8 * 4 = 32 points. Chronic (Diabetes) -> 10 points. Keyword (chest pain) -> 15 points. Duration 2 days -> sub_acute -> 10 points.
    # Total = 32 + 10 + 15 + 10 = 67. Under default thresholds (Critical >= 70, High >= 50), 67 is High priority.
    resp1 = await client.post("/api/appointments/request", json={
        "department_id": dept_id,
        "symptoms": "Having severe chest pain for the last two days",
        "symptom_duration_days": 2,
        "severity": 8,
        "preferred_date": "2027-01-15",
        "preferred_time_slot": "morning"
    }, headers={"Authorization": f"Bearer {patient_token}"})
    assert resp1.status_code == 201
    data1 = resp1.json()
    assert data1["priority_level"] == "High"
    assert "urgent symptom keyword match" in data1["priority_explanation"]

    # 2. Admin edits rules (increase severity multiplier to 5.0, increase urgent keyword weight to 20, critical threshold to 80, high threshold to 60)
    # New calculation: Severity 8 -> 8 * 5 = 40 points. Chronic -> 10 points. Keyword -> 20 points. Duration 2 days -> sub_acute -> 10 points.
    # Total = 40 + 10 + 20 + 10 = 80. Under new thresholds (Critical >= 80), 80 is Critical priority.
    new_rules = {
        "thresholds": {"critical": 80, "high": 60, "medium": 40},
        "weights": {
            "severity_multiplier": 5.0,
            "duration": {
                "acute_days": 1, "acute_points": 15,
                "sub_acute_days": 7, "sub_acute_points": 10,
                "chronic_points": 5
            },
            "age_65_or_above": 10,
            "chronic_condition_present": 10,
            "pregnancy": 10,
            "urgent_keywords": 20
        },
        "urgent_keywords": ["chest pain", "stroke"]
    }
    await client.put("/api/rules", json=new_rules, headers={"Authorization": f"Bearer {admin_token}"})

    # 3. Book after rules change
    resp2 = await client.post("/api/appointments/request", json={
        "department_id": dept_id,
        "symptoms": "Having severe chest pain for the last two days",
        "symptom_duration_days": 2,
        "severity": 8,
        "preferred_date": "2027-01-15",
        "preferred_time_slot": "morning"
    }, headers={"Authorization": f"Bearer {patient_token}"})
    assert resp2.status_code == 201
    data2 = resp2.json()
    assert data2["priority_level"] == "Critical"
    assert data2["priority_score"] == 80
    assert "Critical priority because of" in data2["priority_explanation"]
