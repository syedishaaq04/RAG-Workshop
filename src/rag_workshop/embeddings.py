"""A Chroma embedding function backed by Google's maintained GenAI SDK."""

import os
import re
import time

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
        contents = list(input)
        if not contents:
            return []

        batch_size = 64  # Keep comfortably below Gemini's 100 items per request limit.
        all_embeddings: list[list[float]] = []
        for i in range(0, len(contents), batch_size):
            batch = contents[i : i + batch_size]
            max_retries = 8
            for attempt in range(max_retries):
                try:
                    response = self._client.models.embed_content(
                        model=self._model_name,
                        contents=batch,
                        config=types.EmbedContentConfig(task_type=self._task_type),
                    )
                    all_embeddings.extend(embedding.values for embedding in response.embeddings)
                    break
                except Exception as exc:
                    err_str = str(exc)
                    if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()) and attempt < max_retries - 1:
                        match = re.search(r"retry in ([\d\.]+)s", err_str, re.IGNORECASE)
                        if match:
                            sleep_time = float(match.group(1)) + 2.0
                        else:
                            sleep_time = max(25.0, 15.0 * (1.5 ** attempt))
                        time.sleep(sleep_time)
                    else:
                        raise
            if i + batch_size < len(contents):
                time.sleep(1.0)
        return all_embeddings

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
