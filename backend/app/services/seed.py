import asyncio
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.utils.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data():
    logger.info("Initializing database seed...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # 1. Clear existing seed users if they exist (to keep the seed idempotent and safe)
    seed_emails = [
        "admin@prioritycare.com",
        "doctor.heart@prioritycare.com",
        "doctor.kids@prioritycare.com"
    ]
    
    deleted = await db.users.delete_many({"email": {"$in": seed_emails}})
    logger.info(f"Cleared {deleted.deleted_count} existing duplicate seed records.")

    # 2. Insert admin
    now = datetime.now(timezone.utc)
    admin_doc = {
        "full_name": "System Admin",
        "email": "admin@prioritycare.com",
        "password_hash": get_password_hash(settings.SEED_ADMIN_PASSWORD),
        "role": "admin",
        "phone": "+10000000000",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(admin_doc)
    logger.info("Seeded Admin: admin@prioritycare.com")

    # 3. Insert doctors
    doc1 = {
        "full_name": "Dr. Charles Heart",
        "email": "doctor.heart@prioritycare.com",
        "password_hash": get_password_hash(settings.SEED_DOCTOR_PASSWORD),
        "role": "doctor",
        "phone": "+10000000001",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    doc2 = {
        "full_name": "Dr. Sarah Kids",
        "email": "doctor.kids@prioritycare.com",
        "password_hash": get_password_hash(settings.SEED_DOCTOR_PASSWORD),
        "role": "doctor",
        "phone": "+10000000002",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    result1 = await db.users.insert_one(doc1)
    result2 = await db.users.insert_one(doc2)
    logger.info("Seeded Doctor 1 (Cardiology): doctor.heart@prioritycare.com")
    logger.info("Seeded Doctor 2 (Pediatrics): doctor.kids@prioritycare.com")

    # 4. Insert doctor professional profiles linked to user IDs (optional but structured for C4 architecture layout)
    await db.doctors.delete_many({"user_id": {"$in": [result1.inserted_id, result2.inserted_id]}})
    
    # Check/Create departments
    dept_cardio = await db.departments.find_one({"name": "Cardiology"})
    if not dept_cardio:
        res = await db.departments.insert_one({
            "name": "Cardiology",
            "description": "Heart care and cardiovascular health treatments.",
            "is_active": True,
            "created_at": now
        })
        cardio_id = res.inserted_id
    else:
        cardio_id = dept_cardio["_id"]

    dept_peds = await db.departments.find_one({"name": "Pediatrics"})
    if not dept_peds:
        res = await db.departments.insert_one({
            "name": "Pediatrics",
            "description": "Child healthcare and development services.",
            "is_active": True,
            "created_at": now
        })
        peds_id = res.inserted_id
    else:
        peds_id = dept_peds["_id"]

    doctor_profiles = [
        {
            "user_id": result1.inserted_id,
            "department_id": cardio_id,
            "specialization": "Cardiology",
            "availability_slots": [
                { "day": "Monday", "shift": "Morning" },
                { "day": "Wednesday", "shift": "Afternoon" }
            ],
            "is_active": True,
            "created_at": now
        },
        {
            "user_id": result2.inserted_id,
            "department_id": peds_id,
            "specialization": "Pediatrics",
            "availability_slots": [
                { "day": "Tuesday", "shift": "Morning" },
                { "day": "Thursday", "shift": "Afternoon" }
            ],
            "is_active": True,
            "created_at": now
        }
    ]
    await db.doctors.insert_many(doctor_profiles)
    logger.info("Seeded Doctor professional metadata profiles linked to user accounts.")

    # 5. Insert default priority rules if they don't exist
    rule_doc = await db.priority_rules.find_one({"is_active": True})
    if not rule_doc:
        await db.priority_rules.insert_one({
            "weights": {
                "symptom_severity": { "severe": 40, "moderate": 25, "mild": 10 },
                "symptom_duration": { "acute": 15, "sub_acute": 10, "chronic": 5 },
                "age_band": { "infant_elderly": 15, "child_older_adult": 10, "adult": 5 },
                "chronic_conditions": { "multiple": 15, "single": 10, "none": 0 },
                "pregnancy": 15
            },
            "is_active": True,
            "updated_at": now
        })
        logger.info("Seeded default Priority Rules configuration matrix.")

    client.close()
    logger.info("Database seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
