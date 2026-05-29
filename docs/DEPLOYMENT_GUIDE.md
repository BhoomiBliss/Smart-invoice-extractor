# Deployment Guide - Smart Invoice Extractor

We deploy our platform components across Vercel, Render, and MongoDB Atlas.

---

## 1. Production Architecture Services

- **Frontend**: Hosted on Vercel.
- **Backend API Gateway**: Hosted on Render as a Web Service.
- **BullMQ Workers**: Hosted on Render as a background Worker Service (connected to same Redis).
- **Primary Database**: MongoDB Atlas.
- **Queue/Broker Cache**: Upstash Redis (or fully managed Redis cloud).

---

## 2. CI/CD Ingestion Pipeline (GitHub Actions)

We automate deployment workflows using GitHub Actions:

```yaml
name: Monorepo Production Integration & Delivery

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm install
      - name: Run Linters
        run: npm run lint
      - name: Compile Typescript
        run: npx turbo run build
      - name: Execute Jest integration tests
        run: npm run test
```

- **Frontend Auto-deploy**: Merges to `main` trigger Vercel deploy web hooks. Pull requests trigger Vercel preview environments.
- **Backend Web/Worker deploy**: Render is configured to auto-deploy changes on successful builds on target directories (`/server` and `/apps/worker`).
