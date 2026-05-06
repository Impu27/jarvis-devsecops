# 🤖 JARVIS — DevSecOps Edition

> **Just A Rather Very Intelligent System** — migrated from a Streamlit prototype to a production-grade full-stack application, following the Women in Cloud DevSecOps Board Game roadmap.

---

## 🗺️ How This Project Maps to the Board Game

| Level | Topic | Where in This Project |
|-------|-------|-----------------------|
| **1** | Version Control | This repo — Git branching, `.gitignore`, commit history |
| **2** | Git Practice | Feature branches → PR → merge to `main` triggers CI/CD |
| **3** | Containerization | Every service has a `Dockerfile`; `docker-compose.yml` orchestrates all |
| **4** | CI/CD with Jenkins | See GitHub Actions (`.github/workflows/ci-cd.yml`) — same concepts |
| **5** | Microsoft Azure | Deploy with `docker compose` on Azure Container Instances or AKS |
| **6** | Foundation Quiz | Architecture diagram below — quiz yourself! |
| **7** | DevOps Foundation | Dev→Ops pipeline: code → lint → test → build → push → deploy |
| **8** | DevSecOps Foundation | SAST (CodeQL), `npm audit`, Trivy scan, Helmet.js, CORS, rate limiting |
| **9** | Webhooks | GitHub webhook → triggers CI/CD on every push |
| **10** | CI/CD in DevSecOps | Full pipeline in `.github/workflows/ci-cd.yml` with security gates |
| **11** | Infra Setup (Admin) | `docker-compose.yml` = IaC; Nginx configured as secure reverse proxy |
| **12** | React + Node.js Deployment | `frontend/` (React/Vite) + `backend/` (Express) behind Nginx |
| **13** | Secure A Vulnerable Application | Helmet, CORS, rate limiting, input validation, non-root Docker users |
| **14** | React + Node.js + MongoDB | MongoDB stores chat history & document metadata |
| **15** | DataOps Foundation | ChromaDB = vector data store; MongoDB = operational data |
| **16** | CI/CD in DataOps | CI pipeline rebuilds & pushes all images including RAG service |
| **17** | ELT Pipeline | PDF → PyPDFLoader → Chunking → Embeddings → ChromaDB |
| **18** | IaC and DataOps Pipeline | `docker-compose.yml` + GitHub Actions = full IaC + DataOps pipeline |

---

## 🏗️ Architecture

```
  Browser (React + Vite)
         │
         ▼
   Nginx (port 80)          ← Reverse proxy, security headers, rate limiting
    /        \
   /          \
  /api/*    Everything else
   │              │
   ▼              ▼
Node.js       React static
(Express)      (Nginx)
   │
   ├─── MongoDB             ← Chat history, document metadata
   │
   └─── FastAPI (Python)    ← RAG microservice (your original logic, unchanged)
              │
              ├─── ChromaDB ← Vector store (PDF embeddings)
              │
              └─── Ollama   ← LLM (llama3.2:3b, runs locally)
```

### Data Flow for a Question

```
User types question
       ↓
React → POST /api/chat/query (Node.js)
       ↓
Node saves user message to MongoDB
       ↓
Node → POST /query (FastAPI RAG service)
       ↓
FastAPI: ChromaDB similarity search → top-3 chunks retrieved
       ↓
FastAPI: chunks injected into Ollama prompt
       ↓
Ollama LLM generates answer
       ↓
FastAPI returns answer + sources
       ↓
Node saves assistant reply to MongoDB
       ↓
React renders answer with collapsible source excerpts
```

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose)
- [Git](https://git-scm.com/)
- 8 GB RAM recommended (for Ollama LLM)

### 1. Clone & configure

```bash
git clone https://github.com/yourhandle/jarvis-devsecops.git
cd jarvis-devsecops
cp .env.example .env
# Edit .env — at minimum change API_KEY
```

### 2. Start all services

```bash
docker compose up --build
```

This starts 6 containers: `nginx`, `frontend`, `backend`, `rag-service`, `mongo`, `ollama`.

### 3. Pull the LLM model (first run only)

```bash
docker exec jarvis-ollama ollama pull llama3.2:3b
```

### 4. Open the app

```
http://localhost
```

Upload a PDF via the sidebar, then ask questions!

---

## 🔒 Security Features (Level 13)

| OWASP Top 10 | Mitigation in This Project |
|---|---|
| A01 Broken Access Control | API key authentication on all `/api/*` routes |
| A03 Injection | `express-validator` sanitises all inputs; parameterised Mongoose queries |
| A04 Insecure Design | Rate limiting (express-rate-limit + Nginx `limit_req`) |
| A05 Security Misconfiguration | Helmet.js sets 10+ security headers; Nginx hides version |
| A06 Vulnerable Components | `npm audit` runs in CI; Trivy scans Docker images |
| A07 Auth Failures | API key required; CORS locked to frontend origin only |
| A08 Software Integrity | Docker image digests pinned in CI; CodeQL SAST on every PR |
| A09 Logging | Morgan (request logs) + structured error handler |

---

## 📁 Project Structure

```
jarvis-devsecops/
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # CI/CD pipeline (lint→test→SAST→build→deploy)
├── frontend/                  # React + Vite (Level 12)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/jarvis.js      # API client
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── MetricsBar.jsx
│   │   ├── index.css          # Dark sci-fi theme
│   │   └── main.jsx
│   ├── Dockerfile             # Multi-stage: build → nginx
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── src/                   # Node.js / Express (Level 12 + 14)
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── chat.js        # POST /query, GET/DELETE /history
│   │   │   ├── documents.js   # POST /upload, GET, DELETE
│   │   │   └── health.js
│   │   ├── models/index.js    # MongoDB schemas (Message, Document, Session)
│   │   └── middleware/
│   │       ├── auth.js
│   │       └── errorHandler.js
│   ├── rag_service.py         # FastAPI RAG microservice (your original logic)
│   ├── requirements.txt
│   ├── Dockerfile.node        # Node backend container
│   ├── Dockerfile.python      # Python RAG container
│   └── package.json
├── nginx/
│   └── nginx.conf             # Reverse proxy + security headers (Level 11)
├── docker-compose.yml         # Orchestrates all 6 services (Level 3)
├── .env.example
├── .gitignore
└── README.md
```

---

## 🛠️ Development Mode (without Docker)

Run each service locally for faster iteration:

```bash
# Terminal 1 — MongoDB
docker run -p 27017:27017 mongo:7.0

# Terminal 2 — Ollama
ollama serve
ollama pull llama3.2:3b

# Terminal 3 — Python RAG service
cd backend
pip install -r requirements.txt
uvicorn rag_service:app --reload --port 8000

# Terminal 4 — Node.js backend
cd backend
npm install
NODE_ENV=development npm run dev

# Terminal 5 — React frontend
cd frontend
npm install
npm run dev          # Proxies /api → localhost:5000 automatically
```

Then visit `http://localhost:3000`.

---

## 🔄 CI/CD Pipeline (Level 10)

Every push to `main` triggers:

```
push to main
     │
     ▼
┌─── lint & test ───────────────────────────────────────────────────┐
│  frontend: eslint + vitest                                        │
│  backend:  eslint + jest                                          │
└───────────────────────────────────────────────────────────────────┘
     │ pass
     ▼
┌─── SAST security scan (Level 8) ──────────────────────────────────┐
│  CodeQL   — static analysis (JS + Python)                         │
│  npm audit — dependency CVEs                                      │
│  Trivy    — container image vulnerabilities                        │
└───────────────────────────────────────────────────────────────────┘
     │ pass
     ▼
┌─── build & push ──────────────────────────────────────────────────┐
│  docker build frontend  → ghcr.io/.../jarvis-frontend:<sha>       │
│  docker build backend   → ghcr.io/.../jarvis-backend:<sha>        │
│  docker build rag       → ghcr.io/.../jarvis-rag:<sha>            │
└───────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─── deploy ────────────────────────────────────────────────────────┐
│  SSH → docker compose pull && docker compose up -d                │
└───────────────────────────────────────────────────────────────────┘
```

Set these secrets in GitHub → Settings → Secrets:
- `DEPLOY_HOST` — your server IP
- `DEPLOY_USER` — SSH username
- `DEPLOY_SSH_KEY` — private key

---

## ☁️ Deploying to Azure (Level 5 + 11)

```bash
# 1. Create a resource group
az group create --name jarvis-rg --location eastus

# 2. Create an Azure Container Registry
az acr create --resource-group jarvis-rg --name jarvisregistry --sku Basic

# 3. Push images (CI/CD does this automatically)
az acr login --name jarvisregistry
docker compose push

# 4. Deploy to Azure Container Instances or AKS
az container create \
  --resource-group jarvis-rg \
  --name jarvis \
  --image jarvisregistry.azurecr.io/jarvis-backend:latest \
  --dns-name-label jarvis-app \
  --ports 80
```

---

## 🧩 What Changed from the Original Streamlit App

| Original (Streamlit) | DevSecOps Edition |
|---|---|
| Single Python file | 3-tier architecture (React + Node + Python) |
| Streamlit UI | React + Vite frontend |
| No persistence | MongoDB stores all chat history |
| No auth | API key authentication |
| No security hardening | Helmet, CORS, rate limiting, SAST |
| Runs locally only | Dockerized, CI/CD ready, cloud-deployable |
| No reverse proxy | Nginx with security headers |
| Voice via PyAudio | (Add Web Speech API in React for browser-native voice) |

---

## 📜 License

MIT — see LICENSE file.
