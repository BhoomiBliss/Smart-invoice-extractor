# InvoiceFlow AI

An invoice-document processing prototype organized as a web client, API server, and background worker. The repository documents a workflow for extracting invoice fields from uploaded documents and reviewing the structured result.

> **Project status:** Personal project. The architecture and milestone documents describe intended capabilities; verify the current implementation and demo before describing features as complete. Do not commit API keys or real invoice data.

## Repository layout

- `apps/web` — React and Vite client
- `apps/worker` — background worker app
- `server` — Express API
- `packages` — shared packages
- `docs` — architecture, API, schema, deployment, and implementation notes

## Local setup

The repository includes a root `.env.example`, `docker-compose.yml`, and npm workspaces. From the repository root:

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

Review the environment template and deployment notes before starting services. Add only local development credentials to `.env`; never commit that file. The commands above are documented setup steps and have not been run as part of this README update.

## Stack

The codebase documents a React/Vite interface, Express API, MongoDB and Redis services, npm workspaces, and a background processing flow. Check the linked implementation and package files for the current details.

## Notes

This is a project showcase, not a production-readiness or accuracy claim. No extraction accuracy, latency, uptime, or customer-impact metrics are stated here.
