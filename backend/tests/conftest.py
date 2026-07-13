import asyncio
import pytest
import anyio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

# Override settings database before imports to keep test collection isolated
from app.config import settings
settings.DATABASE_NAME = "prioritycare_test"

from app.main import app
from app.database import db_helper

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(autouse=True, scope="function")
async def clean_database():
    # Setup connection
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # Establish connection inside db_helper for app endpoints
    db_helper.client = client
    db_helper.db = db
    
    # Clear collections
    await db.users.delete_many({})
    await db.doctors.delete_many({})
    await db.departments.delete_many({})
    await db.priority_rules.delete_many({})
    
    yield
    
    # Clean up after tests
    await db.users.delete_many({})
    client.close()

@pytest.fixture
async def client():
    # Set up ASGI test client using httpx
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
