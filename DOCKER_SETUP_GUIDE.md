# 🐳 Docker Setup Guide – Smart Invoice Extractor

Author: Bhoomika  
Project: Smart Invoice Extractor System  

---

# 📌 1. Overview

This guide provides a professional, step-by-step walkthrough for containerizing the Smart Invoice Extractor using **Docker** and **Docker Compose**. Containerization ensures that the application runs consistently across different environments, from a developer's local machine to a production server, by packaging all dependencies into isolated units.

---

# 🏗️ 2. Architecture

The system follows a modern service-oriented architecture:

- **Frontend Service**: A React (Vite) application served via an **Nginx** web server container.
- **Backend Service**: A Node.js (Express) API running in a dedicated container.
- **External Services**: Supabase (Database + Auth) and AI Extraction APIs (OpenRouter) are accessed as external cloud services and are **not** dockerized.

---

# 📋 3. Prerequisites

Before starting, ensure the following are installed:

### Windows:
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)
- WSL 2 (Windows Subsystem for Linux) enabled

### Linux (Ubuntu/Debian):
- Docker Engine: `sudo apt install docker.io`
- Docker Compose: `sudo apt install docker-compose`

---

# 📂 4. Project Folder Structure

The project is organized as a monorepo:

```text
/Smart-invoice-extractor
├── frontend/
│   ├── Dockerfile
│   ├── .env
│   └── src/
├── backend/
│   ├── Dockerfile
│   ├── .env
│   └── src/
├── docker-compose.yml
└── .env (Global)
```

---

# ⚙️ 5. Environment Variables

Containerized services rely on `.env` files for configuration. Ensure these are correctly placed in their respective directories.

### Frontend (`frontend/.env`):
```text
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:5001
```

### Backend (`backend/.env`):
```text
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENROUTER_API_KEY=your_api_key
PORT=5001
```

---

# 📄 6. Dockerfiles Explanation

### Frontend Dockerfile (`frontend/Dockerfile`):
Uses a **Multi-Stage Build**:
1. **Stage 1 (Build)**: Uses Node.js to compile the React application into static assets.
2. **Stage 2 (Serve)**: Copies those assets into a lightweight **Nginx** image for high-performance delivery.

### Backend Dockerfile (`backend/Dockerfile`):
- Uses a base Node.js image.
- Installs production dependencies.
- Compiles TypeScript to JavaScript.
- Exposes port `5001` for API communication.

---

# 📦 7. docker-compose.yml Explanation

The `docker-compose.yml` file acts as the orchestrator:

- **Networking**: Automatically creates a bridge network so containers can communicate using service names (e.g., `frontend` can talk to `backend`).
- **Ports**: Maps container ports to host ports (`80` for web, `5001` for API).
- **Restart Policy**: Configured to `always` or `unless-stopped` to ensure service availability.

---

# 🚀 8. Step-by-Step Setup

Follow these steps to launch the entire system:

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/smart-invoice-extractor.git
```

### Step 2: Configure Environment Variables
Create the `.env` files in both `frontend/` and `backend/` folders using the templates provided in Section 5.

### Step 3: Build and Run Containers
Run the following command from the project root:
```bash
docker compose up --build
```

---

# 🌐 9. Accessing the Application

Once the containers are healthy, open your browser and navigate to:

- **Frontend (Web App)**: [http://localhost](http://localhost)
- **Backend (API Health)**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

# 🛠️ 10. Development Mode (Without Docker)

If you prefer to run the apps directly on your host machine:

### Backend:
```bash
cd backend
npm install
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

# 🛡️ 11. Production Mode Commands

For a background (detached) production deployment:

```bash
docker compose up -d
```

To stop the production instances:
```bash
docker compose down
```

---

# ⌨️ 12. Common Commands

| Task | Command |
|------|---------|
| Start and Build | `docker compose up --build` |
| Start in Background | `docker compose up -d` |
| Stop and Remove | `docker compose down` |
| View Real-time Logs | `docker compose logs -f` |
| Restart Backend | `docker compose restart backend` |

---

# ❓ 13. Troubleshooting

- **Port Conflicts**: Ensure ports `80` and `5001` are not being used by other software.
- **Variable Not Found**: Verify that `frontend/.env` variables start with `VITE_`.
- **Database Connection**: Ensure the Supabase project is active and URL is correct.
- **Docker Permissions**: On Linux, you may need to use `sudo` or add your user to the `docker` group.

---

# 🔒 14. Security Notes

- **Secrets Management**: Never commit your `.env` files to Git. 
- **RLS**: Ensure Supabase Row Level Security is active; the `SUPABASE_SERVICE_ROLE_KEY` should only reside in the backend container.
- **Nginx Config**: The production Docker image uses a secure Nginx configuration to prevent directory listing.

---

# 🎯 15. Deployment Readiness

The system is now fully containerized and ready for deployment to:
- **AWS (EC2 / ECS)**
- **Digital Ocean (Droplets)**
- **Azure (App Service)**
- **Render / Railway** (using Blueprint/Compose)

---
