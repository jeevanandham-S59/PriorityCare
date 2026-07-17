from typing import List
from fastapi import APIRouter, status
from app.database import get_database

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", status_code=status.HTTP_200_OK)
async def list_departments():
    """List all active departments. Public endpoint used by appointment forms."""
    db = get_database()
    cursor = db.departments.find({"is_active": True}).sort("name", 1)
    departments = []
    async for dept in cursor:
        departments.append({
            "id": str(dept["_id"]),
            "name": dept["name"],
            "description": dept.get("description", ""),
        })
    return departments
