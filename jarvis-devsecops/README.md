# 🤖 JARVIS – DevSecOps Edition

JARVIS is a Retrieval-Augmented Generation (RAG) application that demonstrates a complete DevSecOps workflow using modern technologies including React, Node.js, FastAPI, MongoDB, Docker, and GitHub Actions.

The project allows users to upload PDF documents, index their contents, and ask natural language questions using a local Large Language Model (LLM).

---

## 🚀 Features

- 📄 PDF document upload and indexing
- 🤖 AI-powered question answering using RAG
- 🔍 Semantic search with ChromaDB
- 💬 Chat history stored in MongoDB
- 🐳 Docker-based deployment
- 🔒 OWASP security best practices
- ⚙️ CI/CD using GitHub Actions
- ☁️ Azure deployment support

---

## 🛠 Tech Stack

- React + Vite
- Node.js + Express
- FastAPI (Python)
- MongoDB
- ChromaDB
- Ollama (LLM)
- Docker & Docker Compose
- Nginx
- GitHub Actions

---

## 📂 Project Architecture

```
Browser
   │
React (Vite)
   │
Nginx
   │
Node.js (Express)
   │
├── MongoDB
└── FastAPI (RAG)
      │
      ├── ChromaDB
      └── Ollama LLM
```

---

## ▶️ Running the Project

Clone the repository:

```bash
git clone <repository-url>
cd jarvis-devsecops
```

Start all services:

```bash
docker compose up --build
```

Open the application:

```
http://localhost
```

---

## 🔐 Security

This project implements several DevSecOps practices including:

- API authentication
- Input validation
- Rate limiting
- Secure HTTP headers
- Dependency scanning
- Static Application Security Testing (SAST)

---

## 📌 CI/CD

The GitHub Actions pipeline performs:

- Linting
- Testing
- Security Scanning
- Docker Image Build
- Deployment

---

## 📄 License

This project is intended for educational and learning purposes.