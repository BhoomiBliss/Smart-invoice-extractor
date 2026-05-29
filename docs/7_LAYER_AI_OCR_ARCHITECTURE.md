# Smart Invoice Extractor
## Multi-Agent AI Invoice Intelligence Platform
### 7-Layer OCR + AI Observability Architecture

> A distributed multi-agent AI document intelligence platform that converts unstructured financial invoices into validated structured data using asynchronous queue orchestration, adaptive multimodal model routing, human-in-the-loop correction workflows, and enterprise-grade AI observability pipelines.

```txt
  [Layer 1: Client Interaction Layer] (React UI, Editor Workspace, SSE Hooks)
                  │
                  ▼
  [Layer 2: API Gateway & Security Layer] (Express Gateway, Auth, Rate Limiter)
                  │
                  ▼
  [Layer 3: Queue & Distributed Orchestration] (BullMQ, Redis Engine, Recovery)
                  │
                  ▼
  [Layer 4: OCR & AI Routing Layer] (Model Router & Preprocessing)
                  │
                  ▼
  [Layer 5: Multi-Agent Extraction & Validation] (Parsing, Math Check, Consensus)
                  │
                  ▼
  [Layer 6A: HITL Correction System] ── [Layer 6B: Evaluation & Observability]
                  │
                  ▼
  [Layer 7: Persistence & Analytics Layer] (MongoDB Documents & Logs)
```

---

## Layer 1 — Client Interaction Layer

### System Scope & Boundaries
Operates entirely in the browser context as a Single Page Application (SPA), located under `/apps/web`, managing UI events, state synchronizations, and formatting.

### Core Responsibilities
- **Document Ingestion Workspace**: Drag-and-drop ingestion interface supporting digital PDFs and image inputs.
- **SSE Stream Listener**: Real-time progress tracker binding to `/api/jobs/:id/stream`, handling status bars, heartbeat checks, and auto-reconnect configurations.
- **Human-in-the-Loop Correction Engine**: Fully editable UI synchronizing Table Views, Structured Editing Workspaces, and NLP summaries using Zustand.
- **JWT-Aware Route Guards**: Decodes JWT headers to restrict access to admin views and dashboards.

---

## Layer 2 — API Gateway & Security Layer

### System Scope & Boundaries
The entry gateway for external client requests, located under `/server`, handling validation, rate-limiting, and tenant routing.

### Core Responsibilities
- **Bearer Authentication Guard**: Validates JWT signatures and parses user objects.
- **Tenant Context Isolation**: Intercepts requests and appends tenancy identifiers (`tenantId`), restricting all downstream database queries.
- **Multi-Tier Rate Limiter & Guest Handler**:
  - *Guest (Unauthenticated)*: 3 invoice upload operations per 24 hours (stored in session cache only).
  - *User (Authenticated)*: 50 invoice upload operations per 24 hours.
  - *Admin (Authenticated)*: Unlimited queries.
- **MIME Security Validation**: Rejects malformed binary structures, executable extensions, and script injections before files hit downstream storage.

### Guest Session Runtime
- **Trial Uploads**: Allows instant invoice trials without account creation.
- **Temporary Memory**: Uses temporary memory/session persistence (preventing MongoDB writes).
- **Upload Quota**: Strict upload limits (max 3 uploads/day).
- **Access Limits**: No invoice history persistence, settings editing, or admin analytics access.
- **Purpose**: Reduces onboarding friction and improves SaaS conversion funnel.

---

## Layer 3 — Queue & Distributed Orchestration Layer

### System Scope & Boundaries
Decouples ingestion endpoints from long-running inference jobs to preserve system throughput under high load. Implemented using BullMQ under `/apps/worker` and `/server`.

### Core Responsibilities
- **Asynchronous Task Queue**: BullMQ manages ingestion tasks, updating lifecycle steps in Redis.
- **Local Simulation Worker**: Falls back to an async in-memory task runner array if local Redis configurations are missing.
- **Concurrency Rate Limiter**: Limits parallel inference threads to prevent rate limit exceptions with LLM API keys.
- **Dead-Letter Queue (DLQ)**: Isolates jobs that fail multiple worker retries.
- **Historical Retrieval & Duplicate Detection**:
  - Semantic lookup of historical invoices using MongoDB Atlas Vector Search (optional future enhancement).
  - Duplicate invoice detection checking database records for vendor names, invoice numbers, and totals.
  - Vendor history analytics.
  - *Boundary Note*: This layer is **not** used for live extraction, prompt augmentation, or search reranking.

### Queue Recovery Policies
- **Exponential Retry Backoff**: Retries failed extraction jobs with progressive delays.
- **Dead-Letter Queue Support**: Isolates corrupted files or unrecoverable system failures.
- **Worker Timeout Recovery**: Spawns clean handler processes if active runs exceed latency budgets.
- **Duplicate Job Prevention**: Deduplicates jobs in the queue with matching file hashes.
- **Concurrency Throttling**: Throttle process rate based on active provider load.
- **Queue Persistence**: Preserves queue states in Redis across worker restarts.

---

## Layer 4 — OCR & AI Routing Layer

### System Scope & Boundaries
Selects the target LLM vision/text provider based on file characteristics, located under `/apps/worker`.

### Core Responsibilities
- **AI Document Preprocessing**: Resizes images (300 DPI), performs skew corrections, and detects digital text layers.
- **Adaptive Model Routing & Local Simulation Runtime**: Directs input files based on structural characteristics:
  - *Text-layer PDFs*: Routed to **Gemini 2.0 Flash Lite** for speed and cost efficiency.
  - *Scanned PDFs & Scanned Images*: Routed to **Qwen 2.5 VL** for visual extraction.
  - *Fallback OCR Recovery*: Routed to **Llama 3.2 Vision** if primary extractions time out or fail.
- **Provider Abstraction Layer**: Decouples API implementations from standard execution logic, facilitating fast model routing updates.
- **Development Simulation Engine**: Swaps actual API calls for a deterministic local text parser if model API credentials are not found in the environment configurations.

---

## Layer 5 — Multi-Agent Extraction & Validation Layer

### System Scope & Boundaries
Organizes individual, narrow-focus worker classes into a sequential pipeline, located under `/apps/worker`.

### Core Responsibilities
- **Parsing Agent**: Structures unstructured text lines into normalized JSON models.
- **Validation Agent**: Re-calculates invoice math properties: `sum(lineItems.amount) == totalAmount`. Sets warning indicators on mismatches.
- **Consensus Agent**: Evaluates accuracy parameters across individual fields based on type configurations (Regex, length, and content analysis).
- **Duplicate Detection**: Queries DB records to catch pre-existing entries using vendor, invoice number, and totals checks.
- **Data Normalizer**: Standardizes values (ISO dates, currencies, and decimal numbers).

---

## Layer 6 — Evaluation, Observability & Human Feedback Layer

### System Scope & Boundaries
Binds application analytics and user behavior directly to the LLM tracing loop, bridging `/apps/web`, `/apps/worker`, and `/server`.

### Layer 6A — Human-in-the-Loop Correction System
- **Dynamic Editor Workspace**: Coordination of state edits across Table, JSON, and NLP summary views.
- **User Correction Tracking**: Generates detailed change arrays logging original and modified parameters.
- **Structured JSON Workspace Sync**: Formats, parses, and validates user manual edits against Zod schemas.
- **Manual Overrides**: Allows auditors to force-correct vendor names, dates, quantities, and totals.
- **Validation Feedback**: Triggers real-time math audits and highlights discrepancies.
- **Field Confidence Visualization**: Highlights low-confidence cells with red/yellow indicators.

### Layer 6B — Evaluation & Observability System
- **Langfuse Observability Tracing**: Logs execution runs, prompts, prompt versions, and token usage variables.
- **Financial Cost Telemetry**: Calculates exact model cost metrics based on token prices.
- **Latency Monitoring**: Tracks p50, p95, and p99 speeds across ingestion and model routing.
- **Hallucination Auditing**: Identifies runs where high confidence extractions required extensive human edits.
- **Evaluation Metrics**:

| Metric | Purpose |
| --- | --- |
| **Field Accuracy** | Measures the correctness of individual extracted properties compared to verified values. |
| **Correction Rate** | Ratio of fields edited manually by human operators in the editor workspace. |
| **Validation Failure Rate** | Percentage of uploads showing mathematical errors (line-items vs totals). |
| **Retry Frequency** | Tracks unstable provider outputs requiring automatic retries. |
| **Fallback Frequency** | Measures how often the engine routes to fallback models. |
| **p50 / p95 Latency** | Evaluates response speeds across ingestion and model routing. |
| **Estimated Cost per Invoice** | Logs token metrics and spending trends in USD. |

> [!IMPORTANT]
> Human corrections collected from the Dynamic Editing Workspace are treated as evaluation signals rather than simple UI edits, enabling continuous monitoring and future fine-tuning workflows.

---

## Layer 7 — Persistence & Analytics Layer

### System Scope & Boundaries
The systems of record for structured invoices, user accounts, audit trails, and dashboard telemetry. Shared via `/packages/database` and persisted in MongoDB.

### Core Responsibilities
- **MongoDB Atlas Storage**: Persists users, invoices, logs, and job documents using Mongoose schemas.
- **Historical Search**: Exposes paginated indexes supporting text searches and vector matching using MongoDB Atlas Vector Search (optional future enhancement).
- **Audit Logging**: Saves details of user updates, administrative configurations, and model threshold adjustments.
- **Analytics Aggregator**: Evaluates and delivers pipeline analytics (accuracy trends, p95 latencies, costs) to Recharts components on Admin consoles.

---

## System Technology Matrix

| Layer | Primary Technology |
| --- | --- |
| **Frontend** | React + Vite + TypeScript |
| **UI Styling** | TailwindCSS + Framer Motion |
| **State Layer** | Zustand + TanStack Query |
| **Backend API** | Node.js + Express |
| **Database** | MongoDB Atlas |
| **Queue Layer** | Redis + BullMQ |
| **OCR Routing** | Gemini 2.0 Flash Lite + Qwen 2.5 VL + Llama 3.2 Vision |
| **Validation** | Zod |
| **Observability** | Langfuse + OpenTelemetry |
| **Deployment** | Docker + Render + Vercel |
