# RAG Workshop — Project Memory

## Goal

Teach a live, explainable Retrieval-Augmented Generation (RAG) workflow over university syllabus PDFs. The primary deliverable is `rag_workshop.ipynb`.

## Current architecture

1. PDFs are read from `data/` with LangChain's `PyPDFLoader` (one `Document` per PDF page).
2. `RecursiveCharacterTextSplitter` creates 1,200-character chunks with 200-character overlap.
3. Chroma's persistent local client writes its database under `vector_store/chroma/`.
4. A local `GoogleGeminiEmbeddingFunction` adapter uses the current `google-genai` SDK with `gemini-embedding-001` for document embeddings. The collection uses Chroma's `configuration={"hnsw": {"space": "cosine"}}` API.
5. Retrieval embeds queries with the Gemini `RETRIEVAL_QUERY` task type, then calls Chroma similarity search.
6. A LangChain `ChatPromptTemplate` injects retrieved context and citation labels into one user-role message, following GPT-OSS guidance.
7. Groq's `openai/gpt-oss-120b` answers both the RAG and no-RAG comparison paths with `reasoning_effort="low"` and temperature `0.6`.

## Safety and reproducibility rules

- Keep API keys only in `.env`; never commit it. `.env.example` contains field names only.
- Keep syllabus PDFs and generated Chroma data local; both are ignored by Git.
- Metadata must retain `source_file`, 1-based `page_number`, `chunk_index`, `char_start`, and `citation` so answers can be audited.
- The index cell is idempotent. Set `REBUILD_INDEX = True` only when source PDFs or chunking settings change. Increase `INDEX_VERSION` to create a new collection after changing the embedding model or HNSW settings.
- Run notebook cells from top to bottom. Creating embeddings and calling Groq require valid API keys and internet access.

## Workshop flow

1. Explain why plain LLMs lack private/current syllabus context.
2. Load pages, inspect their metadata, and split them into overlapping chunks.
3. Build or reopen the persistent Chroma collection.
4. Show raw retrieved chunks before asking the LLM anything.
5. Compare `rag_search()` with `plain_llm_search()` on the same syllabus question.
6. Verify the returned page citations against the PDF.

## Deferred work (intentionally not implemented)

- Streamlit or Reflex web UI
- LangChain/LangGraph RAG agents
- Deployment
