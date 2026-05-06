export default function MetricsBar({ chunksIndexed, questionsAsked, sessionId }) {
  return (
    <div className="metrics-bar">
      <div className="metric">
        <span className="metric-value">{chunksIndexed}</span>
        <span className="metric-label">📄 Chunks Indexed</span>
      </div>
      <div className="metric">
        <span className="metric-value">llama3.2</span>
        <span className="metric-label">🧠 LLM</span>
      </div>
      <div className="metric">
        <span className="metric-value">{questionsAsked}</span>
        <span className="metric-label">💬 Questions</span>
      </div>
      <div className="metric metric--small">
        <span className="metric-value">MongoDB</span>
        <span className="metric-label">🗄 History Store</span>
      </div>
    </div>
  );
}
