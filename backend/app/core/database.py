from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.document import SyllabusDocument
from app.models.chat import ChatHistory

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = client.rag_workshop
    await init_beanie(database, document_models=[User, SyllabusDocument, ChatHistory])
    return client, database
