from app.knowledge.index_meta import case_study_ids, section_ids
from app.schemas.chat import PageContext


def resolve_page_context(page_context: PageContext | None) -> tuple[str | None, str | None, bool]:
    """SDD-03 §3.2 — whitelist-validate client-supplied page context.

    Unregistered values are dropped, not rejected: an arbitrary string never
    reaches the prompt (blocks the injection path noted in §3.2/§9.1).
    """
    if page_context is None:
        return None, None, False

    section = page_context.section if page_context.section in section_ids() else None
    case_study = page_context.case_study if page_context.case_study in case_study_ids() else None
    resolved = section is not None or case_study is not None
    return section, case_study, resolved
