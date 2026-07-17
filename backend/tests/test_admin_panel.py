import pytest
from httpx import AsyncClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from app.database import get_database
from tests.test_appointments import register_and_login_patient, create_patient_profile, get_department_id
from tests.test_priority_rules import register_and_login_admin

pytestmark = pytest.mark.anyio

async def create_mock_appointment(db, dept_id: ObjectId) -> ObjectId:
    now = datetime.now(timezone.utc)
    pref_date = datetime.combine((now + timedelta(days=2)).date(), datetime.min.time())
    doc = {
        "patient_id": ObjectId(),
        "department_id": dept_id,
        "symptoms": "Tension headaches and dizziness",
        "symptom_duration_days": 4,
        "severity": 6,
        "preferred_date": pref_date,
        "preferred_time_slot": "afternoon",
        "priority_score": 48,
        "priority_level": "Medium",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now,
        "updated_at": now
    }
    result = await db.appointment_requests.insert_one(doc)
    return result.inserted_id


async def test_admin_dashboard_stats(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    db = get_database()

    # Create dummy department & request to check counts
    dept_id = ObjectId()
    await db.departments.insert_one({"_id": dept_id, "name": "General Clinic", "is_active": True})
    await create_mock_appointment(db, dept_id)

    resp = await client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "cards" in data
    assert "charts" in data
    assert data["cards"]["total_requests"] >= 1
    assert len(data["charts"]["priority"]) == 4


async def test_department_crud_and_logging(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    db = get_database()

    # 1. Create department
    resp_create = await client.post(
        "/api/admin/departments",
        json={"name": "Neurology", "description": "Brain and nerves clinic"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp_create.status_code == 201
    dept = resp_create.json()
    assert dept["name"] == "Neurology"
    dept_id = dept["id"]

    # Check audit logs for creation
    log = await db.audit_logs.find_one({"action": "create_department", "entity_id": ObjectId(dept_id)})
    assert log is not None
    assert log["new_value"]["name"] == "Neurology"

    # 2. Update department (Deactivate)
    resp_update = await client.put(
        f"/api/admin/departments/{dept_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp_update.status_code == 200
    assert resp_update.json()["is_active"] is False

    # Check audit logs for deactivation
    log_upd = await db.audit_logs.find_one({"action": "update_department", "entity_id": ObjectId(dept_id)})
    assert log_upd is not None
    assert log_upd["previous_value"]["is_active"] is True
    assert log_upd["new_value"]["is_active"] is False


async def test_doctor_crud_and_logging(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    db = get_database()

    # Setup department first
    res_dept = await db.departments.insert_one({"name": "Cardiology", "is_active": True})
    dept_id = str(res_dept.inserted_id)

    # 1. Create doctor
    doc_payload = {
        "full_name": "Dr. Cardio Specialist",
        "email": "cardiospec@example.com",
        "phone": "+19876543210",
        "password": "SecurePassword123!",
        "department_id": dept_id,
        "specialization": "Cardiologist"
    }
    resp_create = await client.post(
        "/api/admin/doctors",
        json=doc_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp_create.status_code == 201
    doctor_id = resp_create.json()["id"]

    # Verify doctor profile exists
    doc_profile = await db.doctors.find_one({"user_id": ObjectId(doctor_id)})
    assert doc_profile is not None
    assert doc_profile["specialization"] == "Cardiologist"

    # Check creation audit log
    log = await db.audit_logs.find_one({"action": "create_doctor", "entity_id": ObjectId(doctor_id)})
    assert log is not None
    assert log["new_value"]["email"] == "cardiospec@example.com"

    # 2. Deactivate doctor
    resp_update = await client.put(
        f"/api/admin/doctors/{doctor_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp_update.status_code == 200

    user_doc = await db.users.find_one({"_id": ObjectId(doctor_id)})
    assert user_doc["is_active"] is False

    # Check deactivation audit log
    log_upd = await db.audit_logs.find_one({"action": "update_doctor", "entity_id": ObjectId(doctor_id)})
    assert log_upd is not None
    assert log_upd["new_value"]["is_active"] is False


async def test_admin_priority_override_success(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    db = get_database()

    # Create dummy department & request
    dept_id = ObjectId()
    await db.departments.insert_one({"_id": dept_id, "name": "Dental Clinic", "is_active": True})
    req_id = await create_mock_appointment(db, dept_id)

    # Manual priority override with reason
    override_payload = {
        "priority_score": 85,
        "priority_level": "Critical",
        "reason": "Patient reported sudden swelling and acute pain under audit."
    }

    resp = await client.put(
        f"/api/admin/appointments/{str(req_id)}/override",
        json=override_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["priority_score"] == 85
    assert data["priority_level"] == "Critical"
    assert "Manual override" in data["priority_explanation"]

    # Verify audit log exists with reason
    log = await db.audit_logs.find_one({"action": "override_priority", "entity_id": req_id})
    assert log is not None
    assert log["reason"] == "Patient reported sudden swelling and acute pain under audit."
    assert log["previous_value"]["priority_score"] == 48


async def test_non_admin_blocked(client: AsyncClient):
    patient_token = await register_and_login_patient(client, "patient_admin_block@example.com")
    
    # Try fetching stats -> 403 Forbidden
    resp = await client.get("/api/admin/stats", headers={"Authorization": f"Bearer {patient_token}"})
    assert resp.status_code == 403


async def test_admin_list_appointments_pagination(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    db = get_database()

    dept_id = ObjectId()
    await db.departments.insert_one({"_id": dept_id, "name": "Oncology", "is_active": True})
    for i in range(3):
        await create_mock_appointment(db, dept_id)

    resp = await client.get(
        "/api/admin/appointments?page=1&limit=2",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "requests" in data
    assert len(data["requests"]) == 2
    assert data["total"] >= 3
    assert data["page"] == 1


async def test_priority_rules_update_audit_log(client: AsyncClient):
    admin_token = await register_and_login_admin(client)
    db = get_database()

    payload = {
        "thresholds": {"critical": 75, "high": 55, "medium": 35},
        "weights": {
            "severity_multiplier": 4.0,
            "duration": {
                "acute_days": 1, "acute_points": 15,
                "sub_acute_days": 7, "sub_acute_points": 10,
                "chronic_points": 5
            },
            "age_65_or_above": 10,
            "chronic_condition_present": 10,
            "pregnancy": 10,
            "urgent_keywords": 15
        },
        "urgent_keywords": ["chest pain", "bleeding"]
    }

    resp = await client.put(
        "/api/rules",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200

    log = await db.audit_logs.find_one({"action": "update_priority_rules"})
    assert log is not None
    assert log["new_value"]["thresholds"]["critical"] == 75
