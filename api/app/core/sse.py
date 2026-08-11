from pydantic import BaseModel


def format_sse(event: str, data: BaseModel) -> str:
    """SDD-00 §6.5 envelope: `event: <domain>.<action>` / `data: {...}`."""
    return f"event: {event}\ndata: {data.model_dump_json()}\n\n"
