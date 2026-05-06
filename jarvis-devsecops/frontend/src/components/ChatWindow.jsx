import { useEffect, useRef, useState } from "react";

function SourceBadge({ source, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="source-badge">
      <button className="source-toggle" onClick={() => setOpen((o) => !o)}>
        📄 {source.filename} {source.page != null ? `— p.${source.page}` : ""} {open ? "▲" : "▼"}
      </button>
      {open && <p className="source-excerpt">{source.excerpt}</p>}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`message ${isUser ? "message-user" : "message-assistant"}`}>
      <div className="message-avatar">{isUser ? "👤" : "🤖"}</div>
      <div className="message-body">
        <p className="message-text">{msg.content}</p>
        {msg.sources?.length > 0 && (
          <div className="sources-list">
            <span className="sources-label">📚 Sources</span>
            {msg.sources.map((s, i) => (
              <SourceBadge key={i} source={s} index={i + 1} />
            ))}
          </div>
        )}
        {msg.latencyMs && (
          <span className="latency-tag">{msg.latencyMs}ms</span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message message-assistant">
      <div className="message-avatar">🤖</div>
      <div className="message-body">
        <div className="typing-indicator">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, isLoading, onSend, onClear }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    onSend(q);
  };

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🤖</span>
            <h2>Ask JARVIS anything</h2>
            <p>Upload a PDF in the sidebar, then ask questions about it.</p>
          </div>
        )}
        {messages.map((msg) => (
          <Message key={msg._id} msg={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask JARVIS anything about your documents…"
          disabled={isLoading}
          maxLength={2000}
        />
        <button className="send-btn" type="submit" disabled={!input.trim() || isLoading}>
          {isLoading ? "…" : "Send ↑"}
        </button>
        {messages.length > 0 && (
          <button className="clear-btn" type="button" onClick={onClear}>
            🗑
          </button>
        )}
      </form>
    </div>
  );
}
