from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId

from app.database import get_database
from app.routes.auth import get_current_user, require_roles
from app.models.appointment import (
    AppointmentRequestCreate,
    AppointmentRequestResponse,
    AppointmentListItem,
    appointment_helper,
    appointment_list_helper,
)
from app.services.priority import PriorityService

router = APIRouter(prefix="/appointments", tags=["Appointment Requests"])


@router.post("/request", response_model=AppointmentRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment_request(
    req_in: AppointmentRequestCreate,
    current_user: dict = require_roles(["patient"]),
):
    db = get_database()
    patient_id = current_user["_id"]

    # Validate department exists
    try:
        dept_doc = await db.departments.find_one({"_id": ObjectId(req_in.department_id), "is_active": True})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department ID format")

    if not dept_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found or inactive")

    # Fetch patient profile for triage calculation
    profile = await db.patient_profiles.find_one({"user_id": patient_id})
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your patient profile before submitting an appointment request.",
        )

    # Get active rules
    rules = await PriorityService.get_active_rules(db)

    # Calculate priority score, level, explanation
    triage = PriorityService.calculate_priority(
        severity=req_in.severity,
        symptom_duration_days=req_in.symptom_duration_days,
        symptoms=req_in.symptoms,
        patient_dob=profile.get("date_of_birth"),
        chronic_conditions=profile.get("chronic_conditions", []),
        is_pregnant=profile.get("is_pregnant", False) or False,
        rules=rules,
    )

    now = datetime.now(timezone.utc)
    doc = {
        "patient_id": patient_id,
        "department_id": ObjectId(req_in.department_id),
        "symptoms": req_in.symptoms,
        "symptom_duration_days": req_in.symptom_duration_days,
        "severity": req_in.severity,
        "preferred_date": datetime.combine(req_in.preferred_date, datetime.min.time()),
        "preferred_time_slot": req_in.preferred_time_slot,
        "priority_score": triage["priority_score"],
        "priority_level": triage["priority_level"],
        "priority_explanation": triage["priority_explanation"],
        "score_breakdown": triage["score_breakdown"],
        "status": "pending",
        "assigned_doctor_id": None,
        "appointment_datetime": None,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.appointment_requests.insert_one(doc)
    doc["_id"] = result.inserted_id

    return appointment_helper(doc, dept_name=dept_doc["name"])


@router.get("/my", response_model=List[AppointmentListItem])
async def get_my_appointments(
    status_filter: str = Query(None, alias="status"),
    current_user: dict = require_roles(["patient"]),
):
    db = get_database()
    query = {"patient_id": current_user["_id"]}
    if status_filter:
        query["status"] = status_filter

    cursor = db.appointment_requests.find(query).sort("created_at", -1)
    results = []
    async for doc in cursor:
        # Fetch department name
        dept = await db.departments.find_one({"_id": doc.get("department_id")})
        dept_name = dept["name"] if dept else "Unknown"
        results.append(appointment_list_helper(doc, dept_name=dept_name))

    return results


@router.get("/{request_id}", response_model=AppointmentRequestResponse)
async def get_appointment_detail(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()

    try:
        doc = await db.appointment_requests.find_one({"_id": ObjectId(request_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request ID format")

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment request not found")

    # Patients can only view their own requests
    if current_user["role"] == "patient" and doc["patient_id"] != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own requests")

    # Fetch department name
    dept = await db.departments.find_one({"_id": doc.get("department_id")})
    dept_name = dept["name"] if dept else "Unknown"

    # Fetch assigned doctor name if present
    doctor_name = None
    if doc.get("assigned_doctor_id"):
        doctor_user = await db.users.find_one({"_id": doc["assigned_doctor_id"]})
        if doctor_user:
            doctor_name = doctor_user.get("full_name")

    return appointment_helper(doc, dept_name=dept_name, doctor_name=doctor_name)


@router.put("/{request_id}/cancel")
async def cancel_appointment(
    request_id: str,
    current_user: dict = require_roles(["patient"]),
):
    db = get_database()

    try:
        doc = await db.appointment_requests.find_one({"_id": ObjectId(request_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request ID format")

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment request not found")

    # Patient can only cancel their own requests
    if doc["patient_id"] != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel your own requests")

    # Only pending or assigned requests can be cancelled
    if doc["status"] not in ("pending", "assigned"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel request with status '{doc['status']}'. Only pending or assigned requests can be cancelled.",
        )

    await db.appointment_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}},
    )

    return {"success": True, "message": "Appointment request cancelled successfully."}
