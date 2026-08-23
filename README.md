# University Syllabus RAG Workshop

This project contains a student-friendly Jupyter notebook that builds a Retrieval-Augmented Generation (RAG) chatbot over university syllabus PDFs.

## Quick start

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

1. Put one or more syllabus PDFs in `data/`.
2. Copy `.env.example` to `.env` and fill in `GOOGLE_API_KEY` and `GROQ_API_KEY`.
3. Start Jupyter with `jupyter lab` and run `rag_workshop.ipynb` from top to bottom.

The generated Chroma database lives under `vector_store/chroma/`. It is intentionally ignored by Git because it can be rebuilt from the PDFs. The notebook uses the current Google GenAI Python SDK (`google-genai`) through a small Chroma-compatible Gemini embedding adapter.

The workshop notebook shows both a grounded `rag_search()` path and a baseline `plain_llm_search()` path so students can compare the impact of retrieval.

## Web app and RAG agents

The Streamlit app adds a visual interface and an inspectable 5-stage LangGraph workflow: route across syllabus documents → retrieve balanced evidence using metadata filters → assess relevance → write answer → review citations → revise once if needed. All reasoning agents use Groq's `openai/gpt-oss-120b` by default.

Start it after installing dependencies and adding API keys:

```powershell
streamlit run app.py
```

Use **Build knowledge base** in the sidebar to index the PDFs from `data/`. The app stores its persistent Chroma vectors in `vector_store/chroma/` and displays every retrieved source citation with the answer.
