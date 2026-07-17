import pytest
from httpx import AsyncClient
from app.utils.security import get_password_hash
from app.database import get_database
from bson import ObjectId
from datetime import datetime, timezone

pytestmark = pytest.mark.anyio

# ─── Helpers ────────────────────────────────────────────────────────────────────

async def register_and_login_patient(client: AsyncClient, email="patient_appt@example.com"):
    """Register a patient and return their JWT token."""
    await client.post("/api/auth/register", json={
        "full_name": "Appt Patient",
        "email": email,
        "password": "SecurePassword123!",
        "phone": "1234567890",
    })
    resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "SecurePassword123!",
    })
    return resp.json()["access_token"]


async def create_patient_profile(client: AsyncClient, token: str):
    """Create a patient profile and return the response."""
    return await client.post("/api/patient/profile", json={
        "date_of_birth": "1990-05-15",
        "gender": "male",
        "address": "123 Test Street, City",
        "emergency_contact": "Jane Doe +9876543210",
        "blood_group": "O+",
        "chronic_conditions": ["Diabetes"],
        "allergies": ["Penicillin"],
        "is_pregnant": False,
    }, headers={"Authorization": f"Bearer {token}"})


async def get_department_id(client: AsyncClient) -> str:
    """Fetch the first active department ID."""
    resp = await client.get("/api/departments")
    departments = resp.json()
    if not departments:
        # Seed a department directly
        db = get_database()
        result = await db.departments.insert_one({
            "name": "General Medicine",
            "description": "General medical consultations.",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
        })
        return str(result.inserted_id)
    return departments[0]["id"]


# ─── Profile Tests ──────────────────────────────────────────────────────────────

async def test_create_patient_profile(client: AsyncClient):
    token = await register_and_login_patient(client, "profile_create@example.com")
    resp = await create_patient_profile(client, token)
    assert resp.status_code == 201
    data = resp.json()
    assert data["gender"] == "male"
    assert data["blood_group"] == "O+"
    assert "Diabetes" in data["chronic_conditions"]


async def test_get_patient_profile(client: AsyncClient):
    token = await register_and_login_patient(client, "profile_get@example.com")
    await create_patient_profile(client, token)
    resp = await client.get("/api/patient/profile", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["gender"] == "male"


async def test_update_patient_profile(client: AsyncClient):
    token = await register_and_login_patient(client, "profile_update@example.com")
    await create_patient_profile(client, token)
    resp = await client.put("/api/patient/profile", json={
        "blood_group": "A+",
        "allergies": ["Penicillin", "Sulfa"],
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["blood_group"] == "A+"
    assert len(resp.json()["allergies"]) == 2


async def test_duplicate_profile_creation_fails(client: AsyncClient):
    token = await register_and_login_patient(client, "profile_dup@example.com")
    await create_patient_profile(client, token)
    resp = await create_patient_profile(client, token)
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]


# ─── Appointment Request Tests ──────────────────────────────────────────────────

async def test_create_appointment_request(client: AsyncClient):
    token = await register_and_login_patient(client, "appt_create@example.com")
    await create_patient_profile(client, token)
    dept_id = await get_department_id(client)

    resp = await client.post("/api/appointments/request", json={
        "department_id": dept_id,
        "symptoms": "Persistent headache and dizziness for the past two days",
        "symptom_duration_days": 2,
        "severity": 6,
        "preferred_date": "2027-01-15",
        "preferred_time_slot": "morning",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert data["priority_score"] is not None
    assert data["priority_level"] in ["Critical", "High", "Medium", "Low"]
    assert data["score_breakdown"] is not None


async def test_create_appointment_without_profile_fails(client: AsyncClient):
    token = await register_and_login_patient(client, "appt_noprofile@example.com")
    dept_id = await get_department_id(client)

    resp = await client.post("/api/appointments/request", json={
        "department_id": dept_id,
        "symptoms": "Cough and cold for the past week",
        "symptom_duration_days": 7,
        "severity": 3,
        "preferred_date": "2027-01-15",
        "preferred_time_slot": "afternoon",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "profile" in resp.json()["detail"].lower()


async def test_list_my_appointments(client: AsyncClient):
    token = await register_and_login_patient(client, "appt_list@example.com")
    await create_patient_profile(client, token)
    dept_id = await get_department_id(client)

    # Create two requests
    for i in range(2):
        await client.post("/api/appointments/request", json={
            "department_id": dept_id,
            "symptoms": f"Test symptom description number {i + 1} with sufficient length",
            "symptom_duration_days": i + 1,
            "severity": 5,
            "preferred_date": "2027-02-01",
            "preferred_time_slot": "morning",
        }, headers={"Authorization": f"Bearer {token}"})

    resp = await client.get("/api/appointments/my", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_cancel_appointment(client: AsyncClient):
    token = await register_and_login_patient(client, "appt_cancel@example.com")
    await create_patient_profile(client, token)
    dept_id = await get_department_id(client)

    create_resp = await client.post("/api/appointments/request", json={
        "department_id": dept_id,
        "symptoms": "Mild skin irritation and rashes over the past few days",
        "symptom_duration_days": 3,
        "severity": 4,
        "preferred_date": "2027-03-01",
        "preferred_time_slot": "evening",
    }, headers={"Authorization": f"Bearer {token}"})
    req_id = create_resp.json()["id"]

    cancel_resp = await client.put(f"/api/appointments/{req_id}/cancel",
                                   headers={"Authorization": f"Bearer {token}"})
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["success"] is True

    # Verify status changed
    detail_resp = await client.get(f"/api/appointments/{req_id}",
                                   headers={"Authorization": f"Bearer {token}"})
    assert detail_resp.json()["status"] == "cancelled"


async def test_cannot_cancel_other_patients_request(client: AsyncClient):
    token1 = await register_and_login_patient(client, "appt_owner@example.com")
    await create_patient_profile(client, token1)
    dept_id = await get_department_id(client)

    create_resp = await client.post("/api/appointments/request", json={
        "department_id": dept_id,
        "symptoms": "Some symptom description that is long enough for validation",
        "symptom_duration_days": 1,
        "severity": 5,
        "preferred_date": "2027-04-01",
        "preferred_time_slot": "morning",
    }, headers={"Authorization": f"Bearer {token1}"})
    req_id = create_resp.json()["id"]

    # Second patient tries to cancel
    token2 = await register_and_login_patient(client, "appt_other@example.com")
    cancel_resp = await client.put(f"/api/appointments/{req_id}/cancel",
                                   headers={"Authorization": f"Bearer {token2}"})
    assert cancel_resp.status_code == 403
