# Campus Nexus (University Knowledge Base) — Project Memory

## Current Goal

The project is currently undergoing a massive architectural overhaul. It is transitioning from a local, single-file Streamlit application into a full-stack, cloud-ready web application (Campus Nexus) designed to support multi-user chat, administration, and dynamic multi-format document processing for a comprehensive university knowledge base.

## Tech Stack Overview

- **Frontend:**
  - React (Vite) + TailwindCSS v4.
  - *Tailwind v4 Setup:* Uses the `@tailwindcss/vite` plugin in `vite.config.js` and `@import "tailwindcss";` in `index.css`. No `tailwind.config.js` or `postcss.config.js` needed.
  - React Router DOM for routing.
  - Axios for API requests with an Axios interceptor for appending the JWT token.
- **Backend:** Python FastAPI.
- **Database / Storage:** MongoDB Atlas.
- **AI Models:** Groq (`openai/gpt-oss-120b`) for reasoning; Google Gemini (`gemini-embedding-001`) for vector embeddings.

## Key Features & Components

### 1. Database & Vector Storage (MongoDB Atlas)
- **Users:** Stores Student and Admin profiles and credentials.
- **GridFS:** Secure cloud storage for the raw uploaded documents (`.pdf`, `.docx`, `.txt`, `.csv`).
- **Chat History:** Stores user conversation threads, context, and citations.
- **Atlas Vector Search:** Stores embedding chunks and executes high-speed semantic retrieval using HNSW cosine similarity. The `source_file` metadata is indexed for targeted, multi-program filtering.

### 2. Backend API (FastAPI)
- **Authentication:** JWT-based role authorization (Admin vs. Student).
- **Admin Document Management:** Endpoints for uploading files to GridFS, triggering text extraction (`PyPDFLoader`, `Docx2txtLoader`, `TextLoader`, `CSVLoader`), chunking (`RecursiveCharacterTextSplitter`), and pushing vectors to Atlas.
- **Chat Engine:** Manages streaming or synchronous LLM responses and persists history to MongoDB.

### 3. RAG Pipeline (LangGraph)
The backend executes a 6-stage intelligent pipeline for every query:
1. **Router Agent:** Dynamically identifies target documents from the knowledge base based on the user's intent and document metadata.
2. **Multi-Source Retriever:** Queries MongoDB Atlas Vector Search for candidate chunks.
3. **Re-ranker Agent:** Evaluates and selects the highest-relevance candidate chunks for the specific context.
4. **Evidence Assessor:** Verifies if the selected chunks contain sufficient evidence.
5. **Answer Writer:** Drafts the response and explicitly cites the source documents.
6. **Citation Reviewer & Revisor:** Ensures all factual claims are grounded and cited before finalizing the output.

### 4. Frontend Application (React)
- **Admin Dashboard:** Interface for uploading and managing university knowledge base documents (PDFs, Docs, Text, CSV) and bulk creating new student accounts.
- **Student Chat:** Premium, responsive UI allowing students to ask questions, view chat history, and see explicit citations. Now features a mobile-responsive sidebar drawer for smaller screens.
- **Guest Mode:** Non-authenticated users can use a temporary guest login with an ephemeral chat history.

## Deployment Details
- **Frontend:** Deployed on Vercel (`https://campus-nexus-kohl.vercel.app/`).
- **Backend:** Deployed on Render (`https://campus-nexus-backend.onrender.com/`). Uses `CORS_ORIGINS` to securely restrict API access to the Vercel frontend.
- **Database:** MongoDB Atlas is used for both operational data and vector storage.

## Setup Requirements
- To run the backend, a MongoDB Atlas Cluster with an Atlas Vector Search index configured on the `chunks` collection is required.
- API Keys for Google Gemini (Embeddings) and Groq (LLM).
