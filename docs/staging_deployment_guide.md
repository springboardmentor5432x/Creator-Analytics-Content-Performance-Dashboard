# CreatorIQ — Staging Deployment & AWS Architecture Guide

This guide details the complete staging architecture, Docker Compose orchestration, versioned Alembic migration workflows, and AWS ECS/RDS production-grade staging infrastructure for **CreatorIQ**.

---

## 1. Staging Architecture Overview

CreatorIQ staging is designed to simulate production environments with high fidelity:
- **Relational Store**: PostgreSQL 16 replacing SQLite, supporting strict concurrency, multi-AZ high availability, and transaction isolation.
- **Migration Decoupling**: Database schema migrations are decoupled from application web workers. Alembic executes as a dedicated, one-off initialization task before web workers launch, completely eliminating multi-worker DDL race conditions and schema locks.
- **Microservice Containerization**: FastAPI backend, React/Nginx frontend, PostgreSQL database, and Alembic migration runner encapsulated in lightweight OCI containers.
- **Strict Network Isolation**: Internal services communicate over an isolated bridge network; only public HTTP/HTTPS ingress is exposed to users and load balancers.

```
       +-------------------------------------------------------+
       |               Public Ingress / ALB (HTTPS)            |
       +---------------------------+---------------------------+
                                   |
                  +----------------+----------------+
                  | /api/*                          | /*
                  v                                 v
        +-------------------+             +-------------------+
        |  FastAPI Backend  | <---------- | React/Nginx Proxy |
        |  (Port 8000)      |             | (Port 80)         |
        +---------+---------+             +-------------------+
                  |
                  | (Auto-Reconnect / Pool Pre-Ping)
                  v
        +-------------------+
        | PostgreSQL 16 DB  | <---------- [One-Off Migration Task]
        | (creatoriq_staging|             (alembic upgrade head)
        +-------------------+
```

---

## 2. Docker Compose Staging Configuration

The staging environment is defined in `docker-compose.staging.yml`. It orchestrates four tightly coordinated services:

### 2.1 Service Breakdown

| Service | Image / Build | Role & Startup Behavior |
| :--- | :--- | :--- |
| **`db`** | `postgres:16-alpine` | PostgreSQL 16 database. Healthcheck uses `pg_isready -U creatoriq_user -d creatoriq_staging`. |
| **`migration`** | `./backend/Dockerfile` | One-off task executing `alembic upgrade head`. Runs once `db` is healthy. Exits code 0 on success. |
| **`backend`** | `./backend/Dockerfile` | FastAPI ASGI backend. **Blocked from starting** until `db` is healthy **and** `migration` completes successfully (`condition: service_completed_successfully`). |
| **`frontend`** | `./frontend/Dockerfile` | Nginx Alpine serving compiled Vite React SPA. Reverses proxies `/api/` traffic to `backend:8000`. |

### 2.2 Docker Compose Healthcheck & Dependency Chaining

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    container_name: creatoriq-staging-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-creatoriq_staging}
      - POSTGRES_USER=${POSTGRES_USER:-creatoriq_user}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-creatoriq_staging_secret}
    ports:
      - "5432:5432"
    volumes:
      - creatoriq_staging_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-creatoriq_user} -d ${POSTGRES_DB:-creatoriq_staging}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s

  migration:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: creatoriq-staging-migration
    restart: "no"
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-creatoriq_user}:${POSTGRES_PASSWORD:-creatoriq_staging_secret}@db:5432/${POSTGRES_DB:-creatoriq_staging}
    command: ["alembic", "upgrade", "head"]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: creatoriq-staging-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      migration:
        condition: service_completed_successfully
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-creatoriq_user}:${POSTGRES_PASSWORD:-creatoriq_staging_secret}@db:5432/${POSTGRES_DB:-creatoriq_staging}
      - AUTO_INIT_DB=false
      - ENVIRONMENT=staging
      - ALLOW_DEV_ADMIN_REGISTRATION=false
      - LOG_LEVEL=INFO
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=${VITE_API_URL:-}
    container_name: creatoriq-staging-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "5173:80"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80/"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 5s
```

### 2.3 Running Staging Locally via Docker Compose

```bash
# 1. Prepare staging environment file
cp .env.staging.example .env.staging

# 2. Start all services in staging mode
docker compose -f docker-compose.staging.yml --env-file .env.staging up --build -d

# 3. Inspect migration service execution
docker compose -f docker-compose.staging.yml logs migration

# 4. Inspect backend health and logs
docker compose -f docker-compose.staging.yml logs -f backend

# 5. Verify database connectivity via API health endpoint
curl -s http://localhost:8000/api/health | jq .
# Expected output: {"status": "ok", "database": "postgresql"}

# 6. Stop and preserve volumes
docker compose -f docker-compose.staging.yml down
```

---

## 3. Environment Variables & Secret Management

A complete `.env.staging.example` template is provided in the repository root and `backend/`.

### 3.1 Critical Staging Environment Variables

| Variable | Staging Setting | Production / Security Rationale |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `staging` | Disables debug banners; enforces production auth constraints. |
| `AUTO_INIT_DB` | `false` | Disables in-process DDL execution (`init_db`) so workers do not race. |
| `ALLOW_DEV_ADMIN_REGISTRATION` | `false` | Disables backdoor registration of admin users. |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Directs SQLAlchemy to PostgreSQL 16 connection pool. |
| `SECRET_KEY` | 64+ char random hex string | Cryptographically signs JWT tokens. Distinct from production key. |
| `CORS_ORIGINS` | Strict whitelist | Limits browser cross-origin requests to staging domains. |
| `DB_POOL_SIZE` | `10` | Base pool of persistent database connections per container. |
| `DB_MAX_OVERFLOW` | `20` | Max temporary connection burst above pool size. |
| `DB_POOL_TIMEOUT` | `30` | Timeout in seconds waiting for an available pooled connection. |
| `DB_POOL_RECYCLE` | `1800` | Recycles connections older than 30 minutes to prevent stale sockets. |
| `META_GRAPH_API_VERSION`| `v26.0` | Enforces Meta Graph API version standard. |

---

## 4. Production-Grade AWS Staging Architecture

For enterprise cloud staging, CreatorIQ deploys to Amazon Web Services using serverless containers (ECS Fargate) and managed database services (RDS PostgreSQL).

```
   [Route 53: staging.creatoriq.com]
                 |
                 v
   [AWS WAF (Rate Limiting, OWASP Rules)]
                 |
                 v
   [Application Load Balancer (ALB)] <--- ACM Certificate (TLS 1.3 / 1.2)
     | Path: /api/*                  | Path: /*
     v                               v
   [Target Group: Backend]         [Target Group: Frontend]
     |                               |
     +--> ECS Fargate (Backend)      +--> ECS Fargate (Nginx / Static)
            |
            | (IAM Role / AWS Secrets Manager)
            v
   [Amazon RDS PostgreSQL 16 (Multi-AZ)]
```

### 4.1 Amazon ECS Fargate Task Definitions

#### A. Backend Service Task Definition
- **CPU / Memory**: 0.5 vCPU (512 units), 1024 MB RAM.
- **Networking**: `awsvpc` mode attached to private subnets across 2 Availability Zones.
- **Port Mapping**: Container port `8000` (TCP).
- **Environment Variables**:
  - `ENVIRONMENT`: `staging`
  - `AUTO_INIT_DB`: `false`
  - `ALLOW_DEV_ADMIN_REGISTRATION`: `false`
  - `LOG_LEVEL`: `INFO`
- **Secrets Injection (AWS Secrets Manager ARNs)**:
  - `DATABASE_URL`: `arn:aws:secretsmanager:us-east-1:123456789012:secret:staging/creatoriq/db_url`
  - `SECRET_KEY`: `arn:aws:secretsmanager:us-east-1:123456789012:secret:staging/creatoriq/jwt_secret`
  - `INSTAGRAM_CLIENT_SECRET`: `arn:aws:secretsmanager:us-east-1:123456789012:secret:staging/creatoriq/ig_secret`
  - `YOUTUBE_CLIENT_SECRET`: `arn:aws:secretsmanager:us-east-1:123456789012:secret:staging/creatoriq/yt_secret`
- **Health Check**:
  - Command: `["CMD-SHELL", "curl -f http://localhost:8000/api/health || exit 1"]`
  - Interval: 15s, Timeout: 5s, Retries: 3, Start Period: 10s.

#### B. Migration One-Off Task Definition (CI/CD Pipeline)
- **Container Image**: Same backend container image.
- **Command Override**: `["alembic", "upgrade", "head"]`
- **Execution Mode**: One-off task executed via `ecs:RunTask` during deployment pipeline before updating the backend ECS service.
- **Safety Gate**: If the task returns exit code != 0, deployment halts immediately; zero application traffic shifts.

#### C. Frontend Service Task Definition
- **CPU / Memory**: 0.25 vCPU (256 units), 512 MB RAM.
- **Container Port**: `80` (TCP).
- **Image**: Built from `./frontend/Dockerfile` with `VITE_API_URL=""` (relative `/api/` routing).

### 4.2 Amazon RDS PostgreSQL 16 Configuration
- **Engine**: PostgreSQL 16.3-R1.
- **Instance Class**: `db.t4g.medium` (2 vCPUs, 4 GiB RAM, ARM Graviton2).
- **Storage**: 20 GiB gp3 SSD with storage autoscaling up to 100 GiB.
- **Multi-AZ**: Enabled for staging failover validation.
- **Security & Encryption**:
  - AWS KMS encryption at rest (`aws/rds`).
  - Parameter Group: `rds.force_ssl = 1` (requires TLS for all database connections).
  - Security Group: Inbound port 5432 allowed *only* from the Backend ECS security group.
- **Backup & Retention**:
  - Automated backups: 7-day retention period.
  - Continuous WAL archiving for Point-In-Time Recovery (PITR).
  - Backup window: `03:00 - 04:00 UTC` daily.
  - Maintenance window: `Sunday 04:30 - 05:30 UTC`.

### 4.3 Application Load Balancer (ALB) Routing & TLS Termination
- **Public Ingress**: Internet-facing ALB in public subnets.
- **Security Group**: Inbound ports 80, 443 from `0.0.0.0/0`.
- **HTTP Listener (Port 80)**: Redirects all requests permanently (HTTP 301) to HTTPS (Port 443).
- **HTTPS Listener (Port 443)**:
  - Certificate: Amazon Certificate Manager (ACM) TLS certificate for `staging.creatoriq.com`.
  - Security Policy: `ELBSecurityPolicy-TLS13-1-2-2021-06` (enforces TLS 1.3 / 1.2 with secure ciphers).
  - **Rule 1 (Priority 10)**: Path `/api/*` forwards to `creatoriq-staging-backend-tg`.
    - Health check path: `/api/health`, Matcher: `200`, Interval: 15s.
  - **Rule 2 (Default)**: Path `/*` forwards to `creatoriq-staging-frontend-tg`.
    - Health check path: `/`, Matcher: `200`, Interval: 15s.

### 4.4 CloudWatch Observability & Alarms

| Metric / Alarm | Threshold | Action |
| :--- | :--- | :--- |
| **Backend 5xx Rate** | `HTTPCode_Target_5XX_Count > 1%` over 5 min | High-priority Slack alert / PagerDuty |
| **P95 Latency** | `TargetResponseTime > 1.2s` over 5 min | Medium-priority engineering alert |
| **ECS Backend CPU** | `CPUUtilization > 80%` over 10 min | Auto-scales task count from 2 to 4 |
| **ECS Backend Memory** | `MemoryUtilization > 85%` over 5 min | Alert + Task restart on OOM |
| **RDS Free Storage** | `FreeStorageSpace < 5 GB` | Auto-scales disk; sends storage warning |
| **RDS CPU** | `CPUUtilization > 85%` over 15 min | Alert for query indexing review |

### 4.5 Disaster Recovery Targets
- **Recovery Point Objective (RPO)**: **< 5 minutes** (enabled by continuous WAL stream archiving in RDS).
- **Recovery Time Objective (RTO)**: **< 30 minutes** (automated restore from snapshot or automated failover to Multi-AZ standby replica).

---

## 5. Migration Execution & Rollback Strategy

### 5.1 Deployment Pipeline Sequence (Zero Race Condition)
```
[Code Push to main/staging]
        |
        v
[CI/CD Build & Test]: Run pytest 50/50 tests + Vite build
        |
        v
[Build OCI Images]: Tag backend & frontend images with git commit SHA
        |
        v
[Execute One-Off Migration]:
  aws ecs run-task \
    --cluster creatoriq-staging \
    --task-definition creatoriq-staging-migration \
    --overrides '{"containerOverrides": [{"name": "backend", "command": ["alembic", "upgrade", "head"]}]}'
        |
        v
[Verify Task Exit Code == 0]
   ├── If Success -> Deploy updated ECS Services (rolling blue/green update)
   └── If Failure -> Abort deployment; notify on-call engineer; zero worker downtime
```

### 5.2 Rollback Procedure
If a regression is identified after a migration:
1. Roll back backend code service to previous known-good task definition revision:
   ```bash
   aws ecs update-service --cluster creatoriq-staging --service backend --task-definition creatoriq-staging-backend:<PREVIOUS_REVISION>
   ```
2. Execute one-off downgrade task using Alembic:
   ```bash
   # Revert to previous target migration revision
   alembic downgrade -1
   # Or revert to specific target revision
   alembic downgrade <PREVIOUS_REVISION_HASH>
   ```
3. Verify table constraints and schema health via `/api/health`.

---

## 6. Staging Smoke Test & Verification Plan

Following staging deployment, execute the following systematic verification steps:

### Test Checklist

| Step | Scope | Action | Expected Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Health & DB** | `GET /api/health` | Returns `200 OK`, `status: "ok"`, `database: "postgresql"`. | [ ] |
| **2** | **Dev Admin Gate**| `POST /api/auth/register` with role `admin` | Returns `403 Forbidden` (`ALLOW_DEV_ADMIN_REGISTRATION=false`). | [ ] |
| **3** | **User Lifecycle** | Register creator `c1@stage.com`, login, fetch profile | Returns valid JWT token; profile returns role `creator`. | [ ] |
| **4** | **RBAC Isolation** | Creator attempts `GET /api/admin/users` | Returns `403 Forbidden` (creator blocked from admin endpoints). | [ ] |
| **5** | **Brand CRUD** | Create Brand `Nike Staging`, list brands | Returns `201 Created` with generated brand ID. | [ ] |
| **6** | **Campaign ROI** | Query `GET /api/campaigns/{id}/roi` | Returns accurate ROI, ROAS, CPM, CPE with Decimal precision. | [ ] |
| **7** | **Zero Safety** | Calculate ROI on campaign with `0` spend / impressions | Returns `null` / `unavailable`, not division by zero error. | [ ] |
| **8** | **Report Exports**| Request CSV, Excel, PDF export of campaign | Downloads valid files; no CWE-1236 CSV injection formulas. | [ ] |
| **9** | **OAuth Replay** | Replay an already consumed OAuth state | Rejected with `400 Bad Request` (persistent replay protection). | [ ] |
| **10**| **Container Restart**| Restart backend container; query existing user | Session & tokens remain valid; zero data loss across restart. | [ ] |

---

## 7. Performance & Load Verification Guidelines

- **Baseline Throughput**: Target 250 requests/sec with p95 response time < 150ms on `db.t4g.medium` RDS and 2 Fargate backend tasks.
- **Load Tool**: Run Locust or k6 against `/api/dashboard/overview`, `/api/campaigns/{id}/roi`, and `/api/content`.
- **Database Connection Sizing**: Max connections = `2 backend containers × (10 pool_size + 20 max_overflow) = 60 connections`, well within RDS PostgreSQL `db.t4g.medium` limit of ~400 connections.
- **Connection Leak Detection**: Monitor `SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'` to verify SQLAlchemy pool connection recycling.

