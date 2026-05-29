# Docker Infrastructure & Setup Guide
## Multi-Agent AI Invoice Intelligence Platform

This document outlines the Docker infrastructure configuration, service orchestration, local database/cache boots, verification playbooks, and fallback mechanisms for the **Smart Invoice Extractor** platform.

---

## 1. Local Infrastructure Services

The platform utilizes a containerized layout to run the high-performance database and caching/queue services locally:

*   **MongoDB Atlas Local (Port 27017)**: Document database storing registered user profiles, extracted invoice fields, audit logging events, and queue job metrics.
*   **Redis Alpine Cache (Port 6379)**: High-speed in-memory data cache driving the **BullMQ** distributed queue orchestration for asynchronous pipeline processing.

---

## 2. Docker Compose Configuration

The core environment is configured in the root [docker-compose.yml](file:///d:/My%20Work/My_invoice_project/docker-compose.yml):

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: invoice-platform-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=invoice_db

  redis:
    image: redis:alpine
    container_name: invoice-platform-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

### Key Design Parameters:
*   **Persistent Volumes**: Data directories (`mongodb_data`, `redis_data`) are mounted as persistent volumes so that your databases and transaction histories survive container reboots.
*   **Decoupled Port Forwarding**: Standard database ports are mapped 1-to-1 with the host system (`27017` and `6379`) to make local connection strings straightforward.

---

## 3. Setup & Orchestration Commands

Run the following commands from the **monorepo root directory** to manage your local infrastructure:

### A. Boot Infrastructure (Background Mode)
Spins up both MongoDB and Redis in detached mode:
```bash
docker-compose up -d
```

### B. View Connection Logs
Stream real-time operational traces from all active containers:
```bash
docker-compose logs -f
```

### C. Verify Active Runtimes
Check the status, health, and port mappings of the database nodes:
```bash
docker ps
```

### D. Halt Infrastructure (Preserving Datasets)
Shut down active containers without wiping persistent tables/history:
```bash
docker-compose down
```

### E. Hard Reset Infrastructure (Clean Database Wipe)
Stop containers and completely drop the local database and Redis queues:
```bash
docker-compose down -v
```

---

## 4. Verification Playbook

Once the Docker containers are running, you can verify connection health:

### 1. Redis Caching Port Check
Verify that Redis is listening and responding to pings on port 6379:
```bash
# Using Netcat
nc -zv localhost 6379

# Using Telnet
telnet localhost 6379
```
*Expected Response:* `Connection to localhost port 6379 [tcp/redis] succeeded!`

### 2. MongoDB Database Port Check
Verify MongoDB connection availability:
```bash
nc -zv localhost 27017
```
*Expected Response:* `Connection to localhost port 27017 [tcp/ms-sql-m] succeeded!`

---

## 5. Resilient Auto-Detecting Fallbacks

In the event that the Docker engine is offline, our **7-Layer AI Architecture** utilizes built-in, graceful run-time fallbacks to prevent the application from crashing:

1.  **Cache Fallback**: If Redis on `6379` is unreachable, the Express API Gateway and Workers automatically log warnings and utilize an **in-memory polling queue** for Guest and local simulations.
2.  **Storage Fallback**: If Supabase S3 parameters are missing, documents are written directly to a local, isolated server upload folder (`/server/uploads`).
3.  **Model Fallback**: If LLM API Keys are empty, the workers invoke the `DevSimulationProvider`, generating structured mock documents instantly over the SSE channel.
