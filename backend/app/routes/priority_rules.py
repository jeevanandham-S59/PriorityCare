from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_database
from app.routes.auth import get_current_user, require_roles
from app.models.priority_rules import PriorityRulesBase, PriorityRulesResponse, rules_helper
from app.services.priority import PriorityService
from app.services.audit import AuditService

router = APIRouter(prefix="/rules", tags=["Priority Rules"])

@router.get("", response_model=PriorityRulesResponse)
async def get_priority_rules(current_user: dict = Depends(get_current_user)):
    """Fetch active priority scoring rules configuration. Accessible to any logged in user."""
    db = get_database()
    rules = await PriorityService.get_active_rules(db)
    return rules

@router.put("", response_model=PriorityRulesResponse)
async def update_priority_rules(
    rules_in: PriorityRulesBase,
    current_user: dict = require_roles(["admin"])
):
    """Update priority rules configuration. Admin access only."""
    db = get_database()
    now = datetime.now(timezone.utc)

    existing_doc = await db.priority_rules.find_one({"is_active": True})
    previous_value = None
    if existing_doc:
        previous_value = {
            "thresholds": existing_doc.get("thresholds"),
            "weights": existing_doc.get("weights"),
            "urgent_keywords": existing_doc.get("urgent_keywords")
        }
    
    # We update the active rules or insert a new one if none exists
    update_data = {
        "thresholds": rules_in.thresholds.model_dump(),
        "weights": rules_in.weights.model_dump(),
        "urgent_keywords": [kw.strip().lower() for kw in rules_in.urgent_keywords if kw.strip()],
        "is_active": True,
        "updated_at": now
    }
    
    await db.priority_rules.update_one(
        {"is_active": True},
        {"$set": update_data},
        upsert=True
    )
    
    updated_doc = await db.priority_rules.find_one({"is_active": True})

    await AuditService.write_audit_log(
        db=db,
        actor_id=current_user["_id"],
        actor_name=current_user["full_name"],
        actor_email=current_user["email"],
        action="update_priority_rules",
        entity_type="priority_rules",
        entity_id=updated_doc["_id"],
        previous_value=previous_value,
        new_value={
            "thresholds": update_data["thresholds"],
            "weights": update_data["weights"],
            "urgent_keywords": update_data["urgent_keywords"]
        }
    )

    return rules_helper(updated_doc)
