"""Central settings for the Streamlit app and LangGraph workflow."""

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    project_root: Path
    data_dir: Path
    chroma_dir: Path
    collection_name: str
    google_api_key: str | None
    groq_api_key: str | None
    groq_model: str

    @classmethod
    def load(cls, project_root: Path) -> "Settings":
        load_dotenv(project_root / ".env", override=True)
        index_version = "v2"
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if google_api_key:
            google_api_key = google_api_key.strip().strip("'\"")
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            groq_api_key = groq_api_key.strip().strip("'\"")
        return cls(
            project_root=project_root,
            data_dir=project_root / "data",
            chroma_dir=project_root / "vector_store" / "chroma",
            collection_name=f"university_syllabus_{index_version}",
            google_api_key=google_api_key or None,
            groq_api_key=groq_api_key or None,
            groq_model=os.getenv("RAG_AGENT_MODEL", "openai/gpt-oss-120b").strip(),
        )

    def require_keys(self) -> None:
        placeholders = {
            "your_google_ai_studio_key_here",
            "your_groq_api_key_here",
            "",
        }
        missing = []
        if not self.google_api_key or self.google_api_key in placeholders:
            missing.append("GOOGLE_API_KEY")
        if not self.groq_api_key or self.groq_api_key in placeholders:
            missing.append("GROQ_API_KEY")

        if missing:
            raise RuntimeError(
                f"Missing or placeholder {', '.join(missing)}. Add the valid API key(s) to {self.project_root / '.env'}."
            )
