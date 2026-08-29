from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.auth import get_current_user
from app.models.chat import ChatHistory
from app.core.database import init_db
from app.services.vector_store import MongoDBVectorStore
from app.services.agent import SyllabusRAGAgent
from typing import List

router = APIRouter()

class ChatRequest(BaseModel):
    chat_id: str = None
    question: str

@router.post("/message")
async def send_message(request: ChatRequest, user=Depends(get_current_user)):
    client, db = await init_db()
    
    # Get or create ChatHistory
    if request.chat_id:
        chat = await ChatHistory.get(request.chat_id)
        if not chat or chat.user_id != str(user.id):
            chat = ChatHistory(user_id=str(user.id), title=request.question[:30])
    else:
        chat = ChatHistory(user_id=str(user.id), title=request.question[:30])
        
    chat.messages.append({"role": "user", "content": request.question})
    
    vs = MongoDBVectorStore(db)
    agent = SyllabusRAGAgent(vs)
    
    # Process
    result = await agent.ask(request.question)
    
    assistant_msg = {
        "role": "assistant",
        "content": result["answer"],
        "citations": result["citations"],
        "trace": result["trace"]
    }
    chat.messages.append(assistant_msg)
    await chat.save()
    
    return {
        "chat_id": str(chat.id),
        "message": assistant_msg
    }

@router.get("/history", response_model=List[dict])
async def get_history(user=Depends(get_current_user)):
    chats = await ChatHistory.find(ChatHistory.user_id == str(user.id)).to_list()
    return [{"id": str(c.id), "title": c.title, "messages": c.messages} for c in chats]
