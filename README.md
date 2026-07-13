# PriorityCare

A priority-based medical appointment scheduling web application. Built for academic evaluation.

## Technology Stack
- **Frontend:** React (Vite), React Router 6, Axios, Custom Responsive CSS
- **Backend:** FastAPI, Motor (Async MongoDB), Pydantic Settings, JWT Authentication, Bcrypt Password Hashing
- **Database:** MongoDB Community Server (Local)

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Python** (v3.9 or higher recommended)
- **MongoDB Community Server** running locally on port `27017`

### 1. Database Setup
Ensure MongoDB is running locally. To start MongoDB Community Server locally:
- **Windows (Service):**
  Check if MongoDB service is running:
  ```powershell
  Get-Service -Name MongoDB
  ```
  If stopped, start it:
  ```powershell
  Start-Service -Name MongoDB
  ```
- **Windows (Manual CLI):**
  If MongoDB is not running as a service, start it from your MongoDB installation folder:
  ```cmd
  "C:\Program Files\MongoDB\Server\X.Y\bin\mongod.exe" --dbpath="C:\data\db"
  ```

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
   *(Ensure MongoDB URI is set correctly to `mongodb://localhost:27017/prioritycare`)*

5. **Seed the database (Admin and Doctors):**
   Run the seed script to pre-populate required system users:
   ```bash
   python -m app.services.seed
   ```
   **Default seeded accounts:**
   - **Admin:** `admin@prioritycare.com` / `AdminPass123!`
   - **Cardiology Doctor:** `doctor.heart@prioritycare.com` / `DoctorPass123!`
   - **Pediatrics Doctor:** `doctor.kids@prioritycare.com` / `DoctorPass123!`

6. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000`. The interactive Swagger UI will be at `http://localhost:8000/docs`.

---

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The web application will open at `http://localhost:5173`.

---

## Running Integration Tests
To execute backend integration tests for registration, login, and authorization validation:
1. Navigate to the `backend` folder and ensure your virtual environment is active.
2. Run pytest:
   ```bash
   pytest
   ```
