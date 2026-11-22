# CreatorIQ - Module 1

## Run (one command serves backend + frontend)
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

Open http://localhost:8000  (login/register page)
API docs: http://localhost:8000/docs

## Admin account (optional)
python create_admin.py   -> admin@creatoriq.com / Admin@12345

## PostgreSQL (optional)
set DATABASE_URL=postgresql://postgres:YOURPASS@localhost:5432/creatoriq
