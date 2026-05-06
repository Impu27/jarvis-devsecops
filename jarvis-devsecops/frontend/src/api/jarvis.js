const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const headers = {
  "Content-Type": "application/json",
  ...(import.meta.env.VITE_API_KEY
    ? { "x-api-key": import.meta.env.VITE_API_KEY }
    : {}),
};

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const sendQuery = (question, sessionId) =>
  fetch(`${BASE_URL}/chat/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question, sessionId }),
  }).then(handleResponse);

export const fetchHistory = (sessionId) =>
  fetch(`${BASE_URL}/chat/history/${sessionId}`, { headers }).then(handleResponse);

export const clearHistory = (sessionId) =>
  fetch(`${BASE_URL}/chat/history/${sessionId}`, {
    method: "DELETE",
    headers,
  }).then(handleResponse);

// ── Documents ─────────────────────────────────────────────────────────────────
export const uploadDocument = async (file) => {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/documents/upload`, {
    method: "POST",
    headers: { ...(import.meta.env.VITE_API_KEY ? { "x-api-key": import.meta.env.VITE_API_KEY } : {}) },
    body: form,
  });
  return handleResponse(res);
};

export const fetchDocuments = () =>
  fetch(`${BASE_URL}/documents`, { headers }).then(handleResponse);

export const deleteDocument = (id) =>
  fetch(`${BASE_URL}/documents/${id}`, { method: "DELETE", headers }).then(handleResponse);

// ── Health ────────────────────────────────────────────────────────────────────
export const checkHealth = () =>
  fetch(`${BASE_URL}/health`).then(handleResponse);
