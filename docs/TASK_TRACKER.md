# Task Tracker - Smart Invoice Extractor

- [x] **Phase 1 — Repository & Infrastructure Initialization**
  - [x] Initialize root monorepo `package.json`, `turbo.json`, `docker-compose.yml`, and root `tsconfig.json`
  - [x] Create packages presets for TypeScript path mappings and workspaces
  - [x] Scaffold `packages/shared` type-safety layers (Zod models and TypeScript DTO types)
  - [x] Scaffold `packages/database` model entities (User, Invoice, AuditLog, QueueJob, Telemetry)
  - [x] Build default `.env.example` file split by categories

- [x] **Phase 2 — Backend Core Infrastructure (Express Gateway)**
  - [x] Initialize Express gateway structure in `/server`
  - [x] Create JWT authentication and role middleware guards
  - [x] Write routes and controllers for `/api/v1/auth`, `/api/v1/invoices`, `/api/v1/jobs`, `/api/v1/admin`, `/api/v1/telemetry`
  - [x] Implement bearer token verification and tenant context resolver middleware
  - [x] Implement Guest session limiter and MIME validation middleware
  - [x] Setup Express SSE endpoint for progress streams

- [x] **Phase 3 — AI Runtime & Extraction Pipeline (BullMQ Worker)**
  - [x] Create BullMQ processing listener in `apps/worker`
  - [x] Implement adaptive model router abstraction layer and `VisionProvider` interfaces
  - [x] Implement local fallback simulation provider (runs when API keys are missing)
  - [x] Code the 6 sequential agent tasks (Upload, OCR, Parsing, Validation, Consensus, DBWriter)
  - [x] Setup Queue Recovery Policies (exponential backoffs, dead-letter queue routing)

- [x] **Phase 4 — Frontend Workspace & HITL System (React UI)**
  - [x] Scaffold React app structure in `apps/web` with Vite and TypeScript
  - [x] Set up Tailwind CSS design tokens, custom mesh animations, and PostCSS configurations
  - [x] Configure Zustand stores (auth, invoice, editor, telemetry, queue status)
  - [x] Build aesthetic Home Landing Page (mesh hero, CTA widgets, features grid)
  - [x] Build User Dashboard Layout with Ingestion drag-and-drop forms & SSE progress bars
  - [x] Build Human-in-the-Loop Correction split panels (editable table, JSON workspace, template summary)
  - [x] Implement Guest trial session restrictions and limits

- [x] **Phase 5 — Observability & Production Monitoring**
  - [x] Integrate Langfuse tracing SDK into worker agents and gateway routes
  - [x] Build Admin Dashboard telemetry panel showing throughput, cost, and health widgets
  - [x] Add Cypress E2E workflows and Jest tests templates
  - [x] Validate final monorepo local operations

- [x] **Phase E / Sprint 2 — Concurrency, State Consistency & Operational Stabilization**
  - [x] Implement batched coalescing FIFO `WriteCommandQueue.ts` (per-invoice mutex lock, 50ms tick-window coalescing)
  - [x] Implement pure `reconcileState.ts` reducer with deterministic priority (server version wins unless local is dirty unconfirmed)
  - [x] Refactor `invoice.store.ts` into isolated slices with 6-state Conflict Escalation Machine and deepFreezing immutability
  - [x] Create namespace-isolated `DraftPersistenceAdapter.ts` with browser fingerprinting (`sessionId`), FNV-1a checksums, and soft merge fallbacks
  - [x] Setup SSE backpressure throttling to 200ms batch windows under high rate limits (>5 events/sec)
  - [x] Integrate glassmorphic ConflictResolutionModal and clean 3-button overlay
  - [x] Eliminate Mongoose duplicate schema index warnings on the status field to resolve log noise
  - [x] Verify complete monorepo clean production compilation via workspace root npm run build

- [x] **Phase H / Sprint 3 — AI Pipeline, Rate-Limit Resilience & Multi-Key Failover**
  - [x] Implement rotated KeyPoolManager tracking key states (AVAILABLE, RATE_LIMITED, FAILED) with automatic error recovery and cooldowns
  - [x] Create GeminiProvider (Route A) native JSON mode extraction and robust field mapping
  - [x] Create OpenRouterProvider (Route B) vision fallback using OpenAI SDK formats on Qwen-2.5-VL free model
  - [x] Create TesseractProvider (Route C) local OCR extraction and Mistral-7B structuring, with safe empty templates on failures
  - [x] Code the central ExtractionService circuit breaker routing, rotated retries, and Langfuse tracing spans
  - [x] Refactor ParsingAgent with parseFloat sanitizations to eliminate type-mismatches and prevent runtime errors
  - [x] Refactor ocr.agent.ts, dbwriter.agent.ts and workers/invoice.worker.ts to bind routeUsed telemetry to DB schemas
  - [x] Implement guestUploadLimit IP Redis limiter on server and mount on Express upload route
  - [x] Validate zero type errors and clean production compilation across workspaces

