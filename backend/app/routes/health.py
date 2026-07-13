from fastapi import APIRouter, status, HTTPException
from app.database import get_database

router = APIRouter(prefix="/health", tags=["System Health"])

@router.get("", status_code=status.HTTP_200_OK)
async def check_health():
    db_connected = False
    try:
        db = get_database()
        if db is not None:
            # Ping the database
            await db.command("ping")
            db_connected = True
    except Exception as e:
        # Log error in production
        pass
        
    status_str = "healthy" if db_connected else "unhealthy"
    
    response_data = {
        "status": status_str,
        "database": "connected" if db_connected else "disconnected"
    }
    
    if not db_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=response_data
        )
        
    return response_data
