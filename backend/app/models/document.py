from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional

class SyllabusDocument(Document):
    filename: str
    gridfs_id: Optional[str] = None  # ID in GridFS
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending" # pending, processing, indexed, error
    error_msg: Optional[str] = None
    chunks_indexed: int = 0

    class Settings:
        name = "documents"
