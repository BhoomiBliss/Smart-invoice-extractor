# InvoiceFlow AI
## Multi-Agent Document Intelligence & Invoice Processing Platform

InvoiceFlow AI is a production-grade, highly resilient **Multi-Agent AI Document Ingestion & Extraction Platform** that converts unstructured physical invoices, scans, and PDFs into verified financial data models. It integrates a secure modular Express API Gateway, a distributed BullMQ task worker queue, a 3-layer resilient API key failover routing matrix, a glassmorphic conflict reconciliation Zustand editor, and deep Langfuse AI observability loops.

---

## 🏗️ System Design & Architecture

The platform follows a decoupled, 7-layer distributed multi-agent architecture. Below is the live, animated visual data pipeline showing how client sessions, request gateways, worker queues, and the 3-layer extraction router operate in parallel:

![InvoiceFlow AI System Architecture](docs/system_design.svg)

---

## ⚡ Technical Documentation Directory

Complete specifications for all architectural features are cataloged under the `/docs` folder:
1. **[7_LAYER_AI_OCR_ARCHITECTURE.md](docs/7_LAYER_AI_OCR_ARCHITECTURE.md)**: Conceptual specifications for system boundaries, model routers, and data telemetry.
2. **[FRONTEND_BACKEND_IMPLEMENTATION_PLAN.md](docs/FRONTEND_BACKEND_IMPLEMENTATION_PLAN.md)**: Deep technical definitions of Zustand editors, Write Mutex Queues, API payloads, and Zod schemas.
3. **[TASK_TRACKER.md](docs/TASK_TRACKER.md)**: Production release milestone logs tracking development from Phase A Scaffolding to Phase H Resilient Failovers.
4. **[API_REFERENCE.md](docs/API_REFERENCE.md)**: Fully cataloged Express REST endpoints request/response schemas.
5. **[DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)**: Strictly typed Mongoose models (User, Invoice, Telemetry, Log, Job).
6. **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**: Cloud hosting instructions (Vercel, Render, Atlas) and CI/CD pipelines.

---

## 🔁 3-Layer Multimodal AI Failover Strategy

To bypass provider rate limits (HTTP 429) or temporary service outages (HTTP 500), the extraction engine implements an automatic three-layer failover route:

```txt
                       Ingested Invoice File
                                 │
                                 ▼
                     [ExtractionService Router]
                                 │
         ┌───────────────────────┼───────────────────────┐
         │ (Try)                 │ (Fallback 1)          │ (Fallback 2)
         ▼                       ▼                       ▼
     Route A                 Route B                 Route C
  Gemini 1.5 Flash       OpenRouter Vision       Local Tesseract OCR
   (3-Key Rotation)       (2-Key Rotation)      + Mistral-7B structuring
```

*   **ROUTE A — Gemini 1.5 Flash (Primary)**: Dispatched for high-speed, cost-effective structured extraction (2-3s). Employs a **Gemini Key Pool** containing 3 API keys rotated in a thread-safe round-robin cursor. If a key hits a rate-limit, it is placed on a **60s cooldown**; if a key fails, it enters a **5-minute cooldown**.
*   **ROUTE B — OpenRouter Qwen-2.5-VL Vision (Backup)**: Triggers automatically if the entire Gemini pool is rate-limited or fails. DISPATCHES image data URLs to the vision LLM (`qwen/qwen2.5-vl-7b-instruct:free`) via the `openai` SDK, scrubbing markdown code blocks defensively prior to JSON parsing.
*   **ROUTE C — Tesseract + Mistral (Last Resort)**: Runs completely locally using `tesseract.js` on the image buffer (pre-resized using `sharp` to avoid event-loop blocking), then structures raw text using `mistralai/mistral-7b-instruct:free` on OpenRouter. Gracefully serves empty schemas if APIs are entirely offline.

---

## 🧱 Layered Monorepo Structure

The monorepo is managed via Turborepo, isolating execution domains to prevent runtime dependencies drift and duplicate configurations:

```txt
multi-agent-invoice-platform/
├── apps/
│   ├── web/           # React + Vite + TS Client (Zustand Slices, Framer Motion UI)
│   └── worker/        # BullMQ Worker process running the 6-agent extraction pipeline
├── packages/
│   ├── database/      # Shared Mongoose connections, indexes, and schemas
│   └── shared/        # Shared constants, utilities, and non-negative Zod validators
├── server/            # REST API Express Gateway (secured via httpOnly cookies & JWTs)
├── docs/              # Systems architecture flowcharts and technical documents
└── docker-compose.yml # Backup MongoDB database & Redis cache containers setup
```

---

## 🛠️ Local Development & Quick Start

### 1. Configure Environments
Copy the template variables file and inject your provider key pools:
```bash
cp .env.example .env
```

### 2. Boot Local Backing Infrastructure
Launch the MongoDB and Redis containers:
```bash
docker-compose up -d
```

### 3. Install Monorepo Workspaces Dependencies
From the repository root folder, run npm install to bootstrap the Turborepo package bindings:
```bash
npm install
```

### 4. Launch Development Servers
Run the dev task command. Turborepo will launch the REST Gateway, Worker process, and React client simultaneously:
```bash
npm run dev
```

Open your browser at `http://localhost:3000` to start ingesting documents and watching real-time SSE progress events!
