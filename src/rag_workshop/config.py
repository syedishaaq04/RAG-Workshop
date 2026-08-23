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
        load_dotenv(project_root / ".env")
        index_version = "v2"
        return cls(
            project_root=project_root,
            data_dir=project_root / "data",
            chroma_dir=project_root / "vector_store" / "chroma",
            collection_name=f"university_syllabus_{index_version}",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            groq_api_key=os.getenv("GROQ_API_KEY"),
            groq_model=os.getenv("RAG_AGENT_MODEL", "openai/gpt-oss-120b"),
        )

    def require_keys(self) -> None:
        missing = [
            name
            for name, value in {
                "GOOGLE_API_KEY": self.google_api_key,
                "GROQ_API_KEY": self.groq_api_key,
            }.items()
            if not value
        ]
        if missing:
            raise RuntimeError(
                f"Missing {', '.join(missing)}. Add the value(s) to {self.project_root / '.env'}."
            )
