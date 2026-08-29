from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import List, Dict, Any

class ChatHistory(Document):
    user_id: str
    title: str = "New Conversation"
    messages: List[Dict[str, Any]] = [] # [{role: "user" | "assistant", content: "...", citations: []}]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chats"
