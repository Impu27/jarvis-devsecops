import { useRef, useState } from "react";
import { uploadDocument, deleteDocument } from "../api/jarvis";

function DocumentItem({ doc, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!confirm(`Delete ${doc.originalName || doc.filename}?`)) return;
    setDeleting(true);
    setError("");
    try {
      await deleteDocument(doc._id);
      onDelete(doc);
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`doc-item doc-status-${doc.status}`}>
      <span className="doc-icon">📄</span>
      <div className="doc-info">
        <span className="doc-name">{doc.originalName || doc.filename}</span>
        <span className="doc-meta">
          {doc.chunksIndexed} chunks · {doc.status}
          {doc.errorMessage ? ` · ${doc.errorMessage}` : ""}
        </span>
      </div>
      <button className="doc-delete-btn" onClick={handleDelete} disabled={deleting}>
        {deleting ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="doc-error">{error}</p>}
    </div>
  );
}

export default function Sidebar({ open, onToggle, documents, onDocumentAdded, onDocumentDeleted, onNewSession, sessionId }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const result = await uploadDocument(file);
      onDocumentAdded(result);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <aside className={`sidebar ${open ? "sidebar--open" : "sidebar--closed"}`}>
      <div className="sidebar-inner">
        <div className="sidebar-section">
          <h3 className="sidebar-heading">📁 Knowledge Base</h3>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "⏳ Processing…" : "⬆ Upload PDF"}
          </button>

          {uploadError && <p className="upload-error">❌ {uploadError}</p>}

          <div className="doc-list">
            {documents.length === 0 ? (
              <p className="no-docs">No documents yet</p>
            ) : (
              documents.map((d, i) => (
                <DocumentItem key={d._id || i} doc={d} onDelete={onDocumentDeleted} />
              ))
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-heading">🏗 Architecture</h3>
          <pre className="arch-diagram">{`React UI
   ↓
Node.js API
   ↓
FastAPI RAG
   ↓
ChromaDB ← PDFs
   ↓
Ollama LLM
   ↓
MongoDB (history)`}</pre>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-heading-row">
            <h3 className="sidebar-heading">🔑 Session</h3>
            <button className="session-btn" type="button" onClick={onNewSession}>
              New session
            </button>
          </div>
          <code className="session-id">{sessionId}</code>
          <p className="session-note">
            Your current session is stored locally. Starting a new session keeps documents but resets chat history.
          </p>
        </div>
      </div>
    </aside>
  );
}
