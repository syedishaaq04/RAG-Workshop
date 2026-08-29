from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from app.api.auth import get_current_admin
from app.models.document import SyllabusDocument
from app.core.database import get_db
from app.services.vector_store import MongoDBVectorStore
from typing import List

router = APIRouter()


async def process_pdf_background(doc_id: str, file_content: bytes, filename: str):
    """Background task: embed PDF chunks into Atlas Vector Search."""
    doc = await SyllabusDocument.get(doc_id)
    if not doc:
        return
    doc.status = "processing"
    await doc.save()

    try:
        db = get_db()  # reuse the shared Motor client
        vs = MongoDBVectorStore(db)
        chunk_count = await vs.process_pdf(file_content, filename)

        doc.chunks_indexed = chunk_count
        doc.status = "indexed"
        await doc.save()
    except Exception as e:
        doc.status = "error"
        doc.error_msg = str(e)
        await doc.save()


@router.post("/documents/upload", response_model=dict)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    admin=Depends(get_current_admin)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await file.read()

    existing = await SyllabusDocument.find_one(SyllabusDocument.filename == file.filename)
    if existing:
        raise HTTPException(status_code=400, detail="Document with this name already exists")

    doc = SyllabusDocument(filename=file.filename)
    await doc.insert()

    background_tasks.add_task(process_pdf_background, str(doc.id), content, file.filename)
    return {"message": "Document upload started", "id": str(doc.id)}


@router.get("/documents", response_model=List[dict])
async def list_documents(admin=Depends(get_current_admin)):
    docs = await SyllabusDocument.find_all().to_list()
    return [
        {
            "id": str(d.id),
            "filename": d.filename,
            "status": d.status,
            "chunks": d.chunks_indexed,
        }
        for d in docs
    ]


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, admin=Depends(get_current_admin)):
    doc = await SyllabusDocument.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db = get_db()
    vs = MongoDBVectorStore(db)
    await vs.delete_document_chunks(doc.filename)

    await doc.delete()
    return {"message": "Document and vectors deleted"}
