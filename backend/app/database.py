import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_helper = Database()

def get_database():
    return db_helper.db

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    db_helper.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_helper.db = db_helper.client[settings.DATABASE_NAME]
    logger.info("Connected to MongoDB successfully.")

async def close_mongo_connection():
    logger.info("Closing connection to MongoDB...")
    if db_helper.client:
        db_helper.client.close()
    logger.info("MongoDB connection closed.")
