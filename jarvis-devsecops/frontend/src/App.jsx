import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import MetricsBar from "./components/MetricsBar";
import { fetchHistory, fetchDocuments, clearHistory, sendQuery } from "./api/jarvis";
import "./index.css";

export default function App() {
  const [sessionId, setSessionId] = useState(() => {
    let existing = localStorage.getItem("jarvis_session");
    if (existing) return existing;
    const id = nanoid(16);
    localStorage.setItem("jarvis_session", id);
    return id;
  });

  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [chunksIndexed, setChunksIndexed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load chat history from MongoDB on mount
  useEffect(() => {
    fetchHistory(sessionId).then((data) => {
      if (data?.messages?.length) setMessages(data.messages);
    });
  }, [sessionId]);

  // Load persisted document metadata on mount
  useEffect(() => {
    fetchDocuments()
      .then((data) => {
        if (data?.documents?.length) {
          setDocuments(data.documents);
          setChunksIndexed(data.documents.reduce((sum, doc) => sum + (doc.chunksIndexed || 0), 0));
        }
      })
      .catch(() => {
        // Ignore fetch errors; UI will continue to work for new uploads
      });
  }, []);

  const handleSend = useCallback(async (question) => {
    const userMsg = { role: "user", content: question, _id: nanoid() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const data = await sendQuery(question, sessionId);
      const assistantMsg = {
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
        latencyMs: data.latencyMs,
        _id: data.messageId || nanoid(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ ${err.message || "Something went wrong. Is the backend running?"}`,
          _id: nanoid(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleDocumentAdded = (doc) => {
    setDocuments((prev) => [doc, ...prev]);
    setChunksIndexed((prev) => prev + (doc.chunksIndexed || 0));
  };

  const handleDocumentDeleted = (deletedDoc) => {
    setDocuments((prev) => prev.filter((doc) => doc._id !== deletedDoc._id));
    setChunksIndexed((prev) => Math.max(0, prev - (deletedDoc.chunksIndexed || 0)));
  };

  const handleNewSession = useCallback(() => {
    const id = nanoid(16);
    localStorage.setItem("jarvis_session", id);
    setSessionId(id);
    setMessages([]);
  }, []);

  const handleClearHistory = useCallback(async () => {
    setMessages([]);
    try {
      await clearHistory(sessionId);
    } catch (err) {
      console.warn("Failed to clear chat history:", err);
    }
  }, [sessionId]);

  const questionsAsked = messages.filter((m) => m.role === "user").length;

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        documents={documents}
        onDocumentAdded={handleDocumentAdded}
        onDocumentDeleted={handleDocumentDeleted}
        onNewSession={handleNewSession}
        sessionId={sessionId}
      />

      <main className={`main-content ${sidebarOpen ? "sidebar-open" : ""}`}>
        <header className="app-header">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)}>
            ☰
          </button>
          <div className="header-title">
            <span className="jarvis-logo">🤖</span>
            <h1>JARVIS</h1>
            <span className="header-sub">Just A Rather Very Intelligent System</span>
          </div>
        </header>

        <MetricsBar
          chunksIndexed={chunksIndexed}
          questionsAsked={questionsAsked}
          sessionId={sessionId}
        />

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
          onClear={handleClearHistory}
        />
      </main>
    </div>
  );
}
