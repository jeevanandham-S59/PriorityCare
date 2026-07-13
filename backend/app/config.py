import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PriorityCare"
    API_V1_STR: str = "/api"
    
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "prioritycare"
    
    JWT_SECRET_KEY: str = "918ebf9ef1d3ffca4e0078174fe904f4a35028fb328c68dc3b999d3d3ef46cf0"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    SEED_ADMIN_PASSWORD: str = "AdminPass123!"
    SEED_DOCTOR_PASSWORD: str = "DoctorPass123!"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
