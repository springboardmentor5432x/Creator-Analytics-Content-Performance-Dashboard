CREATORIQ FRONTEND PATCH — READ FIRST

This patch updates only frontend files. It does NOT change your FastAPI backend or PostgreSQL database.

Assumed existing files:
- frontend/src/api/axios.js (exports default `api`, base URL http://127.0.0.1:8000)
- frontend/src/App.jsx has /login, /register, /dashboard routes
- frontend/src/components/ProtectedRoute.jsx exists
- React, react-router-dom and axios are already installed

FILES IN THIS PATCH:
- src/pages/Login.jsx             REPLACE existing
- src/pages/Register.jsx          REPLACE existing
- src/pages/Dashboard.jsx         REPLACE existing
- src/styles/CreatorAuth.css      CREATE
- src/styles/CreatorDashboard.css CREATE
- public/creator-studio.png       COPY generated background image here

IMAGE:
The image is used as a background behind the creator-analytics UI. The floating stat cards, icons, and login card are HTML/CSS, not baked into the image. This keeps the form readable and responsive.

INSTALL:
No new packages are required for this patch.
It uses React, React Router and your existing axios instance.

IMPORTANT AUTH DETAILS:
- Login posts username=email and password as application/x-www-form-urlencoded to /api/auth/login.
- After login it stores the access token, then attempts GET /api/auth/me to retrieve the actual role/user.
- Registration posts {name, email, password, role} JSON to /api/auth/register.
- Google/Apple buttons are visual placeholders; OAuth is not configured.
- Forgot-password is a placeholder message.
- Dashboard analytics are mock data, per mentor instructions.

INSTALL STEPS:
1. Make sure your backup still exists.
2. In VS Code, back up current Login.jsx, Register.jsx, Dashboard.jsx.
3. Copy the files in this ZIP into your existing frontend folder, preserving the folder structure and allowing replacement of the 3 page files.
4. Copy public/creator-studio.png to frontend/public/creator-studio.png.
5. Run backend in terminal 1:
   cd C:\Creator-Analytics-Content-Performance-Dashboard-main\Creator-Analytics-Content-Performance-Dashboard\backend
   .\venv\Scripts\Activate.ps1
   python -m uvicorn app.main:app --reload
6. Run frontend in terminal 2:
   cd C:\Creator-Analytics-Content-Performance-Dashboard-main\Creator-Analytics-Content-Performance-Dashboard\frontend
   npm.cmd run dev
7. Open http://localhost:5173/login

If login API route or response fields differ from the assumptions above, do not change backend blindly; share the error and we will adapt the frontend.
