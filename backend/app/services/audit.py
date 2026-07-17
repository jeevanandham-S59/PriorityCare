from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

class AuditService:
    @staticmethod
    async def write_audit_log(
        db,
        actor_id: ObjectId,
        actor_name: str,
        actor_email: str,
        action: str,
        entity_type: str,
        entity_id: ObjectId,
        previous_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        reason: Optional[str] = None
    ):
        """
        Structured administrative audit log recorder.
        """
        log_entry = {
            "actor_id": actor_id,
            "actor_name": actor_name,
            "actor_email": actor_email,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "previous_value": previous_value,
            "new_value": new_value,
            "reason": reason,
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(log_entry)
