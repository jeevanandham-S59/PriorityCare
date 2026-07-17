from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId

from app.database import get_database
from app.routes.auth import require_roles
from app.utils.security import get_password_hash
from app.services.audit import AuditService
from app.models.admin import (
    DepartmentCreate,
    DepartmentUpdate,
    DoctorCreate,
    DoctorUpdate,
    PriorityOverrideRequest,
    AuditLogResponse,
    audit_log_helper
)
from app.models.appointment import (
    AppointmentRequestResponse,
    appointment_helper
)

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.get("/stats")
async def get_admin_dashboard_stats(current_user: dict = require_roles(["admin"])):
    """
    Retrieve admin dashboard summary counters and distribution charts data.
    """
    db = get_database()

    # 1. Dashboard card counts
    total_requests = await db.appointment_requests.count_documents({})
    pending_requests = await db.appointment_requests.count_documents({"status": "pending"})
    critical_requests = await db.appointment_requests.count_documents({"priority_level": "Critical"})
    completed_appointments = await db.appointment_requests.count_documents({"status": "completed"})

    # 2. Priority Distribution Chart Data
    priorities = ["Critical", "High", "Medium", "Low"]
    priority_chart = []
    for p in priorities:
        count = await db.appointment_requests.count_documents({"priority_level": p})
        priority_chart.append({"name": p, "value": count})

    # 3. Status Distribution Chart Data
    statuses = ["pending", "assigned", "confirmed", "completed", "cancelled"]
    status_labels = {
        "pending": "Pending",
        "assigned": "Scheduled",
        "confirmed": "Confirmed",
        "completed": "Completed",
        "cancelled": "Cancelled"
    }
    status_chart = []
    for s in statuses:
        count = await db.appointment_requests.count_documents({"status": s})
        status_chart.append({"name": status_labels[s], "value": count})

    # 4. Department Distribution Chart Data
    dept_chart = []
    cursor = db.departments.find({"is_active": True})
    async for dept in cursor:
        count = await db.appointment_requests.count_documents({"department_id": dept["_id"]})
        dept_chart.append({"name": dept["name"], "value": count})

    # 5. Daily Request Trend (Last 7 Days)
    trend_chart = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        start_dt = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        
        count = await db.appointment_requests.count_documents({
            "created_at": {"$gte": start_dt, "$lte": end_dt}
        })
        trend_chart.append({
            "date": target_date.strftime("%b %d"),
            "count": count
        })

    return {
        "cards": {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "critical_requests": critical_requests,
            "completed_appointments": completed_appointments
        },
        "charts": {
            "priority": priority_chart,
            "status": status_chart,
            "department": dept_chart,
            "trend": trend_chart
        }
    }


@router.get("/appointments")
async def admin_list_appointments(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    current_user: dict = require_roles(["admin"])
):
    """
    List all appointment requests with pagination, search, and filters.
    """
    db = get_database()
    query = {}

    if status:
        query["status"] = status
    if priority:
        query["priority_level"] = priority
    if department_id:
        try:
            query["department_id"] = ObjectId(department_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department ID format.")

    if search and search.strip():
        term = search.strip()
        search_clauses = [{"symptoms": {"$regex": term, "$options": "i"}}]
        try:
            search_clauses.append({"_id": ObjectId(term)})
        except Exception:
            pass
        query["$or"] = search_clauses

    skip = (page - 1) * limit
    total = await db.appointment_requests.count_documents(query)
    cursor = db.appointment_requests.find(query).sort([
        ("priority_score", -1),
        ("created_at", 1)
    ]).skip(skip).limit(limit)

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

    return {
        "requests": results,
        "page": page,
        "limit": limit,
        "total": total
    }


@router.get("/departments")
async def admin_list_departments(
    search: Optional[str] = Query(None),
    current_user: dict = require_roles(["admin"])
):
    """
    List all departments (active and deactivated) for admin management.
    """
    db = get_database()
    query = {}
    if search and search.strip():
        query["name"] = {"$regex": search.strip(), "$options": "i"}
    cursor = db.departments.find(query).sort("name", 1)
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "name": doc["name"],
            "description": doc.get("description", ""),
            "is_active": doc.get("is_active", True)
        })
    return results


@router.post("/departments", status_code=status.HTTP_201_CREATED)
async def admin_create_department(
    dept_in: DepartmentCreate,
    current_user: dict = require_roles(["admin"])
):
    """
    Create a new clinical department. Logs admin action.
    """
    db = get_database()
    
    # Check duplicate name
    existing = await db.departments.find_one({"name": dept_in.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with name '{dept_in.name}' already exists."
        )

    doc = {
        "name": dept_in.name,
        "description": dept_in.description,
        "is_active": True
    }
    result = await db.departments.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Write audit log
    await AuditService.write_audit_log(
        db=db,
        actor_id=current_user["_id"],
        actor_name=current_user["full_name"],
        actor_email=current_user["email"],
        action="create_department",
        entity_type="department",
        entity_id=doc["_id"],
        new_value={"name": doc["name"], "description": doc["description"]}
    )

    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "description": doc["description"],
        "is_active": doc["is_active"]
    }


@router.put("/departments/{id}")
async def admin_update_department(
    id: str,
    dept_in: DepartmentUpdate,
    current_user: dict = require_roles(["admin"])
):
    """
    Modify department parameters or toggle active state. Logs admin action.
    """
    db = get_database()
    try:
        dept_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department ID format")

    existing = await db.departments.find_one({"_id": dept_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    update_fields = {}
    prev_fields = {}
    
    if dept_in.name is not None:
        update_fields["name"] = dept_in.name
        prev_fields["name"] = existing.get("name")
    if dept_in.description is not None:
        update_fields["description"] = dept_in.description
        prev_fields["description"] = existing.get("description")
    if dept_in.is_active is not None:
        update_fields["is_active"] = dept_in.is_active
        prev_fields["is_active"] = existing.get("is_active")

    if not update_fields:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No field updates provided")

    await db.departments.update_one({"_id": dept_id}, {"$set": update_fields})
    updated_doc = await db.departments.find_one({"_id": dept_id})

    # Write audit log
    await AuditService.write_audit_log(
        db=db,
        actor_id=current_user["_id"],
        actor_name=current_user["full_name"],
        actor_email=current_user["email"],
        action="update_department",
        entity_type="department",
        entity_id=dept_id,
        previous_value=prev_fields,
        new_value=update_fields
    )

    return {
        "id": str(updated_doc["_id"]),
        "name": updated_doc["name"],
        "description": updated_doc.get("description", ""),
        "is_active": updated_doc.get("is_active", True)
    }


@router.get("/doctors")
async def admin_list_doctors(
    search: Optional[str] = Query(None),
    current_user: dict = require_roles(["admin"])
):
    """
    List all doctors and join user authentication state/department details.
    """
    db = get_database()
    user_query = {"role": "doctor"}
    if search and search.strip():
        term = search.strip()
        user_query["$or"] = [
            {"full_name": {"$regex": term, "$options": "i"}},
            {"email": {"$regex": term, "$options": "i"}}
        ]
    cursor = db.users.find(user_query).sort("full_name", 1)
    results = []
    async for user in cursor:
        doc_profile = await db.doctors.find_one({"user_id": user["_id"]})
        dept_name = "Unassigned"
        dept_id = None
        specialization = ""
        bio = ""
        schedule_slots = []
        if doc_profile:
            dept_id = str(doc_profile["department_id"])
            specialization = doc_profile.get("specialization", "")
            bio = doc_profile.get("bio", "")
            schedule_slots = doc_profile.get("schedule_slots", [])
            dept = await db.departments.find_one({"_id": doc_profile["department_id"]})
            if dept:
                dept_name = dept["name"]

        results.append({
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "phone": user["phone"],
            "is_active": user.get("is_active", True),
            "department_id": dept_id,
            "department_name": dept_name,
            "specialization": specialization,
            "bio": bio,
            "schedule_slots": schedule_slots
        })
    return results


@router.post("/doctors", status_code=status.HTTP_201_CREATED)
async def admin_create_doctor(
    doc_in: DoctorCreate,
    current_user: dict = require_roles(["admin"])
):
    """
    Register a doctor user and generate their profile. Logs admin action.
    """
    db = get_database()
    
    # Verify email duplicate
    email_clean = doc_in.email.strip().lower()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account with this email already exists."
        )

    # Validate department exists
    try:
        dept_id = ObjectId(doc_in.department_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department ID format.")
    
    dept_exists = await db.departments.find_one({"_id": dept_id})
    if not dept_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    # Create doctor user
    now = datetime.now(timezone.utc)
    user_doc = {
        "full_name": doc_in.full_name,
        "email": email_clean,
        "password_hash": get_password_hash(doc_in.password),
        "role": "doctor",
        "phone": doc_in.phone,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    user_res = await db.users.insert_one(user_doc)
    doc_user_id = user_res.inserted_id

    # Create doctor profile linking user and department
    profile_doc = {
        "user_id": doc_user_id,
        "department_id": dept_id,
        "specialization": doc_in.specialization,
        "bio": doc_in.bio,
        "schedule_slots": doc_in.schedule_slots,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    await db.doctors.insert_one(profile_doc)

    # Write audit log
    await AuditService.write_audit_log(
        db=db,
        actor_id=current_user["_id"],
        actor_name=current_user["full_name"],
        actor_email=current_user["email"],
        action="create_doctor",
        entity_type="doctor",
        entity_id=doc_user_id,
        new_value={
            "full_name": doc_in.full_name,
            "email": email_clean,
            "department_id": doc_in.department_id,
            "specialization": doc_in.specialization
        }
    )

    return {
        "id": str(doc_user_id),
        "full_name": doc_in.full_name,
        "email": email_clean,
        "phone": doc_in.phone,
        "is_active": True
    }


@router.put("/doctors/{user_id}")
async def admin_update_doctor(
    user_id: str,
    doc_in: DoctorUpdate,
    current_user: dict = require_roles(["admin"])
):
    """
    Update doctor parameters or toggle active status. Logs admin action.
    """
    db = get_database()
    try:
        doctor_uid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid doctor user ID format.")

    user_existing = await db.users.find_one({"_id": doctor_uid, "role": "doctor"})
    if not user_existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor user not found.")

    prev_val = {}
    new_val = {}

    # Update user parameters
    if doc_in.is_active is not None:
        await db.users.update_one({"_id": doctor_uid}, {"$set": {"is_active": doc_in.is_active, "updated_at": datetime.now(timezone.utc)}})
        prev_val["is_active"] = user_existing.get("is_active")
        new_val["is_active"] = doc_in.is_active

    # Update doctor profile fields
    profile_updates = {}
    profile_existing = await db.doctors.find_one({"user_id": doctor_uid})
    if profile_existing:
        if doc_in.specialization is not None:
            profile_updates["specialization"] = doc_in.specialization
            prev_val["specialization"] = profile_existing.get("specialization")
            new_val["specialization"] = doc_in.specialization
        if doc_in.bio is not None:
            profile_updates["bio"] = doc_in.bio
            prev_val["bio"] = profile_existing.get("bio")
            new_val["bio"] = doc_in.bio
        if doc_in.schedule_slots is not None:
            profile_updates["schedule_slots"] = doc_in.schedule_slots
            prev_val["schedule_slots"] = profile_existing.get("schedule_slots")
            new_val["schedule_slots"] = doc_in.schedule_slots
        if doc_in.department_id is not None:
            try:
                dept_id = ObjectId(doc_in.department_id)
                dept_exists = await db.departments.find_one({"_id": dept_id})
                if not dept_exists:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")
                profile_updates["department_id"] = dept_id
                prev_val["department_id"] = str(profile_existing.get("department_id"))
                new_val["department_id"] = doc_in.department_id
            except Exception:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department ID format.")

        if profile_updates:
            profile_updates["updated_at"] = datetime.now(timezone.utc)
            await db.doctors.update_one({"user_id": doctor_uid}, {"$set": profile_updates})

    # Write audit log
    await AuditService.write_audit_log(
        db=db,
        actor_id=current_user["_id"],
        actor_name=current_user["full_name"],
        actor_email=current_user["email"],
        action="update_doctor",
        entity_type="doctor",
        entity_id=doctor_uid,
        previous_value=prev_val,
        new_value=new_val
    )

    return {"success": True, "message": "Doctor parameters updated successfully."}


@router.put("/appointments/{request_id}/override", response_model=AppointmentRequestResponse)
async def admin_override_priority(
    request_id: str,
    override_in: PriorityOverrideRequest,
    current_user: dict = require_roles(["admin"])
):
    """
    Override triage category and score manually with a mandatory reason. Logs admin override.
    """
    db = get_database()
    try:
        appt_id = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request ID format.")

    appt_existing = await db.appointment_requests.find_one({"_id": appt_id})
    if not appt_existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment request not found.")

    # Apply manual override
    now = datetime.now(timezone.utc)
    explanation = f"Manual override: Overridden to {override_in.priority_level} (Score {override_in.priority_score}) by Administrator. Reason: {override_in.reason}"
    
    await db.appointment_requests.update_one(
        {"_id": appt_id},
        {
            "$set": {
                "priority_score": override_in.priority_score,
                "priority_level": override_in.priority_level,
                "priority_explanation": explanation,
                "updated_at": now
            }
        }
    )

    updated_doc = await db.appointment_requests.find_one({"_id": appt_id})
    
    dept = await db.departments.find_one({"_id": updated_doc.get("department_id")})
    dept_name = dept["name"] if dept else "Unknown"

    doctor_name = None
    if updated_doc.get("assigned_doctor_id"):
        doc_user = await db.users.find_one({"_id": updated_doc["assigned_doctor_id"]})
        if doc_user:
            doctor_name = doc_user.get("full_name")

    # Record audit log
    await AuditService.write_audit_log(
        db=db,
        actor_id=current_user["_id"],
        actor_name=current_user["full_name"],
        actor_email=current_user["email"],
        action="override_priority",
        entity_type="appointment_request",
        entity_id=appt_id,
        previous_value={
            "priority_score": appt_existing.get("priority_score"),
            "priority_level": appt_existing.get("priority_level"),
            "priority_explanation": appt_existing.get("priority_explanation")
        },
        new_value={
            "priority_score": override_in.priority_score,
            "priority_level": override_in.priority_level,
            "priority_explanation": explanation
        },
        reason=override_in.reason
    )

    return appointment_helper(updated_doc, dept_name=dept_name, doctor_name=doctor_name)


@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    current_user: dict = require_roles(["admin"])
):
    """
    Retrieve paginated administrative audit logs history.
    """
    db = get_database()
    query = {}
    if action:
        query["action"] = action
    if entity_type:
        query["entity_type"] = entity_type
    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"actor_name": {"$regex": term, "$options": "i"}},
            {"actor_email": {"$regex": term, "$options": "i"}},
            {"reason": {"$regex": term, "$options": "i"}},
            {"action": {"$regex": term, "$options": "i"}}
        ]

    skip = (page - 1) * limit
    
    cursor = db.audit_logs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    total_logs = await db.audit_logs.count_documents(query)

    results = []
    async for doc in cursor:
        results.append(audit_log_helper(doc))

    return {
        "logs": results,
        "page": page,
        "limit": limit,
        "total": total_logs
    }
