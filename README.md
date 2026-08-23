# University Syllabus RAG Workshop

This project contains a student-friendly Jupyter notebook that builds a Retrieval-Augmented Generation (RAG) chatbot over university syllabus PDFs.

## Quick start

1. Create and activate a virtual environment.
2. Install the workshop packages: `pip install -r requirements.txt`.
3. Put one or more syllabus PDFs in `data/`.
4. Add `GOOGLE_API_KEY` and `GROQ_API_KEY` to `.env` (use `.env.example` as the template).
5. Start Jupyter with `jupyter lab` and run `rag_workshop.ipynb` from top to bottom.

The generated Chroma database lives under `vector_store/chroma/`. It is intentionally ignored by Git because it can be rebuilt from the PDFs. The notebook uses the current Google GenAI Python SDK (`google-genai`) through a small Chroma-compatible Gemini embedding adapter.

The workshop notebook shows both a grounded `rag_search()` path and a baseline `plain_llm_search()` path so students can compare the impact of retrieval.
