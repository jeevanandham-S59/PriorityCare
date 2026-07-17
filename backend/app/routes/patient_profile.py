from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.database import get_database
from app.routes.auth import get_current_user, require_roles
from app.models.patient_profile import (
    PatientProfileCreate,
    PatientProfileUpdate,
    PatientProfileResponse,
    profile_helper,
)

router = APIRouter(prefix="/patient/profile", tags=["Patient Profile"])


@router.post("", response_model=PatientProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_in: PatientProfileCreate,
    current_user: dict = require_roles(["patient"]),
):
    db = get_database()
    user_id = current_user["_id"]

    # Check if profile already exists
    existing = await db.patient_profiles.find_one({"user_id": user_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient profile already exists. Use PUT to update.",
        )

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "date_of_birth": datetime.combine(profile_in.date_of_birth, datetime.min.time()),
        "gender": profile_in.gender,
        "address": profile_in.address,
        "emergency_contact": profile_in.emergency_contact,
        "blood_group": profile_in.blood_group,
        "chronic_conditions": profile_in.chronic_conditions,
        "allergies": profile_in.allergies,
        "is_pregnant": profile_in.is_pregnant,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.patient_profiles.insert_one(doc)
    doc["_id"] = result.inserted_id
    return profile_helper(doc)


@router.get("", response_model=PatientProfileResponse)
async def get_my_profile(current_user: dict = require_roles(["patient"])):
    db = get_database()
    doc = await db.patient_profiles.find_one({"user_id": current_user["_id"]})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Please create one first.",
        )
    return profile_helper(doc)


@router.put("", response_model=PatientProfileResponse)
async def update_profile(
    profile_in: PatientProfileUpdate,
    current_user: dict = require_roles(["patient"]),
):
    db = get_database()
    user_id = current_user["_id"]

    existing = await db.patient_profiles.find_one({"user_id": user_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Please create one first.",
        )

    update_data = {}
    for field, value in profile_in.model_dump(exclude_unset=True).items():
        if field == "date_of_birth" and value is not None:
            update_data[field] = datetime.combine(value, datetime.min.time())
        else:
            update_data[field] = value

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.patient_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data},
    )

    updated_doc = await db.patient_profiles.find_one({"user_id": user_id})
    return profile_helper(updated_doc)
