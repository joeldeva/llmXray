# LlmXray Frontend

This is the public web app for LlmXray, an AI API Gateway and DLP scanner for enterprise AI workflows.

The landing page and dashboard are written for teams routing prompts and files through any AI product, model provider, internal assistant, or automation pipeline.

## Live App

- Landing page: https://frontend-azure-beta-85.vercel.app
- Admin dashboard: https://frontend-azure-beta-85.vercel.app/admin
- Backend API: https://backend-gamma-livid-54.vercel.app
- Repository: https://github.com/joeldeva/llmXray.git

## What It Contains

- Interactive 3D landing page for the LlmXray gateway.
- API-first product messaging for prompt and file scanning.
- Admin dashboard views for audit events, policy review, analytics, and settings.
- Client wiring for the backend API under `/api`.

## Tech Stack

- React
- TypeScript
- Vite
- Three.js
- Recharts
- Lucide React

## Local Setup

```bash
npm install
npm run dev
```

The development server defaults to:

```text
http://localhost:5173
```

## Environment

Use this when pointing the frontend at the hosted backend:

```text
VITE_API_BASE_URL=https://backend-gamma-livid-54.vercel.app/api
```

For local backend development:

```text
VITE_API_BASE_URL=http://localhost:3001/api
```

Only public browser-safe values should use the `VITE_` prefix. Do not put API keys, database URLs, or master credentials in frontend environment variables.

## Build

```bash
npm run build
```

The production build outputs to `dist/`.

## Deployment

This app is deployed on Vercel as the LlmXray frontend. The backend remains a separate Vercel deployment and is reached through `VITE_API_BASE_URL`.
