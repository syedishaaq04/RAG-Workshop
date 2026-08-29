# Campus Nexus — University Knowledge Base

A full-stack, cloud-ready web application for a comprehensive university knowledge base using Retrieval-Augmented Generation (RAG).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS v4 |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas (Motor/Beanie) |
| Embeddings | Google Gemini (`gemini-embedding-001`) |
| LLM | Groq (`openai/gpt-oss-120b`) |
| RAG Pipeline | LangGraph (6-stage) |

## Features
- **Multi-Format Uploads**: Admins can upload `.pdf`, `.docx`, `.txt`, and `.csv` files representing policies, fees, syllabi, exam schedules, etc.
- **Dynamic Routing**: The LangGraph pipeline dynamically categorizes queries (e.g. Admissions, Fees, Syllabus) and filters candidates based on exact document metadata to ensure precision.
- **Hybrid Search**: Combines Atlas Vector Search (Cosine Similarity) with intelligent Keyword Bigram fallback to guarantee data retrieval for highly specific lists or experiments.
- **Strict Grounding**: A multi-stage review process ensures every factual claim in the chatbot's response is directly cited from the uploaded knowledge base.

## Project Structure

```
RAG Workshop/
├── backend/
│   ├── .env              ← Your secrets (never commit!)
│   ├── requirements.txt
│   └── app/
│       ├── main.py       ← FastAPI entrypoint
│       ├── api/          ← auth, chat, admin routers
│       ├── core/         ← config, db, security
│       ├── models/       ← Beanie ODM models
│       └── services/     ← agent, vector_store
├── frontend/
│   └── src/
│       ├── pages/        ← Login, Chat, AdminDashboard
│       ├── context/      ← AuthContext
│       └── App.jsx
├── AGENTS.md
└── MEMORY.md
```

## Setup

### 1. MongoDB Atlas
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user and whitelist your IP
3. Copy the connection string into `backend/.env` as `MONGODB_URI`
4. Create an Atlas Vector Search index on the `rag_workshop.chunks` collection:
   ```json
   {
     "fields": [
       { "type": "vector", "path": "embedding", "numDimensions": 3072, "similarity": "cosine" },
       { "type": "filter", "path": "source_file" }
     ]
   }
   ```

### 2. Backend
1. Open a **new** PowerShell terminal.
2. Navigate to the backend folder: `cd backend`
3. Ensure your virtual environment is created (`python -m venv .venv`) and dependencies are installed (`.\.venv\Scripts\python.exe -m pip install -r requirements.txt`).
4. Fill in `backend/.env` with your API keys and MongoDB connection string.
5. Start the FastAPI server:
   ```powershell
   .\.venv\Scripts\uvicorn.exe app.main:app --reload
   ```
6. The backend is live at 'https://campus-nexus-backend.onrender.com'

### 3. Frontend
```powershell
cd frontend
npm install
npm run dev
```

The app will be at `http://localhost:5173` and API at `http://localhost:8000`.
The frontend is live at 'https://campus-nexus-kohl.vercel.app/'

Use these credentials to login as student:

Email: 'student@university.edu' 
Password: 'student@04'

## Creating First Admin User

Use the `/api/auth/register` endpoint to create an admin user:
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@uni.edu", "password": "yourpassword", "role": "admin"}'
```
