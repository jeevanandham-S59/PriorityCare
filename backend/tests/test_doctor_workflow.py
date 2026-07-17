import pytest
from httpx import AsyncClient
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from app.database import get_database
from app.utils.security import get_password_hash
from tests.test_appointments import register_and_login_patient, create_patient_profile, get_department_id

pytestmark = pytest.mark.anyio

async def create_department(name: str) -> ObjectId:
    db = get_database()
    doc = {"name": name, "description": f"{name} clinic", "is_active": True}
    result = await db.departments.insert_one(doc)
    return result.inserted_id

async def create_doctor_account(client: AsyncClient, email: str, name: str, dept_id: ObjectId) -> str:
    db = get_database()
    # Create doctor user
    user_doc = {
        "full_name": name,
        "email": email,
        "password_hash": get_password_hash("DoctorPass123!"),
        "role": "doctor",
        "phone": "+19999999999",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    user_res = await db.users.insert_one(user_doc)
    
    # Create doctor profile linking user and department
    doc_profile = {
        "user_id": user_res.inserted_id,
        "department_id": dept_id,
        "specialization": "Specialist",
        "bio": "Bio detail",
        "schedule_slots": ["morning", "afternoon"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.doctors.insert_one(doc_profile)

    # Login to get token
    resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "DoctorPass123!"
    })
    return resp.json()["access_token"]


async def test_doctor_queue_filtering_and_sorting(client: AsyncClient):
    # Setup two departments: Cardiology and Pediatrics
    cardio_id = await create_department("Cardiology")
    peds_id = await create_department("Pediatrics")

    # Setup doctor in Cardiology
    cardio_token = await create_doctor_account(client, "cardio@example.com", "Dr. Heart", cardio_id)

    # Setup patient & profile
    patient_token = await register_and_login_patient(client, "patient_queue@example.com")
    await create_patient_profile(client, patient_token)

    db = get_database()

    # Create 3 Cardiology requests with different scores and times
    # Cardio 1: Priority score 40, created 10 minutes ago
    # Cardio 2: Priority score 80 (highest), created 5 minutes ago
    # Cardio 3: Priority score 40, created 2 minutes ago
    now = datetime.now(timezone.utc)
    pref_date_cardio = datetime.combine((now + timedelta(days=2)).date(), datetime.min.time())
    pref_date_peds = datetime.combine((now + timedelta(days=3)).date(), datetime.min.time())
    
    doc1 = {
        "patient_id": ObjectId(),
        "department_id": cardio_id,
        "symptoms": "Moderate pain symptoms",
        "symptom_duration_days": 3,
        "severity": 5,
        "preferred_date": pref_date_cardio,
        "preferred_time_slot": "morning",
        "priority_score": 40,
        "priority_level": "Medium",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now - timedelta(minutes=10),
        "updated_at": now - timedelta(minutes=10)
    }
    doc2 = {
        "patient_id": ObjectId(),
        "department_id": cardio_id,
        "symptoms": "Critical chest pain symptoms",
        "symptom_duration_days": 1,
        "severity": 9,
        "preferred_date": pref_date_cardio,
        "preferred_time_slot": "morning",
        "priority_score": 80,
        "priority_level": "Critical",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now - timedelta(minutes=5),
        "updated_at": now - timedelta(minutes=5)
    }
    doc3 = {
        "patient_id": ObjectId(),
        "department_id": cardio_id,
        "symptoms": "Slight discomfort symptoms",
        "symptom_duration_days": 10,
        "severity": 4,
        "preferred_date": pref_date_cardio,
        "preferred_time_slot": "morning",
        "priority_score": 40,
        "priority_level": "Medium",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now - timedelta(minutes=2),
        "updated_at": now - timedelta(minutes=2)
    }

    # Pediatrics request
    doc_peds = {
        "patient_id": ObjectId(),
        "department_id": peds_id,
        "symptoms": "Kid fever symptoms",
        "symptom_duration_days": 2,
        "severity": 6,
        "preferred_date": pref_date_peds,
        "preferred_time_slot": "afternoon",
        "priority_score": 60,
        "priority_level": "High",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now - timedelta(minutes=1),
        "updated_at": now - timedelta(minutes=1)
    }

    await db.appointment_requests.insert_many([doc1, doc2, doc3, doc_peds])

    # Fetch queue as Cardiology doctor
    resp = await client.get("/api/doctor/queue", headers={"Authorization": f"Bearer {cardio_token}"})
    assert resp.status_code == 200
    queue = resp.json()

    # Assert queue size is 3 (Pediatrics request is filtered out)
    assert len(queue) == 3

    # Assert sorting order:
    # 1st must be doc2 (score 80)
    # 2nd must be doc1 (score 40, created 10 mins ago - older than doc3)
    # 3rd must be doc3 (score 40, created 2 mins ago)
    assert queue[0]["priority_score"] == 80
    assert queue[1]["priority_score"] == 40
    assert queue[1]["id"] == str(doc1["_id"])
    assert queue[2]["id"] == str(doc3["_id"])


async def test_doctor_department_isolation(client: AsyncClient):
    cardio_id = await create_department("Cardiology")
    peds_id = await create_department("Pediatrics")

    cardio_token = await create_doctor_account(client, "cardio_iso@example.com", "Dr. Heart", cardio_id)
    peds_token = await create_doctor_account(client, "peds_iso@example.com", "Dr. Child", peds_id)

    db = get_database()
    now = datetime.now(timezone.utc)
    pref_date = datetime.combine((now + timedelta(days=3)).date(), datetime.min.time())
    peds_req = {
        "patient_id": ObjectId(),
        "department_id": peds_id,
        "symptoms": "Kid clinic symptoms detail",
        "symptom_duration_days": 2,
        "severity": 5,
        "preferred_date": pref_date,
        "preferred_time_slot": "afternoon",
        "priority_score": 50,
        "priority_level": "High",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now,
        "updated_at": now
    }
    res = await db.appointment_requests.insert_one(peds_req)
    req_id = str(res.inserted_id)

    # Cardio doctor tries to view Pediatrics request details -> should get 403 Forbidden
    resp1 = await client.get(f"/api/doctor/appointments/{req_id}", headers={"Authorization": f"Bearer {cardio_token}"})
    assert resp1.status_code == 403

    # Peds doctor can view successfully -> 200 OK
    resp2 = await client.get(f"/api/doctor/appointments/{req_id}", headers={"Authorization": f"Bearer {peds_token}"})
    assert resp2.status_code == 200
    assert resp2.json()["request"]["id"] == req_id


async def test_notes_read_barrier(client: AsyncClient):
    cardio_id = await create_department("Cardiology")
    cardio_token = await create_doctor_account(client, "cardio_notes@example.com", "Dr. Heart", cardio_id)
    patient_token = await register_and_login_patient(client, "patient_notes@example.com")
    await create_patient_profile(client, patient_token)

    db = get_database()
    now = datetime.now(timezone.utc)
    pref_date = datetime.combine((now + timedelta(days=3)).date(), datetime.min.time())
    req = {
        "patient_id": ObjectId(),
        "department_id": cardio_id,
        "symptoms": "Heart palpitations and panic",
        "symptom_duration_days": 1,
        "severity": 7,
        "preferred_date": pref_date,
        "preferred_time_slot": "morning",
        "priority_score": 60,
        "priority_level": "High",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now,
        "updated_at": now
    }
    res = await db.appointment_requests.insert_one(req)
    req_id = str(res.inserted_id)

    # Doctor adds a clinical note -> 200 OK
    resp_note = await client.post(
        f"/api/doctor/appointments/{req_id}/notes",
        json={"note": "Patient seems to have sinus tachycardia."},
        headers={"Authorization": f"Bearer {cardio_token}"}
    )
    assert resp_note.status_code == 200
    assert resp_note.json()["note"] == "Patient seems to have sinus tachycardia."

    # Doctor reads clinical notes -> 200 OK
    resp_doctor_view = await client.get(
        f"/api/doctor/appointments/{req_id}/notes",
        headers={"Authorization": f"Bearer {cardio_token}"}
    )
    assert resp_doctor_view.status_code == 200
    assert len(resp_doctor_view.json()) == 1

    # Patient tries to read notes -> 403 Forbidden
    resp_patient_view = await client.get(
        f"/api/doctor/appointments/{req_id}/notes",
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    assert resp_patient_view.status_code == 403

    # Patient tries to add notes -> 403 Forbidden
    resp_patient_add = await client.post(
        f"/api/doctor/appointments/{req_id}/notes",
        json={"note": "Unauthorized patient note attempt"},
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    assert resp_patient_add.status_code == 403


async def test_schedule_and_status_transitions(client: AsyncClient):
    cardio_id = await create_department("Cardiology")
    cardio_token = await create_doctor_account(client, "cardio_schedule@example.com", "Dr. Heart", cardio_id)

    db = get_database()
    now = datetime.now(timezone.utc)
    pref_date = datetime.combine((now + timedelta(days=2)).date(), datetime.min.time())
    req = {
        "patient_id": ObjectId(),
        "department_id": cardio_id,
        "symptoms": "High blood pressure records",
        "symptom_duration_days": 10,
        "severity": 6,
        "preferred_date": pref_date,
        "preferred_time_slot": "afternoon",
        "priority_score": 50,
        "priority_level": "High",
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now,
        "updated_at": now
    }
    res = await db.appointment_requests.insert_one(req)
    req_id = str(res.inserted_id)

    # 1. Schedule date & time
    appt_time = "2027-02-10T10:30:00"
    resp_sched = await client.put(
        f"/api/doctor/appointments/{req_id}/schedule?appointment_datetime={appt_time}&status=assigned",
        headers={"Authorization": f"Bearer {cardio_token}"}
    )
    assert resp_sched.status_code == 200
    data = resp_sched.json()
    assert data["status"] == "assigned"
    assert data["appointment_datetime"] is not None
    assert data["assigned_doctor_name"] == "Dr. Heart"

    # 2. Transition status to completed
    resp_status = await client.put(
        f"/api/doctor/appointments/{req_id}/status?status=completed",
        headers={"Authorization": f"Bearer {cardio_token}"}
    )
    assert resp_status.status_code == 200
    assert resp_status.json()["status"] == "completed"
