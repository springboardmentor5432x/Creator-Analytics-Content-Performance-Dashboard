# CreatorIQ — Enterprise Azure Cloud Architecture & Deployment Guide

This document specifies the enterprise production deployment architecture for **CreatorIQ** on **Microsoft Azure**, fulfilling the multi-cloud deployment requirement of Module 10 alongside existing AWS and Docker architectures.

---

## 1. Architectural Overview & Component Mapping

CreatorIQ employs a high-availability, 3-tier microservice and storage topology:

```mermaid
flowchart TD
    Client(["Global Creators & Brands"]) --> FrontDoor["Azure Front Door / App Gateway (WAF + CDN + SSL)"]
    FrontDoor -->|/api/*| BackendACA["Azure Container Apps: FastAPI Backend (Auto-scaling 1-10)"]
    FrontDoor -->|/*| FrontendACA["Azure Container Apps: React + Nginx (Static Content)"]

    BackendACA --> PG["Azure Database for PostgreSQL Flexible Server (Zone-Redundant HA)"]
    BackendACA --> Redis["Azure Cache for Redis (Metrics Caching & Celery Broker)"]
    BackendACA --> Cosmos["Azure Cosmos DB for MongoDB (Raw Social Feeds & Unstructured Logs)"]

    Redis <--> CeleryWorker["Azure Container Apps: Celery Worker & Beat (Background Tasks)"]
    CeleryWorker --> PG
    CeleryWorker --> Cosmos

    KV["Azure Key Vault"] -.->|Managed Identity Secrets Injection| BackendACA
    KV -.->|Managed Identity Secrets Injection| CeleryWorker

    AppInsights["Azure Monitor & Application Insights"] -.->|Telemetry & Logs| BackendACA
    AppInsights -.->|Telemetry & Logs| FrontendACA
```

### Component Mapping Matrix

| Platform Layer | CreatorIQ Component | Azure Managed Service | Sizing / SKU Recommendation |
| :--- | :--- | :--- | :--- |
| **Edge & Ingress** | WAF & Reverse Proxy | Azure Front Door / Application Gateway v2 | WAF_v2 with OWASP Core Ruleset 3.2 |
| **Frontend UI** | React + Vite + Tailwind | Azure Container Apps / Static Web Apps | Standard (Consumption) |
| **API Backend** | FastAPI ASGI Engine | Azure Container Apps | 1.0 vCPU, 2.0 GiB RAM (Auto-scale 1–10) |
| **Background Tasks**| Celery Worker & Scheduler | Azure Container Apps (Background Mode) | 0.5 vCPU, 1.0 GiB RAM |
| **Relational Data** | 16 Normalized Tables | Azure Database for PostgreSQL Flexible Server | General Purpose D4ds_v5 (4 vCPU, 16GB RAM) |
| **NoSQL Store** | Raw Social Payload Dumps | Azure Cosmos DB (MongoDB API) | 400–1000 RU/s Autoscale |
| **Cache & Broker**  | Redis & WebSocket State | Azure Cache for Redis | Standard C1 (1 GB) / Premium P1 |
| **Secrets & Keys**  | JWT, OAuth Tokens, Keys | Azure Key Vault | Standard Tier with RBAC |
| **Observability**   | Health, Logs, APM | Azure Application Insights & Log Analytics | Pay-as-you-go Workspace |

---

## 2. Infrastructure as Code / Azure CLI Provisioning

### 2.1 Resource Group & Virtual Network Setup

```bash
# 1. Create Resource Group
az group create --name rg-creatoriq-prod --location eastus

# 2. Create Virtual Network with Dedicated Subnets
az network vnet create \
  --name vnet-creatoriq \
  --resource-group rg-creatoriq-prod \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-apps \
  --subnet-prefix 10.0.1.0/24

az network vnet subnet create \
  --name snet-postgres \
  --resource-group rg-creatoriq-prod \
  --vnet-name vnet-creatoriq \
  --address-prefix 10.0.2.0/24 \
  --delegations Microsoft.DBforPostgreSQL/flexibleServers
```

### 2.2 PostgreSQL Flexible Server Provisioning

```bash
az postgres flexible-server create \
  --name psql-creatoriq-prod \
  --resource-group rg-creatoriq-prod \
  --location eastus \
  --admin-user creatoriq_admin \
  --admin-password 'ReplaceWithKeyVaultSecret123!' \
  --sku-name Standard_D2ds_v5 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 16 \
  --vnet vnet-creatoriq \
  --subnet snet-postgres \
  --high-availability ZoneRedundant
```

### 2.3 Azure Cache for Redis & Azure Cosmos DB (MongoDB API)

```bash
# 1. Azure Cache for Redis
az redis create \
  --name redis-creatoriq-prod \
  --resource-group rg-creatoriq-prod \
  --location eastus \
  --sku Standard \
  --vm-size c1 \
  --enable-non-ssl-port false

# 2. Azure Cosmos DB with MongoDB API
az cosmosdb create \
  --name cosmos-creatoriq-prod \
  --resource-group rg-creatoriq-prod \
  --kind MongoDB \
  --server-version 7.0 \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0
```

### 2.4 Azure Key Vault & Secrets Management

```bash
az keyvault create \
  --name kv-creatoriq-prod \
  --resource-group rg-creatoriq-prod \
  --location eastus \
  --enable-rbac-authorization true

# Store credentials
az keyvault secret set --vault-name kv-creatoriq-prod --name "JWT-SECRET-KEY" --value "<SECURE_TOKEN>"
az keyvault secret set --vault-name kv-creatoriq-prod --name "DATABASE-URL" --value "postgresql://creatoriq_admin:PASS@psql-creatoriq-prod.postgres.database.azure.com:5432/creatoriq?sslmode=require"
az keyvault secret set --vault-name kv-creatoriq-prod --name "REDIS-URL" --value "rediss://:KEY@redis-creatoriq-prod.redis.cache.windows.net:6380/0"
```

### 2.5 Azure Container Apps Environment & Deployment

```bash
# 1. Create Log Analytics Workspace & Container App Environment
az monitor log-analytics workspace create \
  --resource-group rg-creatoriq-prod \
  --workspace-name log-creatoriq

LOG_ID=$(az monitor log-analytics workspace show --resource-group rg-creatoriq-prod --workspace-name log-creatoriq --query customerId -o tsv)
LOG_KEY=$(az monitor log-analytics workspace get-shared-keys --resource-group rg-creatoriq-prod --workspace-name log-creatoriq --query primarySharedKey -o tsv)

az containerapp env create \
  --name aca-env-creatoriq \
  --resource-group rg-creatoriq-prod \
  --location eastus \
  --logs-workspace-id $LOG_ID \
  --logs-workspace-key $LOG_KEY

# 2. Deploy FastAPI Backend Container App
az containerapp create \
  --name ca-creatoriq-backend \
  --resource-group rg-creatoriq-prod \
  --environment aca-env-creatoriq \
  --image creatoriqcr.azurecr.io/backend:latest \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 1.0 --memory 2.0Gi \
  --env-vars \
    ENVIRONMENT=production \
    AUTO_INIT_DB=false \
    DATABASE_URL=secretref:db-url \
    REDIS_URL=secretref:redis-url \
    SECRET_KEY=secretref:jwt-secret

# 3. Deploy Frontend Container App
az containerapp create \
  --name ca-creatoriq-frontend \
  --resource-group rg-creatoriq-prod \
  --environment aca-env-creatoriq \
  --image creatoriqcr.azurecr.io/frontend:latest \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 --memory 1.0Gi
```

---

## 3. High Availability, Zero-Downtime Deployment & Health Checks

1. **Alembic Pre-Deployment Migration**:
   - Automated migration runner executed via GitHub Actions or Azure Container Apps Job prior to traffic shifting.
   - Database connection pooling with `pool_pre_ping=True` prevents stale connection termination during Azure failovers.
2. **Blue/Green Revisions**:
   - Azure Container Apps automatically provisions revision slots (`revisions.active`).
   - Health probes (`/api/health`) verify database and Redis connectivity before routing traffic to the new revision.
3. **Graceful Degradation**:
   - If Redis is unreachable, the backend transparently activates in-memory TTL caching with zero user downtime.
   - If MongoDB is unreachable, raw document dumps are safely queued in-memory.

---

## 4. Cost Optimization & Monitoring

- **Consumption Auto-scale**: Azure Container Apps scales to zero or minimal baseline replicas during off-peak hours.
- **Reserved Capacity**: Azure PostgreSQL Flexible Server 1-year reserved instances reduce operational compute cost by up to 40%.
- **Alert Rules**: CloudWatch/Azure Monitor alerts configured for HTTP 5xx spikes (>1%), database storage threshold (>80%), and connection saturation (>85%).

