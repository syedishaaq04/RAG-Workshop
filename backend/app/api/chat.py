from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.auth import get_current_user
from app.models.chat import ChatHistory
from app.core.database import get_db
from app.services.vector_store import MongoDBVectorStore
from app.services.agent import SyllabusRAGAgent
from typing import List, Optional

router = APIRouter()


class ChatRequest(BaseModel):
    chat_id: Optional[str] = None
    question: str


@router.post("/message")
async def send_message(request: ChatRequest, user=Depends(get_current_user)):
    db = get_db()

    # Get or create ChatHistory
    chat = None
    if request.chat_id:
        chat = await ChatHistory.get(request.chat_id)
        if not chat or chat.user_id != str(user.id):
            chat = None  # invalid reference — start fresh

    if chat is None:
        chat = ChatHistory(user_id=str(user.id), title=request.question[:40])

    chat.messages.append({"role": "user", "content": request.question})

    vs = MongoDBVectorStore(db)
    agent = SyllabusRAGAgent(vs)

    # Pass conversation history for multi-turn context (exclude the just-appended user message)
    history_for_agent = chat.messages[:-1]  # all messages before current question
    result = await agent.ask(request.question, history=history_for_agent)

    assistant_msg = {
        "role": "assistant",
        "content": result["answer"],
        "citations": result.get("citations", []),
    }
    chat.messages.append(assistant_msg)
    
    # Don't save history for the guest user
    if user.email != "guest@uni.edu":
        await chat.save()

    return {
        "chat_id": str(chat.id),
        "message": assistant_msg,
    }


@router.get("/history", response_model=List[dict])
async def get_history(user=Depends(get_current_user)):
    if user.email == "guest@uni.edu":
        return []
        
    chats = await ChatHistory.find(ChatHistory.user_id == str(user.id)).to_list()
    # Sort by creation time if we had a timestamp, or just return as is
    return [{"id": str(c.id), "title": c.title, "messages": c.messages} for c in chats]

@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, user=Depends(get_current_user)):
    chat = await ChatHistory.get(chat_id)
    if chat and chat.user_id == str(user.id):
        await chat.delete()
        return {"status": "deleted"}
    return {"status": "not_found"}
