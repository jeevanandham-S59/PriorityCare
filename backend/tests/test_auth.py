import pytest
from httpx import AsyncClient
from app.utils.security import get_password_hash
from app.database import get_database

pytestmark = pytest.mark.anyio

async def test_register_patient_success(client: AsyncClient):
    payload = {
        "full_name": "Test Patient",
        "email": "testpatient@example.com",
        "password": "SecurePassword123!",
        "phone": "1234567890"
    }
    
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "testpatient@example.com"
    assert data["role"] == "patient"
    assert "id" in data
    assert "password_hash" not in data # Ensure password hash is never leaked

async def test_register_patient_weak_password(client: AsyncClient):
    payload = {
        "full_name": "Test Patient",
        "email": "testpatient@example.com",
        "password": "weak",
        "phone": "1234567890"
    }
    
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 422 # Pydantic validation error

async def test_register_patient_duplicate_email(client: AsyncClient):
    payload = {
        "full_name": "Test Patient",
        "email": "duplicate@example.com",
        "password": "SecurePassword123!",
        "phone": "1234567890"
    }
    
    # First registration
    response1 = await client.post("/api/auth/register", json=payload)
    assert response1.status_code == 201
    
    # Second registration (duplicate)
    response2 = await client.post("/api/auth/register", json=payload)
    assert response2.status_code == 400
    assert response2.json()["detail"] == "Email is already registered"

async def test_login_success(client: AsyncClient):
    db = get_database()
    # Pre-insert user with hashed password
    hashed_pwd = get_password_hash("CorrectPassword123!")
    await db.users.insert_one({
        "full_name": "Pre Existing",
        "email": "existing@example.com",
        "password_hash": hashed_pwd,
        "role": "doctor",
        "phone": "1111111111",
        "is_active": True
    })
    
    login_payload = {
        "email": "existing@example.com",
        "password": "CorrectPassword123!"
    }
    
    response = await client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "doctor"
    assert data["token_type"] == "bearer"

async def test_login_invalid_credentials(client: AsyncClient):
    login_payload = {
        "email": "nonexistent@example.com",
        "password": "WrongPassword123!"
    }
    
    response = await client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

async def test_get_me_success(client: AsyncClient):
    # Register patient first
    reg_payload = {
        "full_name": "Logged In User",
        "email": "loggedin@example.com",
        "password": "SecurePassword123!",
        "phone": "1234567890"
    }
    await client.post("/api/auth/register", json=reg_payload)
    
    # Log in to get token
    login_response = await client.post("/api/auth/login", json={
        "email": "loggedin@example.com",
        "password": "SecurePassword123!"
    })
    token = login_response.json()["access_token"]
    
    # Retrieve details
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "loggedin@example.com"
    assert data["role"] == "patient"

async def test_get_me_invalid_token(client: AsyncClient):
    headers = {"Authorization": "Bearer invalidtoken123"}
    response = await client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401

async def test_role_based_restriction(client: AsyncClient):
    # Setup test: register a patient and get token
    reg_payload = {
        "full_name": "Regular Patient",
        "email": "regularpatient@example.com",
        "password": "SecurePassword123!",
        "phone": "1234567890"
    }
    await client.post("/api/auth/register", json=reg_payload)
    
    login_response = await client.post("/api/auth/login", json={
        "email": "regularpatient@example.com",
        "password": "SecurePassword123!"
    })
    patient_token = login_response.json()["access_token"]
    
    # Register an admin directly in the database
    db = get_database()
    await db.users.insert_one({
        "full_name": "Admin User",
        "email": "adminuser@example.com",
        "password_hash": get_password_hash("SecurePassword123!"),
        "role": "admin",
        "phone": "0000000000",
        "is_active": True
    })
    admin_login_res = await client.post("/api/auth/login", json={
        "email": "adminuser@example.com",
        "password": "SecurePassword123!"
    })
    admin_token = admin_login_res.json()["access_token"]
    
    # Add a mock routing verification inside test for checking require_roles dependency
    # Rather than changing app routers directly, we can define a temp router in test or test it by referencing endpoints that require admin role in routes.
    # Since our seed has admins, let's verify that a patient gets 403 on an admin route. 
    # Currently we have no active admin routes defined except for me, so let's mock one locally on the test app.
    from fastapi import Depends
    from app.routes.auth import require_roles
    from app.main import app
    
    @app.get("/api/admin-only-test")
    async def admin_only_endpoint(current_user: dict = require_roles(["admin"])):
        return {"authorized": True}

    # Query with Patient token (expected: 403)
    patient_res = await client.get("/api/admin-only-test", headers={"Authorization": f"Bearer {patient_token}"})
    assert patient_res.status_code == 403
    
    # Query with Admin token (expected: 200)
    admin_res = await client.get("/api/admin-only-test", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_res.status_code == 200
    assert admin_res.json()["authorized"] is True
