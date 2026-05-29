# 7-Layer AI-Powered Invoice Intelligence Architecture

## System Flow Overview

The platform uses a layered multi-agent process to securely ingest, analyze, and validate invoices, streaming updates to users and logging performance metrics.

```txt
  [User Ingestion] (Layer 1)
         │
         ▼
  [API Gateway & Rate Limiting] (Layer 2)
         │
         ▼
  [BullMQ/Queue Orchestrator] (Layer 3) ──► [SSE Connection Stream]
         │
         ▼
  [Vision/Text Model Router] (Layer 4)
         │
         ▼
  [Multi-Agent Validation & Parsing] (Layer 5)
         │
         ▼
  [Dynamic Correction & User Sync] (Layer 6: Dynamic Editor UI)
         │
         ▼
  [Langfuse Observability Logging] (Layer 6: Monitoring telemetry)
         │
         ▼
  [MongoDB Atlas Storage & Audit logs] (Layer 7)
```

---

## Layer 1 — Client & Upload Layer

### Responsibilities
- **React Frontend SPA**: Provides a fast, responsive user workspace.
- **Ingestion Workspace**: Drag-and-drop file ingestion using standard React event bindings. Supports PDF, JPG, and PNG files up to 10MB.
- **Route Authorization Guard**: Protects workspace paths by checking JWT signatures and redirects routes automatically based on user roles (`user` vs `admin`).
- **Real-Time Job Tracing Hook**: Subscribes to SSE endpoints on upload, updating visual stages dynamically based on worker events.

---

## Layer 2 — API Gateway Layer

### Responsibilities
- **Authentication Gateway**: Verifies the JWT payload attached to incoming requests and sets the user context.
- **Tenant Resolver & Security Isolation**: Directs query routes to only target documents containing the matching user's tenant ID, preventing multi-tenant data cross-contamination.
- **Tiered Rate Limiter**:
  - *Guest (Unauthenticated)*: 3 invoice upload operations per 24 hours.
  - *User (Authenticated)*: 50 invoice upload operations per 24 hours.
  - *Admin (Authenticated)*: Unlimited queries.
- **File Validation Filters**: Strictly intercepts uploads using MIME checkers. Rejects malformed files, scripts disguised as images, or oversized attachments before they reach storage.

---

## Layer 3 — Queue & Orchestration Layer

### Responsibilities
- **Redis Queue Manager**: BullMQ receives upload jobs from the API gateway and schedules background process executions asynchronously.
- **Job Lifecycle Dispatcher**: Tracks processing phases (`queued` -> `preprocessing` -> `ocr` -> `parsing` -> `validation` -> `completed` / `failed`) and stores logs in Redis.
- **Resilient Fallback Runner**: If Redis is down, the queue dynamically falls back to an async in-memory task runner array using Node.js event schedulers, guaranteeing local runtime survival.
- **SSE Stream Server**: Automatically streams real-time state changes from workers to client hooks using an active EventSource stream.

---

## Layer 4 — OCR & Model Router Layer

### Responsibilities
- **Smart routing engine**: Examines file metadata and preprocessed metrics to route documents to the optimal model:
  - *Digital PDFs (Text layer available)*: Routed to **Gemini 2.0 Flash Lite** for speed and cost efficiency.
  - *Scanned Images & Scanned PDFs (Visual data)*: Routed to **Qwen 2.5 VL** for visual OCR.
  - *Fallback / Heavy Tables*: Routed to **Llama 3.2 Vision**.
- **Local Simulation Engine**: If external model API keys are missing in the `.env` settings, the router redirects execution to a local deterministic text parser. This extracts structured fields based on mock invoice mockups, letting developers test UI state and validation without billing cost.
- **Routing Reliability Tracker**: Automatically falls back to alternative models in the chain if the primary model times out or errors.

---

## Layer 5 — Parsing & Validation Layer

### Responsibilities
- **Multi-Agent Orchestrator**: Directs the processing lifecycle using individual specialized agents:
  - *UploadAgent*: Writes file payload to disk or cloud.
  - *OCRAgent*: Calls Model Router to parse raw texts/coordinates.
  - *ParsingAgent*: Parses model text responses into strict JSON.
  - *ValidationAgent*: Re-calculates line items: `sum(lineItems.amount) == totalAmount`. If mismatch, marks `mathValid = false`.
  - *ConsensusAgent*: Evaluates confidence score per field (Regex compliance, currency checking, format validation).
  - *DBWriterAgent*: Saves final values to collections.
- **Document Normalization**: Converts currencies, formats vendor names into a canonical taxonomy, and validates date formats against ISO standards.
- **Duplicate Document Check**: Performs hybrid queries checking database history for existing documents containing matching vendor names, invoice numbers, and totals.

---

## Layer 6 — AI Observability & Human Feedback Layer

### Responsibilities
- **Langfuse Integration**: Connects to the external Langfuse observability engine, logging prompt traces, latency markers, token usage counts, and system exceptions.
- **Telemetry Analysis**: Records field-level confidence parameters (`0.0 - 1.0` rating per field) and maps them to prompt revisions.
- **Human-in-the-Loop Feedback Logging**: All user corrections and overrides completed in the Dynamic Editor are compiled as manual scores. The system posts these edits back to Langfuse, linking the corrections to the exact historical run ID.
- **Hallucination auditing**: Automates tracking of mismatches between AI extraction results and manual edits. Logs warnings on files where high AI confidence ratings resulted in heavy human modifications.

---

## Layer 7 — Persistence & Analytics Layer

### Responsibilities
- **Mongoose Data Layer**: Manages read/write operations to MongoDB for users, invoice documents, telemetry parameters, and system logs.
- **Historical Invoices Lookup**: Exposes paginated filters for document archives.
- **API Analytics & KPI aggregators**: Evaluates data summaries (total volume processed, accuracy ratios, average pipeline latencies, model costs) and presents them to Recharts widgets on Admin logs.
- **Audit Trails**: Keeps a permanent historical record of administrative system adjustments, OCR threshold changes, and database modifications.
