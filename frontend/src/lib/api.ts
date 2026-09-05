const API_BASE = "/api";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  mood?: string;
  stressLevel?: number;
}

export interface ChatResponse {
  reply: string;
  mood?: string;
  stress_level?: number;
  summary?: string;
}

export interface JournalSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface JournalSummary {
  id: string;
  sessionId: string;
  summary: string;
  mood?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt: string;
}

export async function sendMessage(
  token: string,
  message: string,
  history: ChatMessage[],
  sessionId?: string,
  persona: string = "Empathic Listener"
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, history, session_id: sessionId, persona }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export async function getSessions(token: string): Promise<JournalSession[]> {
  const res = await fetch(`${API_BASE}/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  const data = await res.json();
  return data.sessions;
}

export async function getSessionMessages(
  token: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  const data = await res.json();
  return data.messages;
}

export async function summarizeSession(
  token: string,
  sessionId: string
): Promise<JournalSummary> {
  const res = await fetch(`${API_BASE}/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Summarize failed: ${res.status}`);
  }
  return res.json();
}

export async function getSummaries(token: string): Promise<JournalSummary[]> {
  const res = await fetch(`${API_BASE}/summaries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch summaries");
  const data = await res.json();
  return data.summaries;
}

export async function toggleFavoriteSummary(token: string, summaryId: string, isFavorite: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/summaries/${summaryId}/favorite`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isFavorite }),
  });
  if (!res.ok) throw new Error("Failed to toggle favorite");
}

export async function lookback(
  token: string,
  query: string
): Promise<{ insight: string; relatedSummaries: JournalSummary[] }> {
  const res = await fetch(`${API_BASE}/insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Failed to get insights");
  return res.json();
}

export async function cryptoNuke(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/security/nuke`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Crypto-Nuke failed: ${res.status}`);
  }
}

export async function synthesizeTrends(token: string, summaries: { mood: string; summary: string; createdAt?: string }[]): Promise<{ advice: string; patterns?: { observation: string; confidence: string }[] }> {
  const res = await fetch(`${API_BASE}/chat/synthesis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ summaries }),
  });
  if (!res.ok) throw new Error("Failed to synthesize trends");
  return res.json();
}
