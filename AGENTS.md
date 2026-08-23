# RAG Workshop Project Instructions

## Goal

Build a student-friendly, live workshop demonstration of Retrieval-Augmented Generation (RAG) using university syllabus PDFs as the knowledge base. The primary artifact is a Jupyter notebook that explains the workflow cell by cell.

## Required workflow

1. Load PDF documents from `data/` using LangChain's `PyPDFLoader` or an equivalent PDF loader.
2. Split pages with LangChain `RecursiveCharacterTextSplitter` using medium-sized chunks and overlap.
3. Store vectors locally in persistent Chroma under `vector_store/chroma/`.
4. Use Gemini `gemini-embedding-001` embeddings. Use `RETRIEVAL_DOCUMENT` for chunks and `RETRIEVAL_QUERY` for queries.
5. Configure each new Chroma collection with HNSW cosine distance using `configuration={"hnsw": {"space": "cosine"}}`.
6. Preserve citation metadata for every chunk: source filename, one-based page number, chunk index, character offset, and a human-readable citation label.
7. Implement a retriever that returns matched chunks, metadata, and distances before generation.
8. Use LangChain prompt templates to ground answers strictly in retrieved context and cite the source labels.
9. Use Groq `openai/gpt-oss-120b` for both a RAG-enabled search path and a no-RAG baseline path.
10. Keep explanation Markdown cells between code stages so students can follow the code live.

## SDK and compatibility rules

- Prefer current official provider documentation before changing provider-specific code.
- Use the maintained `google-genai` SDK, not the retired `google-generativeai` SDK.
- Use the local `GoogleGeminiEmbeddingFunction` Chroma adapter in the notebook.
- Use Groq's GPT-OSS guidance: place RAG instructions in the user prompt, use `reasoning_effort="low"`, and use temperature `0.6` unless the user asks otherwise.
- When the embedding model or HNSW configuration changes, increase `INDEX_VERSION` so an incompatible persisted collection is not reused.

## Security and local data

- Store API keys only in `.env`; never print, commit, or expose them.
- Keep `.env.example` as a key-name-only template.
- Keep source PDFs and generated Chroma data local and Git-ignored.
- The PDF source of truth is `data/`; the vector database is always rebuildable.

## Project memory and documentation

- Maintain `MEMORY.md` when architecture, operational workflow, or key project instructions change.
- Keep `README.md`, `requirements.txt`, and notebook setup steps aligned.
- The notebook setup must include Windows PowerShell virtual-environment creation, activation, and dependency installation instructions.

## Scope

Do not implement these items until the user explicitly asks:

- Streamlit or Reflex web application
- LangChain/LangGraph RAG agents
- Deployment

## Git and GitHub workflow

- Make a verified local commit after each meaningful milestone.
- The GitHub remote is `https://github.com/syedishaaq04/RAG-Workshop.git` and must be named `origin`.
- After every verified milestone commit, push the current branch to `origin`.
- Never force-push.
- Stop and report any authentication, network, remote, merge, or branch-protection failure.
- Preserve unrelated user changes in a dirty worktree; do not stage or commit them unless the user explicitly asks.
