import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$") # E.164 phone validation

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str
    phone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

def user_helper(user_doc) -> dict:
    return {
        "id": str(user_doc["_id"]),
        "full_name": user_doc["full_name"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "phone": user_doc.get("phone", ""),
        "is_active": user_doc.get("is_active", True),
        "created_at": user_doc.get("created_at"),
        "updated_at": user_doc.get("updated_at")
    }
