"""PDF ingestion and local Chroma retrieval for the syllabus knowledge base."""

from dataclasses import asdict, dataclass
import hashlib
from pathlib import Path

import chromadb
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import Settings
from .embeddings import GoogleGeminiEmbeddingFunction


@dataclass(frozen=True)
class RetrievedChunk:
    text: str
    citation: str
    source_file: str
    page_number: int
    distance: float

    def to_dict(self) -> dict:
        return asdict(self)


class SyllabusKnowledgeBase:
    """Creates, maintains, and queries the persistent syllabus collection."""

    chunk_size = 1200
    chunk_overlap = 200

    def __init__(self, settings: Settings) -> None:
        settings.require_keys()
        self.settings = settings
        self.document_embeddings = GoogleGeminiEmbeddingFunction(
            api_key=settings.google_api_key or "",
            task_type="RETRIEVAL_DOCUMENT",
        )
        self.query_embeddings = GoogleGeminiEmbeddingFunction(
            api_key=settings.google_api_key or "",
            task_type="RETRIEVAL_QUERY",
        )
        settings.chroma_dir.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(settings.chroma_dir))
        self.collection = self.client.get_or_create_collection(
            name=settings.collection_name,
            configuration={"hnsw": {"space": "cosine"}},
            metadata={"purpose": "University syllabus RAG web app", "index_version": "v2"},
            embedding_function=self.document_embeddings,
        )

    @property
    def document_count(self) -> int:
        return self.collection.count()

    def pdf_names(self) -> list[str]:
        return [path.name for path in sorted(self.settings.data_dir.glob("*.pdf"))]

    def index_pdfs(self, rebuild: bool = False) -> int:
        """Index local PDFs; return the number of chunks added during this call."""
        pdf_paths = sorted(self.settings.data_dir.glob("*.pdf"))
        if not pdf_paths:
            raise FileNotFoundError(f"No PDFs found in {self.settings.data_dir}.")

        if rebuild and self.collection.count() > 0:
            all_ids = self.collection.get(limit=self.collection.count())["ids"]
            if all_ids:
                self.collection.delete(ids=all_ids)

        if self.collection.count() > 0:
            return 0

        pages = []
        for path in pdf_paths:
            pages.extend(PyPDFLoader(str(path)).load())

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            add_start_index=True,
        )
        chunks = splitter.split_documents(pages)
        ids, documents, metadatas = [], [], []

        for chunk_index, chunk in enumerate(chunks):
            raw = chunk.metadata
            source_file = Path(raw["source"]).name
            page_number = int(raw.get("page", 0)) + 1
            metadata = {
                "source_file": source_file,
                "page_number": page_number,
                "chunk_index": chunk_index,
                "char_start": int(raw.get("start_index", 0)),
                "citation": f"[{source_file}, p. {page_number}]",
            }
            digest_input = f"{source_file}|{page_number}|{chunk_index}|{chunk.page_content}"
            ids.append(hashlib.sha256(digest_input.encode("utf-8")).hexdigest())
            documents.append(chunk.page_content)
            metadatas.append(metadata)

        batch_size = 96
        for i in range(0, len(chunks), batch_size):
            self.collection.add(
                ids=ids[i : i + batch_size],
                documents=documents[i : i + batch_size],
                metadatas=metadatas[i : i + batch_size],
            )
        return len(chunks)

    def retrieve(
        self,
        query: str,
        k: int = 8,
        source_files: list[str] | None = None,
    ) -> list[RetrievedChunk]:
        if not query.strip():
            raise ValueError("Ask a non-empty question.")
        if self.collection.count() == 0:
            raise RuntimeError("The knowledge base is empty. Build the index first.")

        query_emb = self.query_embeddings([query])

        if source_files:
            available_sources = set(self.pdf_names())
            valid_targets = [s for s in source_files if s in available_sources]
            if valid_targets:
                chunks: list[RetrievedChunk] = []
                per_source_k = max(3, min(k, 6))
                for target_file in valid_targets:
                    try:
                        res = self.collection.query(
                            query_embeddings=query_emb,
                            n_results=per_source_k,
                            where={"source_file": target_file},
                            include=["documents", "metadatas", "distances"],
                        )
                        if res["documents"] and res["documents"][0]:
                            for doc, meta, dist in zip(
                                res["documents"][0],
                                res["metadatas"][0],
                                res["distances"][0],
                            ):
                                chunks.append(
                                    RetrievedChunk(
                                        text=doc,
                                        citation=meta["citation"],
                                        source_file=meta["source_file"],
                                        page_number=int(meta["page_number"]),
                                        distance=float(dist),
                                    )
                                )
                    except Exception:
                        pass
                if chunks:
                    return chunks

        result = self.collection.query(
            query_embeddings=query_emb,
            n_results=min(k, self.collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        return [
            RetrievedChunk(
                text=document,
                citation=metadata["citation"],
                source_file=metadata["source_file"],
                page_number=int(metadata["page_number"]),
                distance=float(distance),
            )
            for document, metadata, distance in zip(
                result["documents"][0],
                result["metadatas"][0],
                result["distances"][0],
            )
        ]
