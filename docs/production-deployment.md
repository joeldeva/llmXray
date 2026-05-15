# LlmXray API Production Deployment Guide

This guide covers a baseline hosted API deployment. Adjust it to your cloud provider and enterprise controls.

## Required Infrastructure

- HTTPS domain for the API, for example `https://llmxray-api.company.com`.
- PostgreSQL 16+ with automated backups.
- Admin dashboard hosting, for example `https://llmxray.company.com`.
- Secret manager for environment variables.
- SIEM HTTP collector endpoint, if audit forwarding is required.

## Backend Environment

Set these before production:

```text
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://...
DATABASE_SSL=true
ALLOWED_ORIGINS=https://llmxray.company.com,https://your-product.company.com
JWT_SECRET=<32+ random bytes>
ADMIN_USERS_JSON=[{"email":"admin@company.com","passwordHash":"...","role":"admin"}]
LLMXRAY_MASTER_API_KEY=<random bootstrap key used only to generate API keys>
LLMXRAY_TENANT_ID=company-id
LLMXRAY_ENFORCE_DEVICE_REGISTRY=false
AUDIT_RETENTION_DAYS=365
SIEM_WEBHOOK_URL=https://siem.company.com/collector
SIEM_WEBHOOK_TOKEN=<siem-token>
```

Run:

```bash
cd backend
npm ci --omit=dev
npm run db:migrate
npm start
```

## API Smoke Test

```bash
curl -X POST https://llmxray-api.company.com/api/scan/prompt \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $LLMXRAY_API_KEY" \
  -H "X-LlmXray-Tenant-Id: company-id" \
  -H "X-LlmXray-Client-Id: web-app" \
  -H "X-LlmXray-Subject-Id: user@company.com" \
  -d '{"prompt":"Here is my key sk-EXAMPLE-REDACTED","site":"my-product"}'
```

Expected decision: `BLOCK`.

Generate an org API key after deployment:

```bash
curl -X POST https://llmxray-api.company.com/api/keys/generate \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $LLMXRAY_MASTER_API_KEY" \
  -d '{"email":"admin@company.com","org":"company-id","plan":"team"}'
```

## Postgres

Run migrations before first start and during deploys:

```bash
npm run db:migrate
```

Backups:

```powershell
$env:DATABASE_URL="postgres://..."
.\scripts\backup-postgres.ps1
```

Retention:

```bash
AUDIT_RETENTION_DAYS=365 npm run retention
```

## Docker Compose Smoke Test

```bash
docker compose up --build
```

Local services:

- Backend API: `http://localhost:3001`
- Frontend dashboard: `http://localhost:8080`
- Postgres: `localhost:5432`

## Production Certification Boundary

The repository can provide controls and evidence, but "certified" status requires external work:

- Penetration test.
- SOC 2 / ISO 27001 control mapping.
- Legal review of privacy/compliance docs.
- Vendor risk review by target customers.
