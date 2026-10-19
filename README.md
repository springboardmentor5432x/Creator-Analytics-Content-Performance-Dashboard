## Run the Project

### Backend

From the project root, activate your existing Python virtual environment and start the FastAPI server:

```powershell
.\backend\venv\Scripts\python.exe -m uvicorn main:app --reload --app-dir backend
```

Backend API documentation: http://127.0.0.1:8000/docs

### Frontend

Open a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the frontend URL shown in the terminal, usually http://localhost:5173.

### Database

CreatorIQ uses PostgreSQL. Configure the database connection using your local environment variables. Do not commit passwords, secret keys, or `.env` files to GitHub.

### Features

- Role-based dashboards for Creator, Agency, Marketing Team, and Admin
- Analytics charts and content performance views
- FastAPI backend
- PostgreSQL database schema

**Note:** Social-media OAuth connections and live platform analytics should be considered implemented only if they have been configured and tested.
