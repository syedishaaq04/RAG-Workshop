# Campus Nexus (University Knowledge Base) Project Instructions

## Goal

Build a full-stack, cloud-ready web application for a comprehensive University Knowledge Base (Campus Nexus). The application features a premium React frontend for students and admins, a FastAPI backend, and MongoDB Atlas for database and vector storage. It supports answering queries on Admissions, Departments, Courses, Fees, Exams, Academic Calendar, Hostel, Library, Clubs, Placements, Scholarships, Policies, Events, and more.

## Architecture & Technology Stack

- **Frontend:** React (Vite) + TailwindCSS.
- **Backend:** Python FastAPI.
- **Database:** MongoDB Atlas (User data, Chat History, GridFS for PDF storage, Atlas Vector Search for embeddings).
- **LLM/Embeddings:** Groq (`openai/gpt-oss-120b`) for reasoning and generation; Gemini (`gemini-embedding-001`) for embedding generation.

## Required workflow

1. **Authentication:** Implement JWT-based authentication for Student and Admin roles.
2. **Admin Document Management:** Admins can upload multiple document formats (`.pdf`, `.docx`, `.txt`, `.csv`) via the frontend. The backend stores them in MongoDB GridFS, chunks them via LangChain, and embeds them into the Atlas Vector Search `chunks` collection.
3. **Student Chat Interface:** Students can ask campus-related questions in a chat interface. The chat history is persisted in MongoDB.
4. **RAG Pipeline (LangGraph):** The chat triggers a 6-stage backend pipeline:
   - **Router**: Analyzes the query and identifies which document(s) from the knowledge base are most likely to contain the required information.
   - Broad multi-source candidate retrieval using MongoDB Atlas Vector Search (with `$vectorSearch`, hybrid keyword fallback, and `source_file` metadata filtering).
   - Re-rank candidates.
   - Assess evidence sufficiency.
   - Write grounded answer with citations.
   - Review and revise.
5. **UI Aesthetics:** The frontend must use modern, premium designs (glassmorphism, clean typography, micro-animations) as per web application development guidelines.

## SDK and compatibility rules

- Use the maintained `google-genai` SDK for Gemini embeddings.
- Use Groq's GPT-OSS guidance: place RAG instructions in the user prompt, use `reasoning_effort="low"`, and use temperature `0.6` unless the user asks otherwise.
- Use Motor for async MongoDB operations in FastAPI.

## Security and Cloud Data

- Store API keys and `MONGODB_URI` only in `.env`; never print, commit, or expose them.
- Ensure the backend exposes proper CORS headers for the frontend.

## Project memory and documentation

- Maintain `MEMORY.md` when architecture, operational workflow, or key project instructions change.
- The project is structured as a monorepo with `frontend/` and `backend/` directories.

## Verification

- Do not use the browser sub-agent to verify the web app UI. The user will test manually.
- Verify code correctness through import checks, syntax parsing, and unit-level validation instead.

## Git and GitHub workflow

- Make a verified local commit after each meaningful milestone.
- After every verified milestone commit, push the current branch to `origin`.
- Never force-push.
- Stop and report any authentication, network, remote, merge, or branch-protection failure.
- Preserve unrelated user changes in a dirty worktree; do not stage or commit them unless the user explicitly asks.
