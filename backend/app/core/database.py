from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.document import SyllabusDocument
from app.models.chat import ChatHistory

# Module-level references so the whole app shares a single Motor client
_motor_client: AsyncIOMotorClient = None
_db = None


async def init_db():
    global _motor_client, _db
    if _db is not None:
        return _motor_client, _db

    _motor_client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _motor_client.get_database("rag_workshop")
    await init_beanie(database=_db, document_models=[User, SyllabusDocument, ChatHistory])
    return _motor_client, _db


def get_db():
    """Return the already-initialised DB instance (call after startup)."""
    if _db is None:
        raise RuntimeError("Database has not been initialised yet. Call init_db() first.")
    return _db
