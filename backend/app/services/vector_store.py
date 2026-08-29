import os
import uuid
import tempfile
from motor.motor_asyncio import AsyncIOMotorClient
from langchain_community.document_loaders import PyPDFLoader
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
        self.embedding_model = "models/text-embedding-004" # Current updated embedding model for google-genai
    
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

    async def process_pdf(self, file_content: bytes, filename: str) -> int:
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name

        try:
            loader = PyPDFLoader(tmp_path)
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
        
        # Build Vector Search Pipeline
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_emb,
                    "numCandidates": k * 5,
                    "limit": k
                }
            }
        ]

        if source_files:
            pipeline[0]["$vectorSearch"]["filter"] = {"source_file": {"$in": source_files}}
            
        pipeline.append({
            "$project": {
                "_id": 0,
                "text": 1,
                "citation": 1,
                "source_file": 1,
                "page_number": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        })

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=k)
        
        # Translate to objects expected by agent
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
        for r in results:
            # vectorSearchScore is similarity, we might map to distance: 1 - score
            distance = 1.0 - r.get("score", 1.0)
            chunks.append(RetrievedChunk(r["text"], r["citation"], r["source_file"], r["page_number"], distance))
            
        return chunks
        
    async def get_available_sources(self) -> list[str]:
        sources = await self.collection.distinct("source_file")
        return sources
