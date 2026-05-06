"""
JARVIS — RAG Microservice (FastAPI)
Fixed for chromadb 1.x — uses PersistentClient instead of deprecated Client()

Endpoints:
    POST /ingest   — upload & index a PDF
    POST /query    — semantic search + LLM answer
    GET  /health   — liveness probe
    GET  /stats    — vector store statistics
"""

import os
import tempfile
from pathlib import Path
from typing import List, Optional

import chromadb
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ── Config ────────────────────────────────────────────────────────────────────
CHROMA_PATH     = os.getenv("CHROMA_PATH", "/data/chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.3"))
CHUNK_SIZE      = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP   = int(os.getenv("CHUNK_OVERLAP", "50"))
TOP_K_RESULTS   = int(os.getenv("TOP_K_RESULTS", "3"))
COLLECTION_NAME = "jarvis_docs"

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="JARVIS RAG Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # locked to backend in production via nginx
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Singletons ────────────────────────────────────────────────────────────────
print(f"Loading embedding model: {EMBEDDING_MODEL}")
embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

print(f"Connecting to Ollama at {OLLAMA_BASE_URL} with model {OLLAMA_MODEL}")
llm = OllamaLLM(
    model=OLLAMA_MODEL,
    temperature=LLM_TEMPERATURE,
    base_url=OLLAMA_BASE_URL,
)


# ── ChromaDB 1.x helper ───────────────────────────────────────────────────────
def get_chroma_client() -> chromadb.PersistentClient:
    """
    ChromaDB 1.x uses PersistentClient(path=...) — NOT the old Client() call.
    This creates the directory and default tenant automatically.
    """
    os.makedirs(CHROMA_PATH, exist_ok=True)
    return chromadb.PersistentClient(path=CHROMA_PATH)


def get_vector_store() -> Optional[Chroma]:
    """
    Return a LangChain Chroma wrapper using the 1.x PersistentClient.
    Returns None if the collection is empty (no PDFs ingested yet).
    """
    client = get_chroma_client()

    # Check if collection exists and has documents
    try:
        collection = client.get_collection(COLLECTION_NAME)
        if collection.count() == 0:
            return None
    except Exception:
        # Collection doesn't exist yet — no PDFs uploaded
        return None

    return Chroma(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
    )


def get_or_create_vector_store() -> Chroma:
    """Always returns a usable Chroma instance (creates collection if needed)."""
    client = get_chroma_client()
    return Chroma(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
    )


# ── Schemas ───────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)

class SourceInfo(BaseModel):
    filename: str
    page: Optional[int] = None
    excerpt: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]

class IngestResponse(BaseModel):
    chunks_indexed: int
    filename: str

class DeleteRequest(BaseModel):
    source: str


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    """Liveness probe — does NOT require a populated DB to return 200."""
    client = get_chroma_client()
    chunks = 0
    try:
        collection = client.get_collection(COLLECTION_NAME)
        chunks = collection.count()
    except Exception:
        pass  # No collection yet — that's fine on first start

    return {
        "status": "ok",
        "model": OLLAMA_MODEL,
        "chroma_path": CHROMA_PATH,
        "chunks_in_db": chunks,
    }


@app.get("/stats")
def stats():
    client = get_chroma_client()
    try:
        collection = client.get_collection(COLLECTION_NAME)
        return {"chunks": collection.count()}
    except Exception:
        return {"chunks": 0}


@app.post("/ingest", response_model=IngestResponse)
async def ingest(
    file: UploadFile = File(...),
    source: str = Form(...),
    display_name: Optional[str] = Form(None),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF files accepted")

    content = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        documents = loader.load()

        for doc in documents:
            doc.metadata["source"] = source or file.filename
            if display_name:
                doc.metadata["display_name"] = display_name

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        chunks = splitter.split_documents(documents)

        # Use get_or_create so repeated uploads append correctly
        vs = get_or_create_vector_store()
        vs.add_documents(chunks)

        return IngestResponse(chunks_indexed=len(chunks), filename=file.filename)
    finally:
        os.unlink(tmp_path)


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    vs = get_vector_store()
    if vs is None:
        raise HTTPException(
            status_code=503,
            detail="No knowledge base found. Upload a PDF first.",
        )

    retriever = vs.as_retriever(
        search_type="similarity",
        search_kwargs={"k": TOP_K_RESULTS},
    )

    system_prompt = (
        "You are JARVIS, a helpful and accurate AI assistant. "
        "Use ONLY the document excerpts provided below to answer the user. "
        "If the PDF is a syllabus, summarize each main subject and section, including outcomes, schedule, assessments, and page references. "
        "Be detailed, avoid hallucination, and cite the source filename and page whenever possible. "
        "If the answer is not contained in the provided documents, say you do not know rather than guessing.\n\n"
        "Document excerpts:\n{context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    qa_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, qa_chain)
    response = rag_chain.invoke({"input": req.question})

    answer = response.get("answer") or response.get("output_text") or ""
    raw_sources = response.get("source_documents") or response.get("context") or []

    sources = []
    for doc in raw_sources:
        filename = doc.metadata.get("display_name") or doc.metadata.get("source") or "Unknown"
        sources.append(SourceInfo(
            filename=Path(filename).name,
            page=doc.metadata.get("page"),
            excerpt=doc.page_content[:200],
        ))

    return QueryResponse(answer=answer, sources=sources)

@app.post("/delete")
def delete_source(req: DeleteRequest):
    client = get_chroma_client()
    try:
        collection = client.get_collection(COLLECTION_NAME)
    except Exception:
        raise HTTPException(status_code=404, detail="No indexed collection found")

    try:
        collection.delete(where={"source": req.source})
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Vector delete failed: {err}")

    return {"deleted_source": req.source}