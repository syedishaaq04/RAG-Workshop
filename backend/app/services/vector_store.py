import os
import uuid
import tempfile
from motor.motor_asyncio import AsyncIOMotorClient
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai
from google.genai import types
from app.core.config import settings
from app.models.document import SyllabusDocument
import asyncio
import re
import math

class MongoDBVectorStore:
    def __init__(self, db):
        self.db = db
        self.collection = db.chunks
        self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.embedding_model = "models/gemini-embedding-001" # Current updated embedding model for google-genai
    
    async def get_embedding_batch(self, texts: list[str]) -> list[list[float]]:
        # Handle batching (max 100 per batch for Gemini embeddings typically)
        batch_size = 64
        all_embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            for attempt in range(5):
                try:
                    response = self.gemini_client.models.embed_content(
                        model=self.embedding_model,
                        contents=batch,
                        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
                    )
                    all_embeddings.extend([emb.values for emb in response.embeddings])
                    break
                except Exception as e:
                    err_msg = str(e)
                    if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                        match = re.search(r"retryDelay\s*:\s*'?(\d+)s'?", err_msg)
                        sleep_time = int(match.group(1)) if match else 2 ** attempt
                        await asyncio.sleep(sleep_time)
                    else:
                        raise e
        return all_embeddings

    async def get_query_embedding(self, text: str) -> list[float]:
        response = self.gemini_client.models.embed_content(
            model=self.embedding_model,
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
        )
        return response.embeddings[0].values

    async def process_document(self, file_content: bytes, filename: str) -> int:
        # Determine extension
        ext = os.path.splitext(filename)[1].lower()
        
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name

        try:
            if ext == '.pdf':
                loader = PyPDFLoader(tmp_path)
            elif ext == '.docx':
                loader = Docx2txtLoader(tmp_path)
            elif ext == '.txt':
                loader = TextLoader(tmp_path, encoding='utf-8')
            elif ext == '.csv':
                loader = CSVLoader(tmp_path, encoding='utf-8')
            else:
                raise ValueError(f"Unsupported file extension: {ext}")
                
            docs = loader.load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=160)
            chunks = splitter.split_documents(docs)

            # Insert chunks into MongoDB
            # Prepare metadata
            records = []
            texts = []
            for idx, c in enumerate(chunks):
                page_num = c.metadata.get("page", 0) + 1
                texts.append(c.page_content)
                records.append({
                    "_id": str(uuid.uuid4()),
                    "text": c.page_content,
                    "source_file": filename,
                    "page_number": page_num,
                    "citation": f"[{filename}, p. {page_num}]"
                })

            embeddings = await self.get_embedding_batch(texts)
            
            for record, embedding in zip(records, embeddings):
                record["embedding"] = embedding
            
            # Batch insert
            if records:
                await self.collection.insert_many(records)
            
            return len(records)
        finally:
            os.remove(tmp_path)
            
    async def delete_document_chunks(self, filename: str):
        await self.collection.delete_many({"source_file": filename})

    async def retrieve(self, query: str, k: int = 8, source_files: list[str] = None):
        query_emb = await self.get_query_embedding(query)

        # --- Stage 1: Atlas Vector Search ---
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_emb,
                    "numCandidates": max(k * 10, 150),
                    "limit": k
                }
            }
        ]
        if source_files:
            pipeline[0]["$vectorSearch"]["filter"] = {"source_file": {"$in": source_files}}

        pipeline.append({
            "$project": {
                "_id": 1,
                "text": 1,
                "citation": 1,
                "source_file": 1,
                "page_number": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        })
        cursor = self.collection.aggregate(pipeline)
        vector_results = await cursor.to_list(length=k)

        # --- Stage 2: Keyword fallback search using noun phrase bigrams ---
        stopwords = {"the", "are", "for", "what", "list", "of", "in", "a", "an", "and",
                     "is", "to", "all", "any", "this", "that", "with", "from", "about"}
        words = [w.strip("?.,!") for w in query.lower().split() if len(w) > 2 and w.strip("?.,!") not in stopwords]
        seen_ids = {str(r["_id"]) for r in vector_results}
        extra_results = []
        if words:
            # Build bigrams (phrase pairs) for more precise matching
            bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
            search_terms = bigrams if bigrams else words[:3]
            # Escape special regex chars
            import re as _re
            escaped = [_re.escape(t) for t in search_terms[:4]]
            keyword_filter: dict = {"text": {"$regex": "|".join(escaped), "$options": "i"}}
            if source_files:
                keyword_filter["source_file"] = {"$in": source_files}
            kw_cursor = self.collection.find(
                keyword_filter,
                {"_id": 1, "text": 1, "citation": 1, "source_file": 1, "page_number": 1}
            ).limit(k)
            kw_docs = await kw_cursor.to_list(length=k)
            for doc in kw_docs:
                doc_id = str(doc["_id"])
                if doc_id not in seen_ids:
                    doc["score"] = 0.75  # baseline score for keyword hits
                    extra_results.append(doc)
                    seen_ids.add(doc_id)

        all_results = vector_results + extra_results

        # --- Build result objects ---
        class RetrievedChunk:
            def __init__(self, text, citation, source_file, page_number, distance):
                self.text = text
                self.citation = citation
                self.source_file = source_file
                self.page_number = page_number
                self.distance = distance

            def to_dict(self):
                return self.__dict__

        chunks = []
        for r in all_results:
            distance = 1.0 - r.get("score", 0.75)
            chunks.append(RetrievedChunk(
                r["text"], r["citation"], r["source_file"], r["page_number"], distance
            ))
        return chunks

    async def get_available_sources(self) -> list[str]:
        sources = await self.collection.distinct("source_file")
        return sources
