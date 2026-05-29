# FRONTEND_BACKEND_IMPLEMENTATION_PLAN.md

## SECTION 1 — Project Overview

### Project Goal
To build a production-grade, highly resilient **Multi-Agent AI Document Intelligence Platform** that automates the ingestion, extraction, and validation of financial invoices using modern vision and text LLMs, with real-time feedback loop processing and enterprise-level system monitoring.

### Problem Statement
Unstructured invoices vary widely in formatting, language, and quality. Traditional extraction systems fail when encountering complex tabular layouts or scanned documents, and Large Language Models (LLMs) are prone to hallucinations or minor numerical inaccuracies. In production environments, these errors can lead to direct financial discrepancies if not corrected by human auditors.

### Target Users
- **Standard Users / Accountants**: Ingest invoices, audit extraction results, correct fields, and export structured data.
- **System Admins**: Check system health, monitor routing efficiency, configure LLM thresholds, and review operational logs.
- **Guest Users**: Test the platform's extraction accuracy instantly without signing up.

### Core Features
- Adaptive multimodal routing using Gemini, Qwen, and Llama.
- Human-in-the-Loop Correction Engine synchronized across three real-time reactive views (Table, JSON, NLP Summary).
- SSE-driven real-time progress tracing.
- Advanced AI Observability using Langfuse for latency tracking, prompt validation, and tracing user corrections.
- Comprehensive Admin telemetry showing cluster load, error rates, and API cost metrics.

---

## SECTION 2 — Monorepo Structure

```txt
multi-agent-invoice-platform/
│
├── apps/
│   ├── web/                                   # React Frontend Application
│   │   ├── src/
│   │   │   ├── api/                           # Axios instances and API routes
│   │   │   ├── assets/                        # Static files and global styling
│   │   │   ├── components/                    # UI blocks (common, dashboard, editor, chatbot, etc.)
│   │   │   ├── config/                        # Routes registry & env mappings
│   │   │   ├── context/                       # AuthContext & ThemeContext providers
│   │   │   ├── hooks/                         # useAuth, useSSE, useInvoices, useQueueStatus
│   │   │   ├── layouts/                       # Layout frameworks
│   │   │   ├── pages/                         # Core route panels
│   │   │   ├── store/                         # Zustand (auth, invoice, editor, telemetry, queue)
│   │   │   └── utils/                         # CSV exporters, formatters
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── worker/                                # BullMQ Distributed Worker Service
│       ├── src/
│       │   ├── agents/                        # Specialized workers (Upload, OCR, parsing, etc.)
│       │   ├── pipeline/                      # Model routing and retry configurations
│       │   ├── telemetry/                     # Langfuse clients, tracing wrappers, log managers
│       │   ├── queue/                         # BullMQ task listeners and memory fallbacks
│       │   └── services/                      # SSE broadcasts, storage wrappers, extraction pipeline
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── config/                                # Central ESLint, Prettier, Tailwind presets
│   ├── database/                              # Shared Mongoose connections and schema models
│   │   ├── src/
│   │   │   ├── connection/                    # MongoDB atlas reconnect systems
│   │   │   └── models/                        # User, Invoice, AuditLog, QueueJob, Telemetry models
│   │   └── package.json
│   │
│   └── shared/                                # Shared schemas, types, and validation helpers
│       ├── src/
│       │   ├── types/                         # Central TypeScript models
│       │   ├── schemas/                       # Zod validation schemas
│       │   └── constants/                     # Currency rates and error lists
│       └── package.json
│
├── server/                                    # Express API Gateway
│   ├── src/
│   │   ├── config/                            # Environment variables and clients (Redis, Mongo)
│   │   ├── middleware/                        # Token verification, rate limits, MIME buffers
│   │   ├── routes/                            # Router entry points (/auth, /invoice, /telemetry)
│   │   ├── controllers/                       # API request coordinators
│   │   ├── services/                          # Business logics
│   │   └── index.ts                           # Gateway server entry point
│   ├── package.json
│   └── tsconfig.json
│
└── docs/                                      # System technical design files
    ├── FRONTEND_BACKEND_IMPLEMENTATION_PLAN.md
    └── 7_LAYER_AI_OCR_ARCHITECTURE.md
```

---

## SECTION 3 — Technology Constraints & Design Decisions

Below is the technology governance matrix explaining the platform's core design decisions:

| Decision | Reason |
| --- | --- |
| **MongoDB instead of PostgreSQL** | Faster document iteration for evolving, schema-agnostic invoice formats. |
| **BullMQ instead of direct request processing** | Decouples heavy OCR and API routing workloads from Express thread cycles. |
| **SSE instead of WebSockets** | Lightweight, native one-way real-time progress broadcasts without server socket management overhead. |
| **Zustand instead of Redux** | Zero boilerplate and simpler reactive synchronization across multiple synchronized views. |
| **Multi-model routing** | Maximizes parsing accuracy while optimizing API billing costs. |
| **Human correction layer** | Direct verification mechanism for sensitive financial accounting workflows. |

---

## SECTION 4 — Frontend Implementation

The frontend UI will be built as an interactive React SPA with a futuristic dark theme and smooth Framer Motion transitions:

### Home Page
- CSS animated gradient mesh background.
- Lumina logo wordmark with hover glow.
- CTAs: "User Login", "Admin Portal", and "Try as Guest".
- Feature highlight grid showing the 6 primary components with hover scaling.
- Floating statistics strip displaying real-time metrics (e.g. 10M+ processed).

### Authentication
- Styled Sign-In, Sign-Up, and Forgot Password panels with error/success alerts.
- Redirect guards based on current user role.

### User Dashboard
- Left sidebar routing to:
  1. **Document Ingestion Pipeline**: Drag-and-drop zone using `react-dropzone` with animated progress steps ("Queued" -> "Processing" -> "Completed") connected to an SSE hook.
  2. **Invoice History**: Paginated, filterable grid displaying invoice lists with field confidence badges and a CSV export handler. (Disabled for Guest users).
  3. **Human-in-the-Loop Correction Engine**: An editing interface showing:
     - *Table View*: Editable grid using `<input>` fields, math validation warning banners, and row add/delete options.
     - *Structured Editing Workspace*: Formatted editable text area validating JSON schema.
     - *Summary View*: Template-driven NLP paragraph that updates React state reactively.
  4. **Settings & Support**: Integration connection toggles (Google Drive, Slack, S3) and support ticket forms.
  5. **AI Assistance Workspace**: An AI assistant panel using scoped database queries to answer user questions about invoice items.

### Admin Dashboard
- Left sidebar routing to:
  1. **Dashboard Analytics**: High-quality KPI cards tracking throughput, costs, and error rates with Recharts line/pie/bar widgets.
  2. **Identity IAM**: User accounts manager allowing role modification and account deactivation.
  3. **System Health**: Cluster resource usage charts (CPU, memory, latency thresholds) and network uptime logs.
  4. **OCR Engine settings**: Sliding thresholds for confidence routing and model deployment logs.
  5. **Audit Log Console**: SSE-driven scrolling dashboard showing color-coded raw info/warning/error logs.
  6. **API Documentation**: Interactive API reference for developer integrations.

---

### State Management Architecture

The frontend application uses specific state layers to isolate DOM changes and caching:

| State | Technology |
| --- | --- |
| **Auth State** | Context API |
| **Dynamic Editor State** | Zustand |
| **Server Cache** | TanStack Query |
| **SSE Streaming State** | Custom Hooks |
| **Form Validation** | React Hook Form + Zod |

---

### Human-in-the-Loop Correction Engine

The extraction result is treated as an editable AI-generated draft rather than a trusted immutable output. The Human-in-the-Loop Correction Engine manages updates reactively.

#### Editing Capabilities
- **Inline Table Editing**: Double click to edit cells; automatic tab navigation.
- **Structured Editing Workspace**: Text editor with live syntax checking and validation against the shared invoice schema.
- **Summary Editing**: Inline text changes to the NLP summary.
- **Line Item Operations**: Instantly append or remove line items.
- **Mathematical Recalculation**: Sum, taxes, and net totals recalculate on cell changes.
- **Auto-Validation**: Triggers validation checks on value changes.
- **Version Snapshots**: Captures changes in a history array.
- **Undo History**: Restores previous modifications.

> [!NOTE]
> Every modification updates the React local state, validation engine, confidence engine, and logs a human feedback trace to Langfuse.

---

### Guest Session Architecture
- **Trial Uploads**: Allows instant invoice extraction testing directly from the landing page.
- **Session Cache**: Stores extraction results in memory/session cache only.
- **No Persistence**: Prevents writing files to permanent cloud storage or database records.
- **Strict Limit**: Restricts IP to 3 uploads per day.
- **Access Restrictions**: Restricts access to history log, settings, integrations, analytics, or support tools.

---

### Frontend Real-Time Architecture

The Document Ingestion Pipeline uses Server-Sent Events (SSE) to display progress through the worker pipeline.

#### SSE Event Lifecycle
1. `queued`: Job entered the queue.
2. `processing`: Preprocessing started.
3. `ocr_running`: Sending text/images to LLM providers.
4. `parsing`: Structuring output JSON.
5. `validation`: Math auditor checking totals.
6. `completed`: Saved to MongoDB and stream closed.
7. `failed`: Error encountered; details sent to client.

*Notes*: The hook features an automatic reconnect policy (3 attempts), heartbeat ping validation, and user alerts on failure.

---

### Frontend State Consistency, Concurrency Hardening & Coalescing Command Queue

To eliminate race conditions, version drift, and competitive write collisions under rapid collaborative or concurrent operations, the platform utilizes a hardened **deterministic unidirectional state consistency pipeline**:

#### 1. Unidirectional State Authority & Pipeline
*   **Zustand as UI Projection**: Zustand is strictly a render cache/UI projection layer, NOT the domain source of truth. The server controls the authoritative document versioning.
*   **Client-Side Version Elimination**: Client-generated versions are strictly prohibited. Versioning is monotonic and managed solely on the server.
*   **Pipeline Hierarchy**: `SSE/API -> Event Validator -> Vector Gate -> Pure Reconciler -> Zustand DeepFreeze Commit`. Direct state mutations are blocked by recursive deep freezing (`deepFreeze`), raising runtime exceptions on direct assignments.

#### 2. WriteCommandQueue (Batched, Coalesced FIFO Queue)
*   **Per-invoiceMutex Lock**: Enforces a strict single-in-flight write guarantee per `invoiceId` to prevent simultaneous PUT request collisions.
*   **FIFO Sequencing**: Enqueues and processes API sync tasks in strict chronological order.
*   **50ms Tick-Window Coalescing**: Groups and merges multiple rapid keystrokes or field edits made in the same event-loop tick window. Only the latest command (with full cumulative state changes) gets dispatched to the API. This has completely eliminated intermediate request thrashing and fast-typing network storms.
*   **Command Deduplication**: Prunes overlapping updates using unique `writeKey = invoiceId + ":" + fieldPath + ":" + hash(payload)` hashes.

#### 3. Pure Reconciler Layer (`reconcileState.ts`)
*   **3D Vector Verification**: Validates state updates against a `Vector = { version, epoch, checksum }` construct.
*   **Deterministic Priority Rule**: The server version ALWAYS wins over the local version unless the local state is a `"dirty-unconfirmed draft"`.
*   **Snapshot Completeness Flag**:
    *   *Partial Updates* (OCR telemetry, progress): Do NOT overwrite local canonical state (update metadata only).
    *   *Full Snapshots*: (`isSnapshotComplete: true`) Trigger a full reconciliation.

#### 4. Namespace-Isolated Draft Persistence Adapter (`DraftPersistenceAdapter.ts`)
*   **Persistent Tab Fingerprints**: Keyed by unique browser tab `sessionId` to prevent multi-tab crosstalk.
*   **FNV-1a Checksum Integrity**: Computes FNV-1a checksums on save. On load, validates integrity: `if (checksumMismatch) discardDraft()`.
*   **Soft Merge Fallback**: Performs a 3-way non-conflicting field-level merge instead of blindly discarding local drafts.
*   **24-Hour TTL**: Automatically purges stale drafts after 24 hours.

#### 5. SSE Backpressure Protection
*   **Backpressure Throttling Gate**: If incoming stream events exceed **5 updates per second**, throttles the reconciliation engine to a **200ms batching window** to save render thread latency and prevent UI thrashing.

#### 6. Conflict Escalation State Machine
*   **Explicit State Vector**:
    *   `SYNCED`: Local state matches the server perfectly.
    *   `DIRTY_LOCAL`: Unsaved client changes exist locally.
    *   `PENDING_WRITE`: A network sync request is active.
    *   `SERVER_UPDATED`: A newer server snapshot was ingested safely.
    *   `CONFLICT_DETECTED`: Out-of-sync vector mismatch detected. Sync is frozen.
    *   `RESOLVED`: A choice has been made, committing the result.
*   **3-Way Modal UX**: Reduced to: Keep Local (`KEEP_LOCAL`), Load Server (`PULL_SERVER`), and Smart Merge (`SMART_MERGE`). Advanced `PATCH_RESOLVE` is handled as an internal tool.

---

## SECTION 5 — Frontend Tech Stack

| Tool | Purpose |
| --- | --- |
| **React + TS** | SPA Core framework |
| **TailwindCSS** | Clean utility styles |
| **Framer Motion** | Page and state transition animations |
| **Zustand** | Dynamic Editor global store |
| **TanStack Table** | Data grids and logs list rendering |
| **Recharts** | Telemetry charts |
| **React Hook Form** | Form validation |
| **Zod** | Schema validation |
| **TanStack Query** | API cache |
| **Axios** | API client |
| **React Dropzone** | File uploads |

---

## SECTION 6 — Backend Implementation

The backend is built as a **Modular Express API Gateway** with TypeScript:

### Backend Service Architecture
The codebase separates concerns using modular layers:
- `controllers/`: Receives requests, calls services, sends HTTP responses.
- `services/`: Encapsulates business logic, file storage, and provider interactions.
- `repositories/`: Direct database queries via Mongoose models.
- `workers/`: Independent BullMQ jobs processing queue entries.
- `queues/`: Defines and initializes job queues.
- `events/`: Listens to job changes and fires SSE notifications.
- `validators/`: Validates JSON schemas via Zod.

---

### Queue Scalability & Processing
BullMQ workers operate as a **Distributed Worker Runtime** independently from the API layer, allowing horizontal scalability:
- **Worker Isolation**: Workers can be deployed on independent container nodes.
- **Retry Policies**: Configured with exponential backoff retries (3 attempts).
- **Dead-Letter Queues (DLQ)**: Failed tasks after max retries are moved to a dead-letter state in MongoDB with trace logs for admin auditing.
- **Concurrency Control**: Limits concurrent image parsing runs to avoid API provider rate limits.
- **Worker Telemetry**: Uptime tracking, worker load limits, and queue persistence across server restarts.

---

### AI Provider Abstraction Layer
To avoid hardcoding API integrations, the system decouples vision/text models behind an abstraction interface:

```typescript
export interface ParsedInvoiceField<T> {
  value: T;
  confidence: number;
}

export interface ParsedInvoiceDTO {
  vendor: ParsedInvoiceField<string>;
  recipient: ParsedInvoiceField<string>;
  invoiceNumber: ParsedInvoiceField<string>;
  totalAmount: ParsedInvoiceField<number>;
  lineItems: Array<{
    description: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
  summary: string;
}

export interface VisionProvider {
  extractInvoice(fileBuffer: Buffer, mimeType: string): Promise<ParsedInvoiceDTO>;
}
```

- **GeminiProvider**: Digital PDF text extraction.
- **QwenProvider**: Scanned image Visual extraction.
- **LlamaProvider**: Fallback processing.
- **DevSimulationProvider**: High-fidelity local simulation using a deterministic parser if API keys are missing.

---

## SECTION 7 — AI Agent Orchestration Pipeline

The background worker schedules 6 specialized agents:
1. **UploadAgent**: Checks file constraints, writes payload, returns storage URI.
2. **OCRAgent**: Performs preprocessing checks (rotation, skews) and routes files to the appropriate AI Provider.
3. **ParsingAgent**: Normalizes raw outputs into the standard schema.
4. **ValidationAgent**: Audits invoice totals against line items.
5. **ConsensusAgent**: Cross-checks date formats and values, assigning field-level confidence ratings.
6. **DBWriterAgent**: Saves records to database collections.

---

### Failure Recovery Strategy

| Failure | Recovery |
| --- | --- |
| **OCR timeout** | Retry using alternative provider model |
| **Parse failure** | Retry with stricter JSON template prompt |
| **DB failure** | Mongoose driver automatic reconnect with exponential backoff |
| **Queue failure** | Enqueue job into the Dead-Letter Queue (DLQ) and raise log alarm |
| **SSE disconnect** | Client automatically re-subscribes to stream |

---

### AI Output Validation Policies

#### Validation Rules
- **Strict Format Extraction**: Reject malformed JSON responses and strip markdown wrappers (` ```json ` blocks).
- **Zod Schema Enforcement**: Enforce strict schema validation on AI provider response fields.
- **Prompt Injection Defense**: Prevent prompt injection via uploaded invoice text layers.
- **Output Sanitization**: Sanitize extracted HTML/scripts to prevent XSS.
- **Format Normalization**: Standardize currency, date, and decimal properties to canonical schemas.
- **Duplicate Document Guard**: Block uploads of pre-existing invoices (checked by vendor name, number, date, and amount checksums).

#### Failure Handling
- **Parse Failures**: Retry parsing with stricter, one-shot prompt templates.
- **Malformed Extraction**: Fall back and route to the alternate vision model.
- **Trace Dispatch**: Push detailed fail-state trace payloads to Langfuse observability registers.

---

## SECTION 8 — Human-in-the-Loop Correction Engine

The Human-in-the-Loop Correction Engine acts as the manual override bridge:
- **Structured Editing Workspace**: User interface displaying the parsed data as editable text with Zod format validation checks.
- **Audit Trails**: Every edit updates a `corrections` history array:
  ```json
  "corrections": [
    { "field": "totalAmount", "oldValue": "726.00", "newValue": "7226.00", "timestamp": "..." }
  ]
  ```
- **Math Auditor Alert**: Re-runs mathematical sum validation checks dynamically on user edits, displaying clear alerts if cell updates cause discrepancies with invoice totals.

---

## SECTION 9 — AI Observability & Evaluation Layer

The system integrates Langfuse to monitor LLM interactions:

### Langfuse Tracing
- **Prompt Tracing**: Stores prompt templates, versions, and variable bindings.
- **Model Inputs / Outputs**: Saves payload logs for token audit tracking.
- **Token Usage**: Tracks exact input/output tokens.
- **Costs**: Computes cost in USD per model run based on token price indexes.

### Evaluation Metrics

| Metric | Purpose |
| --- | --- |
| **Field Accuracy** | Measures the correctness of individual extracted properties compared to verified values. |
| **Correction Rate** | Ratio of fields edited manually by human operators in the editor workspace. |
| **Validation Failure Rate** | Percentage of uploads showing mathematical errors (line-items vs totals). |
| **Retry Frequency** | Tracks unstable provider outputs requiring automatic retries. |
| **Fallback Frequency** | Measures how often the engine routes to fallback models. |
| **p50 / p95 Latency** | Evaluates response speeds across ingestion and model routing. |
| **Estimated Cost per Invoice** | Logs token metrics and spending trends in USD. |

### Human Feedback Loop
- **Correction Logging**: User overrides submit manual scoring variables to Langfuse, pointing to exact fields.
- **RLHF Datasets**: Exports corrected entries as fine-tuning payloads for downstream models.

### Telemetry
- **Latency tracking**: Monitors p50, p95, and p99 speeds.
- **Queue Depth**: Checks current BullMQ backlog sizes.

> [!IMPORTANT]
> The Dynamic Editing Engine acts as a Human Feedback Collection Layer, where all user corrections are transformed into structured evaluation signals and linked to Langfuse traces for downstream AI evaluation.

---

## SECTION 10 — API Endpoints

### Authentication
- `POST /api/auth/signup`: Create user account.
- `POST /api/auth/login`: Authenticate and write JWT cookie.

### Invoice Management
- `POST /api/invoice/upload`: Ingest file and spawn BullMQ task.
- `GET /api/jobs/:id/stream`: SSE progress channel.
- `GET /api/invoice`: Fetch invoices (paginated).
- `PUT /api/invoice/:id`: Edit top-level values.
- `POST /api/invoice/:id/lineitem`: Append a line item.
- `DELETE /api/invoice/:id/lineitem/:itemId`: Delete a line item.
- `DELETE /api/invoice/:id`: Delete invoice.

---

## SECTION 10.5 — Unified Authentication & Role Access Control System (RBAC)

To establish a production-grade, highly secure, and role-aware ecosystem, the platform implements a unified security architecture that removes frontend-controlled role options and relies entirely on backend-enforced authority.

### 1. Core Security & Signup Rules
*   **No Frontend Role Selection**: Registration forms never permit manual role selection or checkboxes. All registrants default to `role = "user"`.
*   **Enterprise-Grade Password Rules**: Enforces strict password requirements via a shared Zod schema (`signUpSchema`) and backend password validators:
    *   *Minimum*: 8 characters.
    *   *Must include*: At least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/`).
*   **Unified Auth Gate**: A single API endpoint handles all log-ins (`POST /api/v1/auth/login`), parsing the true database-stored role dynamically rather than relying on frontend hints.

### 2. Role Assignment & Seeding Engine
*   **Method A (Dynamic ENV Bootstrapper)**: The server automatically bootstraps the initial Administrator at startup based on optional environment variables:
    *   `ADMIN_EMAIL` (Defaults to `admin@invoiceflow.ai` if not provided).
    *   `ADMIN_PASSWORD` (Defaults to a strong `StrongPass@123` if not provided).
*   **Method B (Domain-Based Escalation)**: If enabled, registering with a corporate domain (e.g., `email.endsWith('@invoiceflow.ai')`) automatically escalates the user to the `admin` role with a boosted 999,999 upload quota.
*   **Internal Seeding (Support / Ops)**: Internal roles (`support`, `ops`) are seeded purely in database scripts and are unreachable via public registration forms.

### 3. Bidirectional Sub-Routing & Address-Bar Sync
*   **Tab Routing Gateway**: Configures nested routing inside `App.tsx` (`/admin` and `/admin/:tab`) allowing administrators to bookmark or navigate directly to `/admin/system-health` or `/admin/logs`.
*   **Address-Bar Synchronizer**: Implements standard `react-router-dom` hooks to bind route parameters (`:tab`) with the local `activeTab` state. Clicking tabs in the sidebar automatically updates the browser's URL, and changing the URL dynamically shifts active sidebar views with zero page redraws.

### 4. Interactive Role Badges
*   **Color-Coded Badges**: The navbar and sidebar header dynamically render a color-coded status badge indicating session clearance level:
    *   `Admin 🔴`: Full system control access.
    *   `User 🔵`: Standard accountant ingestion workspace.
    *   `Support 🟡`: Support desk operations.
    *   `Ops 🟣`: Cluster node monitor access.

---

## SECTION 10.7 — AI Ingestion Pipeline, Rate-Limit Resilience & Multi-Key Failover

To guarantee 100% extraction uptime and bypass provider-side rate limits (HTTP 429) or temporary outages (HTTP 500), the platform leverages an advanced 3-layer rotated-key circuit-breaker architecture.

### 1. The 3-Layer AI Routing System
*   **ROUTE A — Gemini 1.5 Flash (Primary)**:
    *   Fastest processing (~2-3s). Dispatched for both digital PDFs and clean invoices.
    *   Linked to a **Gemini Key Pool** containing 3 API keys (`GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`).
    *   Runs in round-robin order. On 429, rotates key instantly and marks as cooling down.
*   **ROUTE B — OpenRouter Qwen-2.5-VL Vision (Backup)**:
    *   Triggered immediately if the entire Gemini pool is rate-limited or fails.
    *   Uses a **Vision LLM** (`qwen/qwen2.5-vl-7b-instruct:free`) via the `openai` SDK to read image data URLs natively.
    *   Linked to an **OpenRouter Key Pool** containing 2 API keys (`OPENROUTER_API_KEY_1`, `OPENROUTER_API_KEY_2`).
*   **ROUTE C — Local OCR + Mistral Structuring (Last Resort / Air-gapped)**:
    *   Runs `tesseract.js` locally to extract raw text (guaranteed never to crash on API bounds).
    *   Dispatches raw OCR text to `mistralai/mistral-7b-instruct:free` on OpenRouter for JSON formatting.
    *   If OpenRouter is completely offline, returns a standard empty template structure so the frontend is never blocked and the user can type values manually.

### 2. Rotated Key State Machine
Every registered key is continuously tracked in real time under the singleton `KeyPoolManager` class:
*   `AVAILABLE`: Ready for API requests.
*   `RATE_LIMITED (429)`: Automatically skipped. Placed on a **60-second cooldown** after which it reverts to `AVAILABLE`.
*   `FAILED (500 / Network)`: Automatically skipped. Placed on a **300-second (5 min) cooldown** after which it reverts to `AVAILABLE`.

### 3. Parsing Normalization Gating
*   **Safe Type Coercions**: `ParsingAgent` intercepts raw values and applies aggressive `parseFloat` normalization. This protects calculations from text strings returned by less-capable fallback models.
*   **Defensive Syntax Parsing**: Clears potential markdown fences (`.replace(/```json|```/g, '').trim()`) across both Gemini and OpenRouter providers prior to parsing.

### 4. Telemetry Observability & Analytics
*   **Observability**: Integrates `Langfuse` trace logs capturing `invoice-extraction` sessions with nested spans for Route A, B, or C, tracking input/output tokens, specific key indices, and latencies.
*   **Database Trace**: Stores a `routeUsed: 'gemini' | 'openrouter' | 'tesseract'` field on the Mongoose Invoice schema to feed the Admin Analytics Dashboard with routing metrics.

---

## SECTION 11 — Deployment

- **Vercel**: Frontend React SPA deployment.
- **Render**: Backend Express API and separate BullMQ worker service.
- **MongoDB Atlas**: Cloud-hosted database cluster.
- **Upstash Redis**: Serverless cache and BullMQ job store.
- **Docker**: Container configs for local MongoDB (`27017`) and Redis (`6379`) setups.
- **Langfuse**: Observability dashboard tracking latencies, tokens, and routing overrides.
