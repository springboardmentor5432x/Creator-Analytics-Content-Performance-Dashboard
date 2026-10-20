# CREATORIQ FRONTEND PATCH — READ FIRST

## PROJECT
CreatorIQ — Creator Analytics & Content Performance Dashboard

## IMPORTANT
This patch is intended to update the **frontend UI only**.

- Do not modify the FastAPI backend unless a verified API mismatch requires it.
- Do not change the PostgreSQL database, models, schemas, or existing authentication logic.
- Preserve existing routes, working features, and API integrations.
- Keep the changes compatible with the current Vite + React project.
- Back up existing files before replacing them.

## PROJECT LOCATION

Git-connected project folder:

`E:\CreatorIQ-github`

Expected structure:

- `frontend/` — React + Vite application
- `backend/` — FastAPI application

## FRONTEND FILES

Known existing files include:

- `frontend/src/Dashboard.jsx`
- `frontend/src/Dashboard.css`
- `frontend/src/AdminDashboard.jsx`
- `frontend/src/AdminDashboard.css`
- `frontend/package.json`
- `frontend/vite.config.js`

Inspect the existing project before creating or replacing additional files. Do not assume that Login, Register, API, or ProtectedRoute files have the same names or contents as another project.

## UI REQUIREMENTS

Improve the CreatorIQ interface with a modern, professional creator-analytics dashboard.

### 1. Authentication
- Maintain the existing login and registration functionality.
- Preserve current backend API calls and token handling.
- Show clear validation and error messages.
- Do not add fake Google or Apple authentication.
- Do not change the backend authentication flow without verification.

### 2. CreatorIQ Dashboard
- Create a polished analytics dashboard.
- Include a clear navigation/sidebar layout.
- Display content-performance analytics and readable charts.
- Add KPI/stat cards with consistent spacing.
- Include a profile avatar in the top-right corner.
- Make the profile/avatar interaction functional.
- Keep the Content Performance chart's Y-axis labels:
  `0`, `50k`, `100k`, `150k`, `200k`.
- Make the dashboard responsive on desktop and mobile.
- Use consistent typography, colors, spacing, borders, and hover effects.

### 3. Data and API
- Use the existing API client and current backend endpoints.
- Keep real backend data separate from mock/demo analytics.
- Clearly identify mock data if it is used for presentation.
- Do not invent endpoint URLs, response fields, or database changes.
- If an endpoint or response format is unclear, inspect the backend code first.

## BACKUP BEFORE INSTALLATION

1. Open `E:\CreatorIQ-github` in VS Code.
2. Back up the existing dashboard, admin dashboard, CSS, authentication, and routing files that will be changed.
3. Review the current Git changes before applying the patch.
4. Do not overwrite unrelated files or remove existing functionality.

## INSTALLATION

No additional packages should be installed unless the verified implementation requires them.

1. Apply the patch to the existing `frontend` folder.
2. Preserve the current folder structure and filenames.
3. Review all imports and file paths.
4. Check that existing API calls and routes still work.
5. Run the frontend and backend separately.

### Terminal 1 — Backend

Open PowerShell and use the actual backend location inside your project.

```powershell
cd E:\CreatorIQ-github\backend
```

Activate the existing virtual environment if it is present:

```powershell
.\venv\Scripts\Activate.ps1
```

If your virtual environment has a different name or location, use that existing path. Then start FastAPI using the project's actual application entry point.

### Terminal 2 — Frontend

```powershell
cd E:\CreatorIQ-github\frontend
npm.cmd run dev
```

Open the local URL printed by Vite, normally:

`http://localhost:5173/`

## FINAL VERIFICATION

Before considering the patch complete, verify:

- Login and registration still work.
- Dashboard and admin dashboard routes load.
- Existing API calls succeed.
- The profile avatar and its interaction work.
- Charts and Y-axis labels display correctly.
- No missing imports or CSS files.
- No browser console errors.
- No unintended backend or database changes.
- The application works at desktop and mobile screen sizes.

## ERROR HANDLING

If an API route, response field, authentication token, or import path differs from expectations, do not change the backend blindly.

Share the exact error message and the relevant existing file. Fix the frontend to match the actual project architecture wherever possible.

## EXPECTED RESULT

A polished CreatorIQ dashboard with a professional analytics UI, working profile interaction, preserved authentication, compatible backend integration, and no unnecessary changes to the database or existing project functionality.
