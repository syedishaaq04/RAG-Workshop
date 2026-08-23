"""Streamlit interface for the University Syllabus RAG workshop."""

from pathlib import Path
import sys

import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from rag_workshop.agent import SyllabusRAGAgent
from rag_workshop.config import Settings
from rag_workshop.knowledge_base import SyllabusKnowledgeBase


st.set_page_config(page_title="Syllabus Scout", page_icon="✦", layout="wide")


@st.cache_resource(show_spinner=False)
def get_services() -> tuple[Settings, SyllabusKnowledgeBase, SyllabusRAGAgent]:
    settings = Settings.load(PROJECT_ROOT)
    knowledge_base = SyllabusKnowledgeBase(settings)
    return settings, knowledge_base, SyllabusRAGAgent(knowledge_base, settings)


def inject_css() -> None:
    st.markdown("""
    <style>
      .stApp { background: radial-gradient(circle at top left, #172554 0, #0b1020 44%, #111827 100%); }
      [data-testid="stSidebar"] { background: #101827; border-right: 1px solid #26334d; }
      .hero { padding: 2.6rem 0 1.4rem; }
      .hero h1 { font-size: clamp(2.5rem, 6vw, 4.9rem); letter-spacing: -0.075em; margin: 0; color: #f8fafc; }
      .hero p { color: #b8c5dc; font-size: 1.15rem; max-width: 48rem; margin: .8rem 0 0; }
      .eyebrow { color: #78d9c8; font-size: .78rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; }
      .metric-card { background: linear-gradient(130deg, rgba(30,41,59,.9), rgba(17,24,39,.9)); border: 1px solid #30425f; border-radius: 18px; padding: 1rem 1.2rem; }
      .metric-label { color: #9caec8; font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; }
      .metric-value { color: #f8fafc; font-size: 1.45rem; font-weight: 700; margin-top: .15rem; }
      .source-chip { display: inline-block; background: #183e4b; color: #b9f6eb; border: 1px solid #2a6876; border-radius: 999px; padding: .23rem .62rem; margin: .15rem .25rem .1rem 0; font-size: .82rem; }
      .stButton button { border-radius: 999px; border: 1px solid #3d536f; background: #1b2b45; color: #f8fafc; }
      .stButton button:hover { border-color: #78d9c8; color: #b9f6eb; }
    </style>
    """, unsafe_allow_html=True)


def render_sources(citations: list[dict]) -> None:
    if not citations:
        return
    chips = "".join(
        f'<span class="source-chip">{item["citation"]} · distance {item["distance"]:.3f}</span>'
        for item in citations
    )
    st.markdown(chips, unsafe_allow_html=True)


def render_message(message: dict) -> None:
    with st.chat_message(message["role"], avatar="✦" if message["role"] == "assistant" else "🎓"):
        st.markdown(message["content"])
        if message["role"] == "assistant":
            render_sources(message.get("citations", []))
            if message.get("trace"):
                with st.expander("Agent workflow trace"):
                    for step in message["trace"]:
                        st.write(f"• {step}")


def answer_question(agent: SyllabusRAGAgent, question: str) -> None:
    st.session_state.messages.append({"role": "user", "content": question})
    with st.chat_message("user", avatar="🎓"):
        st.markdown(question)
    with st.chat_message("assistant", avatar="✦"):
        with st.spinner("Retrieving evidence, reasoning, and checking citations..."):
            result = agent.ask(question)
        st.markdown(result["answer"])
        render_sources(result["citations"])
        with st.expander("Agent workflow trace"):
            st.caption(result["assessment"])
            for step in result["trace"]:
                st.write(f"• {step}")
    st.session_state.messages.append({"role": "assistant", "content": result["answer"], **result})


def main() -> None:
    inject_css()
    if "messages" not in st.session_state:
        st.session_state.messages = []

    try:
        settings, knowledge_base, agent = get_services()
    except Exception as error:
        st.error(str(error))
        st.info("Add `GOOGLE_API_KEY` and `GROQ_API_KEY` to `.env`, then reload the app.")
        st.stop()

    with st.sidebar:
        st.markdown("## ✦ Syllabus Scout")
        st.caption("A workshop-ready RAG agent")
        st.divider()
        st.markdown("**Knowledge base**")
        st.write(f"{knowledge_base.document_count} indexed chunks")
        pdf_names = knowledge_base.pdf_names()
        st.caption("PDFs detected")
        for name in pdf_names or ["No PDFs in data/"]:
            st.write(f"• {name}")
        rebuild = st.checkbox("Rebuild existing index", help="Use after changing PDFs or chunking.")
        if st.button("Build knowledge base", use_container_width=True):
            try:
                with st.spinner("Embedding syllabus pages with Gemini..."):
                    added = knowledge_base.index_pdfs(rebuild=rebuild)
                st.success(f"Ready. Added {added} chunks." if added else "Existing index is ready.")
                st.rerun()
            except Exception as error:
                st.error(str(error))
        st.divider()
        st.caption(f"Agents: {settings.groq_model}")
        if st.button("Clear conversation", use_container_width=True):
            st.session_state.messages = []
            st.rerun()

    st.markdown("""
    <div class="hero">
      <div class="eyebrow">University knowledge, with receipts</div>
      <h1>Ask your syllabus<br>anything.</h1>
      <p>See a LangGraph RAG agent retrieve the right pages, assess evidence, write an answer, and review its own citations.</p>
    </div>
    """, unsafe_allow_html=True)

    metrics = st.columns(3)
    metrics[0].markdown(f'<div class="metric-card"><div class="metric-label">Indexed chunks</div><div class="metric-value">{knowledge_base.document_count}</div></div>', unsafe_allow_html=True)
    metrics[1].markdown(f'<div class="metric-card"><div class="metric-label">Source PDFs</div><div class="metric-value">{len(pdf_names)}</div></div>', unsafe_allow_html=True)
    metrics[2].markdown('<div class="metric-card"><div class="metric-label">Agent pipeline</div><div class="metric-value">4 stages</div></div>', unsafe_allow_html=True)

    st.markdown("### Conversation")
    if not st.session_state.messages:
        st.info("Build the knowledge base, then ask a specific syllabus question. Every answer includes its retrieved PDF pages.")
    for message in st.session_state.messages:
        render_message(message)

    suggestions = [
        "Which subjects are listed for the first semester?",
        "What eligibility requirements are stated in the syllabus?",
        "Which courses mention artificial intelligence?",
    ]
    with st.expander("Try a workshop question"):
        suggestion_columns = st.columns(3)
        for column, suggestion in zip(suggestion_columns, suggestions):
            if column.button(suggestion, use_container_width=True):
                answer_question(agent, suggestion)

    if prompt := st.chat_input("Ask about courses, credits, regulations, or eligibility..."):
        answer_question(agent, prompt)


if __name__ == "__main__":
    main()
