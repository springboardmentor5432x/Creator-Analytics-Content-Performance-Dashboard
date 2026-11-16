# CreatorIQ — Creator Analytics & Content Performance Dashboard (lite edition)

## Run
    pip install -r requirements.txt
    python app.py          # opens http://127.0.0.1:8000

The SQLite database (creatoriq.db) and demo data are created automatically on first run.
Delete creatoriq.db to reset everything. API docs: http://127.0.0.1:8000/docs

## Demo logins
- Creator:   demo@creatoriq.com      / demo123
- Agency:    agency@creatoriq.com    / demo123
- Marketing: marketing@creatoriq.com / demo123
- Admin:     admin@creatoriq.com     / admin123

## Structure
    app.py                  <- the only file you run (wires everything together)
    backend/
      config.py  database.py  security.py  cache.py
      routes/    auth, dashboard, content, audience, growth, revenue, integrations, notifications, reports
      services/  analytics (regression/forecast), connectors (simulated platform APIs + sync), scheduler
    frontend/               <- React 18 + htm + Chart.js (no build step; CDN needs internet)
      index.html  css/style.css  js/{api,components,pages,pages2,app}.js

## Architecture mapping (full design -> lite version)
- PostgreSQL + MongoDB            -> SQLite
- Redis cache / real-time store   -> in-memory TTL cache + live metrics tick
- Kafka/RabbitMQ, Celery, Cron    -> asyncio background scheduler
- Flink/Spark stream processor    -> scheduler live_tick()
- YouTube/Instagram/TikTok APIs   -> simulated connectors (services/connectors.py)
- SendGrid/Firebase               -> in-app notifications
- JWT + OAuth2                    -> PyJWT + FastAPI OAuth2PasswordBearer (/api/auth/token)
