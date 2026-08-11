from openai import OpenAI

from app.core.config import settings


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts with the configured embedding model.

    Shared by the build-time script (documents) and runtime `search()`
    (queries) so both always use the same provider/model — SDD-02 DD-08.
    """
    if not texts:
        return []
    client = OpenAI(api_key=settings.embedding_api_key)
    response = client.embeddings.create(model=settings.embedding_model, input=texts)
    return [item.embedding for item in response.data]
