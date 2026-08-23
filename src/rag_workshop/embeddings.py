"""A Chroma embedding function backed by Google's maintained GenAI SDK."""

import os

from chromadb import Documents, EmbeddingFunction, Embeddings
from google import genai
from google.genai import types


class GoogleGeminiEmbeddingFunction(EmbeddingFunction[Documents]):
    """Embed text with Gemini Embedding 1 without persisting API credentials."""

    def __init__(
        self,
        api_key: str,
        task_type: str,
        model_name: str = "gemini-embedding-001",
        api_key_env_var: str = "GOOGLE_API_KEY",
    ) -> None:
        self._client = genai.Client(api_key=api_key)
        self._task_type = task_type
        self._model_name = model_name
        self._api_key_env_var = api_key_env_var

    def __call__(self, input: Documents) -> Embeddings:
        response = self._client.models.embed_content(
            model=self._model_name,
            contents=list(input),
            config=types.EmbedContentConfig(task_type=self._task_type),
        )
        return [embedding.values for embedding in response.embeddings]

    @staticmethod
    def name() -> str:
        return "google_gemini_embedding"

    def get_config(self) -> dict:
        return {
            "model_name": self._model_name,
            "task_type": self._task_type,
            "api_key_env_var": self._api_key_env_var,
        }

    @staticmethod
    def build_from_config(config: dict) -> "GoogleGeminiEmbeddingFunction":
        api_key = os.getenv(config.get("api_key_env_var", "GOOGLE_API_KEY"))
        if not api_key:
            raise ValueError("GOOGLE_API_KEY must be set to create the embedding function.")
        return GoogleGeminiEmbeddingFunction(
            api_key=api_key,
            task_type=config["task_type"],
            model_name=config["model_name"],
            api_key_env_var=config.get("api_key_env_var", "GOOGLE_API_KEY"),
        )
