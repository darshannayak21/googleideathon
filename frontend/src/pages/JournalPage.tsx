import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { 
  sendMessage, 
  getSessions, 
  getSessionMessages, 
  summarizeSession, 
  getSummaries, 
  lookback,
  type ChatMessage, 
  type ChatResponse 
} from "../lib/api";

interface DisplayMessage {
  id: string;
  role: "user" | "model";
  content: string;
  mood?: string;
  stressLevel?: number;
  timestamp: Date;
}

export default function JournalPage() {
  const { user, signOut, getIdToken } = useAuth();
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<"chat" | "insights">("chat");
  
  // Chat State
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  
  // Data State
  const [sessions, setSessions] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Insights State
  const [insightQuery, setInsightQuery] = useState("");
  const [insightResult, setInsightResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [messages, isThinking, activeTab, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Load Sessions and Summaries from Backend
  const loadSessionsAndSummaries = useCallback(async () => {
    try {
      const token = await getIdToken();
      const [sessionsData, summariesData] = await Promise.all([
        getSessions(token),
        getSummaries(token),
      ]);
      setSessions(sessionsData);
      setSummaries(summariesData);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (user) {
      loadSessionsAndSummaries();
    }
  }, [user, loadSessionsAndSummaries]);

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
  };

  const handleSelectSession = async (sid: string) => {
    setSessionId(sid);
    setIsThinking(true);
    setActiveTab("chat");
    try {
      const token = await getIdToken();
      const msgs = await getSessionMessages(token, sid);
      setMessages(msgs.map(m => ({
        id: crypto.randomUUID(),
        role: m.role,
        content: m.content,
        timestamp: new Date()
      })));
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSummarize = async () => {
    if (messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const token = await getIdToken();
      await summarizeSession(token, sessionId);
      alert("Session summarized and securely encrypted in KMS database!");
      loadSessionsAndSummaries();
    } catch (err: any) {
      console.error("Summarization failed:", err);
      alert(`Summarization error: ${err.message || err}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGetInsight = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = insightQuery.trim();
    if (!trimmed || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const token = await getIdToken();
      const res = await lookback(token, trimmed);
      setInsightResult(res);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
      alert("Failed to analyze patterns");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    if (trimmed.length > 5000) return;

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const token = await getIdToken();
      const history: ChatMessage[] = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data: ChatResponse = await sendMessage(token, trimmed, history, sessionId);

      const aiMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "model",
        content: data.reply,
        mood: data.mood,
        stressLevel: data.stress_level,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      
      // Auto-update sessions list to show newly created session if needed
      loadSessionsAndSummaries();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          content: `I'm having trouble connecting right now. Error details: ${String(err)}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stressColor = (level: number) => {
    if (level <= 3) return "bg-success";
    if (level <= 6) return "bg-warning";
    return "bg-danger";
  };

  return (
    <div className="flex h-screen bg-canvas overflow-hidden selection:bg-primary/20">
      {/* Sidebar - ChatGPT/Claude style */}
      <aside className="w-[280px] bg-[#f9f9f9] border-r border-hairline flex flex-col shrink-0 max-md:hidden">
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-between px-4 py-3 bg-canvas border border-hairline rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer text-body-strong text-ink group"
          >
            <span>New Chat</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted-48 group-hover:text-primary transition-colors">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Sidebar History (Loaded dynamically) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
           <div className="text-fine-print font-medium text-ink-muted-48 px-2 mb-2 uppercase tracking-wider">Your Journal Sessions</div>
           {sessions.map((s) => (
             <button 
               key={s.id} 
               onClick={() => handleSelectSession(s.id)}
               className={`w-full text-left px-3 py-2.5 rounded-lg text-body truncate cursor-pointer transition-colors ${
                 sessionId === s.id && activeTab === "chat"
                   ? "bg-primary/10 text-primary font-medium" 
                   : "hover:bg-black/5 text-ink"
               }`}
             >
               <div className="font-medium truncate">{s.title || "Untitled Session"}</div>
               <div className="text-fine-print text-ink-muted-48 mt-0.5">{s.messageCount} messages</div>
             </button>
           ))}
           {sessions.length === 0 && (
             <div className="px-3 py-2 text-caption text-ink-muted-48">No conversations yet.</div>
           )}
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 py-3 border-t border-hairline bg-[#f9f9f9] space-y-1.5">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              activeTab === "chat" 
                ? "bg-ink text-canvas font-medium" 
                : "hover:bg-black/5 text-ink"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Journal Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              activeTab === "insights" 
                ? "bg-ink text-canvas font-medium" 
                : "hover:bg-black/5 text-ink"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
            <span>AI Insights Hub</span>
          </button>
        </div>

        {/* User Profile / Sign Out */}
        <div className="p-4 border-t border-hairline bg-[#f9f9f9]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden">
              <span className="text-body-strong text-ink truncate">{user?.email}</span>
              <span className="text-caption text-ink-muted-48">Free Plan</span>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-ink-muted-48 hover:text-danger hover:bg-danger/10 rounded-md transition-colors cursor-pointer"
              title="Sign Out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-canvas">
        {activeTab === "chat" ? (
          <>
            {/* Chat Header */}
            <header className="flex items-center justify-between p-4 border-b border-hairline bg-canvas/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-body-strong text-ink max-md:hidden">Empathy Journal Chat</h2>
                <h2 className="text-body-strong text-ink md:hidden">Gemini Journal</h2>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="px-3.5 py-1.5 bg-primary text-canvas rounded-lg text-caption-strong cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSummarizing ? "Saving..." : "Save & Summarize"}
                  </button>
                )}
                <button onClick={handleNewChat} className="text-primary p-2 md:hidden">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto w-full">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center px-6 pb-20 animate-fade-in-up">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 shadow-sm">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h1 className="text-display-md text-ink text-center mb-4">How can I help you today?</h1>
                  <p className="text-body text-ink-muted-48 text-center max-w-[400px]">
                    Brainstorm ideas, reflect on your thoughts, or dive deep into a problem.
                  </p>
                </div>
              ) : (
                <div className="w-full pb-32 pt-8">
                  {messages.map((msg) => (
                    <div key={msg.id} className="w-full px-4 mb-6">
                      <div className={`max-w-[768px] mx-auto flex gap-5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        
                        {/* Avatar */}
                        <div className="shrink-0">
                          {msg.role === "user" ? (
                            <div className="w-8 h-8 rounded-full bg-ink text-canvas flex items-center justify-center text-caption-strong">
                              {user?.email?.charAt(0).toUpperCase() || "U"}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary text-canvas flex items-center justify-center shadow-sm">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"/></svg>
                            </div>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div className={`flex flex-col min-w-0 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div className={`px-5 py-3.5 rounded-2xl ${
                            msg.role === "user" 
                              ? "bg-[#f4f4f4] text-ink" 
                              : "bg-transparent text-ink"
                          }`}>
                            <div className="text-body whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                          </div>
                          
                          {/* AI Metadata (Mood/Stress) */}
                          {msg.role === "model" && msg.mood && (
                            <div className="flex items-center gap-3 mt-2 ml-5 px-3 py-1.5 bg-canvas-parchment border border-hairline rounded-full shadow-sm w-fit animate-fade-in-up">
                              <span className="text-fine-print text-ink-muted-48 flex items-center gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
                                <span className="text-caption-strong text-ink">{msg.mood}</span>
                              </span>
                              {msg.stressLevel !== undefined && (
                                <span className="text-fine-print text-ink-muted-48 flex items-center gap-1.5 before:content-[''] before:w-px before:h-3 before:bg-divider-soft">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${stressColor(msg.stressLevel)}`} />
                                  Stress: <span className="text-caption-strong text-ink">{msg.stressLevel}/10</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Thinking Indicator */}
                  {isThinking && (
                    <div className="w-full px-4 mb-6">
                      <div className="max-w-[768px] mx-auto flex gap-5">
                        <div className="w-8 h-8 rounded-full bg-primary text-canvas flex items-center justify-center shrink-0 shadow-sm">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/></svg>
                        </div>
                        <div className="px-5 py-3.5 mt-1">
                          <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-ink-muted-48" style={{ animation: "pulse-dot 1.4s infinite ease-in-out -0.32s" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-ink-muted-48" style={{ animation: "pulse-dot 1.4s infinite ease-in-out -0.16s" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-ink-muted-48" style={{ animation: "pulse-dot 1.4s infinite ease-in-out 0s" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </div>

            {/* Floating Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-canvas via-canvas to-transparent pt-10 pb-6 px-4">
              <div className="max-w-[768px] mx-auto relative">
                <form
                  onSubmit={handleSend}
                  className="relative flex items-end shadow-sm bg-canvas border border-hairline rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isThinking}
                    rows={1}
                    maxLength={5000}
                    className="flex-1 max-h-[200px] resize-none px-4 py-3.5 bg-transparent text-body text-ink placeholder:text-ink-muted-48 focus:outline-none disabled:opacity-50"
                    placeholder="Message Gemini Journal..."
                    style={{ scrollbarWidth: "thin" }}
                  />
                  <div className="px-3 pb-2.5">
                    <button
                      type="submit"
                      disabled={!input.trim() || isThinking}
                      className="shrink-0 w-8 h-8 flex items-center justify-center bg-ink text-canvas rounded-full cursor-pointer transition-all active:scale-95 disabled:bg-[#e5e5e5] disabled:text-[#a3a3a3] disabled:cursor-not-allowed hover:opacity-90"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </button>
                  </div>
                </form>
                <p className="text-center text-[11px] text-ink-muted-48 mt-3">
                  Journaling sessions are end-to-end encrypted and isolated to your account.
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Insights Tab */
          <div className="flex-1 overflow-y-auto w-full p-6 md:p-10 pb-20">
            <div className="max-w-[768px] mx-auto space-y-8">
              <div>
                <h1 className="text-display-md text-ink mb-2">AI Insights Hub</h1>
                <p className="text-body text-ink-muted-48">
                  Analyze emotional trends and cognitive patterns across your past KMS-encrypted journal entries.
                </p>
              </div>

              {/* Insight Query Form */}
              <div className="bg-[#f9f9f9] border border-hairline rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-body-strong text-ink">Ask Gemini for cognitive patterns</h3>
                <form onSubmit={handleGetInsight} className="flex gap-2">
                  <input
                    type="text"
                    value={insightQuery}
                    onChange={(e) => setInsightQuery(e.target.value)}
                    placeholder="e.g., Why have I been feeling stressed lately? or What are my main themes?"
                    className="flex-1 px-4 py-2.5 bg-canvas border border-hairline rounded-xl text-body text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={isAnalyzing || !insightQuery.trim()}
                    className="px-5 py-2.5 bg-ink text-canvas rounded-xl text-caption-strong hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {isAnalyzing ? "Analyzing..." : "Analyze"}
                  </button>
                </form>
              </div>

              {/* Insight Results */}
              {insightResult && (
                <div className="bg-canvas-parchment border border-hairline rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in-up">
                  <h3 className="text-body-strong text-primary flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-3.464a5 5 0 011.002-1.002"/></svg>
                    Cognitive Synthesis
                  </h3>
                  <p className="text-body text-ink leading-relaxed whitespace-pre-wrap">{insightResult.insight}</p>

                  {insightResult.relatedSummaries?.length > 0 && (
                    <div className="pt-4 border-t border-hairline space-y-3">
                      <h4 className="text-caption-strong text-ink-muted-48">Based on these decrypted summaries:</h4>
                      <div className="grid gap-3">
                        {insightResult.relatedSummaries.map((s: any) => (
                          <div key={s.id} className="bg-canvas border border-hairline rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-caption-strong text-ink">{s.mood}</span>
                              <div className="flex gap-1.5">
                                {s.tags?.map((t: string) => (
                                  <span key={t} className="text-fine-print bg-black/5 px-2 py-0.5 rounded-full text-ink-muted-48">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="text-body text-ink-muted-48">{s.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Past Summaries Feed */}
              <div className="space-y-4">
                <h3 className="text-body-strong text-ink">Securely Encrypted Summaries ({summaries.length})</h3>
                <div className="grid gap-4">
                  {summaries.map((s) => (
                    <div key={s.id} className="bg-canvas border border-hairline rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary/80" />
                          <span className="text-body-strong text-ink">{s.mood || "Neutral"}</span>
                        </div>
                        <span className="text-fine-print text-ink-muted-48">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-body text-ink-muted-48">{s.summary}</p>
                      {s.tags?.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {s.tags.map((t: string) => (
                            <span key={t} className="text-fine-print bg-black/5 px-2.5 py-0.5 rounded-full text-ink-muted-48">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {summaries.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-hairline rounded-xl text-caption text-ink-muted-48">
                      No summaries archived yet. Try saving a chat conversation first!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
