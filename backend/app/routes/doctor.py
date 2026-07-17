from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId

from app.database import get_database
from app.routes.auth import get_current_user, require_roles
from app.models.appointment import (
    AppointmentRequestResponse,
    appointment_helper
)
from app.models.appointment_notes import (
    AppointmentNoteCreate,
    AppointmentNoteResponse,
    note_helper
)

router = APIRouter(prefix="/doctor", tags=["Doctor Management"])

async def verify_doctor_or_admin_access(request_id: str, current_user: dict, db) -> dict:
    """
    Verifies that the request exists and the user is either:
    1. An Admin (unrestricted).
    2. A Doctor assigned to the same department as the request.
    Returns the appointment request document.
    """
    try:
        req_doc = await db.appointment_requests.find_one({"_id": ObjectId(request_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request ID format")

    if not req_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment request not found")

    if current_user["role"] == "admin":
        return req_doc

    if current_user["role"] == "doctor":
        doc_profile = await db.doctors.find_one({"user_id": current_user["_id"], "is_active": True})
        if not doc_profile or doc_profile.get("department_id") != req_doc.get("department_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view or manage appointments outside your department."
            )
        return req_doc

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


@router.get("/queue", response_model=List[AppointmentRequestResponse])
async def get_clinical_queue(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    preferred_date_filter: Optional[str] = Query(None, alias="date"),
    dept_filter: Optional[str] = Query(None, alias="department_id"),
    current_user: dict = require_roles(["doctor", "admin"])
):
    """
    Retrieve clinical triage queue.
    Doctors are locked to requests from their department.
    Admins can query across all departments.
    Sorting: highest priority score first, then oldest request (FIFO).
    """
    db = get_database()
    query = {}

    # Department scope enforcement
    if current_user["role"] == "doctor":
        doc_profile = await db.doctors.find_one({"user_id": current_user["_id"], "is_active": True})
        if not doc_profile:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor profile not active or found.")
        query["department_id"] = doc_profile["department_id"]
    elif current_user["role"] == "admin" and dept_filter:
        try:
            query["department_id"] = ObjectId(dept_filter)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department_id query format.")

    # Status filter
    if status_filter:
        query["status"] = status_filter

    # Priority level filter
    if priority_filter:
        query["priority_level"] = priority_filter

    # Preferred date filter (format: YYYY-MM-DD)
    if preferred_date_filter:
        try:
            dt = datetime.strptime(preferred_date_filter, "%Y-%m-%d")
            query["preferred_date"] = dt
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD.")

    # Execute search with compound sorting: priority_score DESC, created_at ASC
    cursor = db.appointment_requests.find(query).sort([
        ("priority_score", -1),
        ("created_at", 1)
    ])

    results = []
    async for doc in cursor:
        dept = await db.departments.find_one({"_id": doc.get("department_id")})
        dept_name = dept["name"] if dept else "Unknown"

        doctor_name = None
        if doc.get("assigned_doctor_id"):
            doc_user = await db.users.find_one({"_id": doc["assigned_doctor_id"]})
            if doc_user:
                doctor_name = doc_user.get("full_name")

        results.append(appointment_helper(doc, dept_name=dept_name, doctor_name=doctor_name))

    return results


@router.get("/appointments/{request_id}", response_model=dict)
async def get_appointment_clinical_details(
    request_id: str,
    current_user: dict = require_roles(["doctor", "admin"])
):
    """
    Retrieve clinical view of request, joining detailed patient profile data.
    """
    db = get_database()
    req_doc = await verify_doctor_or_admin_access(request_id, current_user, db)

    # Fetch patient profile
    patient_profile = await db.patient_profiles.find_one({"user_id": req_doc["patient_id"]})
    
    # Fetch patient user details (email, full name, phone)
    patient_user = await db.users.find_one({"_id": req_doc["patient_id"]})
    
    # Fetch department
    dept = await db.departments.find_one({"_id": req_doc.get("department_id")})
    dept_name = dept["name"] if dept else "Unknown"

    doctor_name = None
    if req_doc.get("assigned_doctor_id"):
        doc_user = await db.users.find_one({"_id": req_doc["assigned_doctor_id"]})
        if doc_user:
            doctor_name = doc_user.get("full_name")

    serialized_request = appointment_helper(req_doc, dept_name=dept_name, doctor_name=doctor_name)

    patient_summary = {}
    if patient_user:
        patient_summary.update({
            "full_name": patient_user["full_name"],
            "email": patient_user["email"],
            "phone": patient_user["phone"],
        })
    if patient_profile:
        patient_summary.update({
            "date_of_birth": patient_profile.get("date_of_birth"),
            "gender": patient_profile.get("gender"),
            "address": patient_profile.get("address"),
            "emergency_contact": patient_profile.get("emergency_contact"),
            "blood_group": patient_profile.get("blood_group"),
            "chronic_conditions": patient_profile.get("chronic_conditions", []),
            "allergies": patient_profile.get("allergies", []),
            "is_pregnant": patient_profile.get("is_pregnant"),
        })

    return {
        "request": serialized_request,
        "patient_profile": patient_summary
    }


@router.put("/appointments/{request_id}/schedule", response_model=AppointmentRequestResponse)
async def schedule_appointment_datetime(
    request_id: str,
    appointment_time: str = Query(..., alias="appointment_datetime"),
    status_change: str = Query("assigned", alias="status"),
    current_user: dict = require_roles(["doctor", "admin"])
):
    """
    Schedule an appointment date/time and transition status (assigned or confirmed).
    """
    db = get_database()
    req_doc = await verify_doctor_or_admin_access(request_id, current_user, db)

    # Validate target status
    if status_change not in ("assigned", "confirmed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'assigned' or 'confirmed' during scheduling."
        )

    # Parse ISO datetime
    try:
        sched_dt = datetime.fromisoformat(appointment_time.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ISO datetime format.")

    # Determine doctor assignment
    assigned_doctor_id = current_user["_id"]
    if current_user["role"] == "admin":
        # Fallback to department doctor or leave as admin if no specific doctor chosen
        doc_in_dept = await db.doctors.find_one({"department_id": req_doc["department_id"], "is_active": True})
        if doc_in_dept:
            assigned_doctor_id = doc_in_dept["user_id"]

    now = datetime.now(timezone.utc)
    await db.appointment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$set": {
                "appointment_datetime": sched_dt,
                "assigned_doctor_id": assigned_doctor_id,
                "status": status_change,
                "updated_at": now
            }
        }
    )

    updated_doc = await db.appointment_requests.find_one({"_id": ObjectId(request_id)})
    dept = await db.departments.find_one({"_id": updated_doc.get("department_id")})
    dept_name = dept["name"] if dept else "Unknown"
    
    doc_user = await db.users.find_one({"_id": assigned_doctor_id})
    doctor_name = doc_user.get("full_name") if doc_user else "Unknown Staff"

    return appointment_helper(updated_doc, dept_name=dept_name, doctor_name=doctor_name)


@router.put("/appointments/{request_id}/status", response_model=AppointmentRequestResponse)
async def update_appointment_status(
    request_id: str,
    status_change: str = Query(..., alias="status"),
    current_user: dict = require_roles(["doctor", "admin"])
):
    """
    Transition request status.
    """
    db = get_database()
    req_doc = await verify_doctor_or_admin_access(request_id, current_user, db)

    if status_change not in ("pending", "assigned", "confirmed", "completed", "cancelled"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment status.")

    now = datetime.now(timezone.utc)
    await db.appointment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$set": {
                "status": status_change,
                "updated_at": now
            }
        }
    )

    updated_doc = await db.appointment_requests.find_one({"_id": ObjectId(request_id)})
    dept = await db.departments.find_one({"_id": updated_doc.get("department_id")})
    dept_name = dept["name"] if dept else "Unknown"

    doctor_name = None
    if updated_doc.get("assigned_doctor_id"):
        doc_user = await db.users.find_one({"_id": updated_doc["assigned_doctor_id"]})
        if doc_user:
            doctor_name = doc_user.get("full_name")

    return appointment_helper(updated_doc, dept_name=dept_name, doctor_name=doctor_name)


@router.post("/appointments/{request_id}/notes", response_model=AppointmentNoteResponse)
async def add_clinical_note(
    request_id: str,
    note_in: AppointmentNoteCreate,
    current_user: dict = require_roles(["doctor", "admin"])
):
    """
    Add internal clinical notes. Guarded from patient roles.
    """
    db = get_database()
    req_doc = await verify_doctor_or_admin_access(request_id, current_user, db)

    now = datetime.now(timezone.utc)
    note_doc = {
        "appointment_request_id": ObjectId(request_id),
        "author_id": current_user["_id"],
        "note": note_in.note,
        "created_at": now
    }

    result = await db.appointment_notes.insert_one(note_doc)
    note_doc["_id"] = result.inserted_id

    return note_helper(note_doc, author_name=current_user["full_name"])


@router.get("/appointments/{request_id}/notes", response_model=List[AppointmentNoteResponse])
async def list_clinical_notes(
    request_id: str,
    current_user: dict = require_roles(["doctor", "admin"])
):
    """
    Retrieve clinical notes history. Restricted to doctors/admins only.
    """
    db = get_database()
    await verify_doctor_or_admin_access(request_id, current_user, db)

    cursor = db.appointment_notes.find({"appointment_request_id": ObjectId(request_id)}).sort("created_at", 1)
    
    results = []
    async for doc in cursor:
        author = await db.users.find_one({"_id": doc["author_id"]})
        author_name = author.get("full_name", "Unknown Staff") if author else "Unknown Staff"
        results.append(note_helper(doc, author_name=author_name))

    return results
