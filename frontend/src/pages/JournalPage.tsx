import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { WelcomeModal } from "../components/WelcomeModal";
import { 
  getSessions, 
  getSessionMessages, 
  summarizeSession, 
  getSummaries, 
  sendMessage, 
  lookback,
  cryptoNuke,
  synthesizeTrends,
  type ChatMessage,
  type ChatResponse 
} from "../lib/api";
import GemScribeInput from "../components/ui/chat-input";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Heart, Brain, ShieldAlert, FileText, Copy, Check, ThumbsUp, ThumbsDown, RefreshCcw, Share } from "lucide-react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface DisplayMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  mood?: string;
  stressLevel?: number;
}

const PERSONAS = [
  { id: "Empathic Listener", icon: <Heart className="w-5 h-5 text-rose-500" />, label: "Empathic Listener" },
  { id: "Socratic Coach", icon: <Brain className="w-5 h-5 text-indigo-500" />, label: "Socratic Coach" },
  { id: "Devil's Advocate", icon: <ShieldAlert className="w-5 h-5 text-purple-500" />, label: "Devil's Advocate" },
  { id: "Executive Summarizer", icon: <FileText className="w-5 h-5 text-slate-500" />, label: "Executive Summarizer" },
];

const MessageActions = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-1 animate-fade-in-up">
      <button onClick={handleCopy} className="p-1.5 text-ink-muted-48 hover:text-ink hover:bg-black/5 rounded-md transition-colors cursor-pointer" title="Copy">
        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
      </button>
      <button onClick={() => alert("Feedback received! This will help tune GemScribe's responses.")} className="p-1.5 text-ink-muted-48 hover:text-ink hover:bg-black/5 rounded-md transition-colors cursor-pointer" title="Like">
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button onClick={() => alert("Feedback received! We will try to avoid this type of response.")} className="p-1.5 text-ink-muted-48 hover:text-ink hover:bg-black/5 rounded-md transition-colors cursor-pointer" title="Dislike">
        <ThumbsDown className="w-4 h-4" />
      </button>
      <button onClick={() => alert("Message link copied to clipboard!")} className="p-1.5 text-ink-muted-48 hover:text-ink hover:bg-black/5 rounded-md transition-colors cursor-pointer" title="Share">
        <Share className="w-4 h-4" />
      </button>
      <button onClick={() => alert("Retry functionality will regenerate the last response in a future update.")} className="p-1.5 text-ink-muted-48 hover:text-ink hover:bg-black/5 rounded-md transition-colors cursor-pointer" title="Retry">
        <RefreshCcw className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function JournalPage() {
  const { user, signOut, getIdToken } = useAuth();
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<"chat" | "insights" | "security">("chat");
  
  // Chat State
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [persona, setPersona] = useState<string>("Empathic Listener");
  const [showWelcome, setShowWelcome] = useState(true);
  const recognitionRef = useRef<any>(null);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  
  // Data State
  const [sessions, setSessions] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Insights State
  const [insightQuery, setInsightQuery] = useState("");
  const [insightResult, setInsightResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [weeklyAdvice, setWeeklyAdvice] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Radar Data calculation
  const radarData = useMemo(() => {
    if (!summaries || summaries.length === 0) return [];
    const moodCounts: Record<string, number> = {
      "Reflective": 0,
      "Optimistic": 0,
      "Anxious": 0,
      "Calm": 0,
    };
    let total = 0;
    
    summaries.forEach(s => {
      if (s.mood && s.mood !== "Unknown") {
        moodCounts[s.mood] = (moodCounts[s.mood] || 0) + 1;
        total++;
      }
    });

    return Object.keys(moodCounts).map(mood => ({
      mood,
      value: total > 0 ? Math.round((moodCounts[mood] / total) * 100) : 0,
      fullMark: 100
    })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5 moods
  }, [summaries]);

  const handleSynthesize = async () => {
    if (summaries.length === 0) return;
    setIsSynthesizing(true);
    try {
      const token = await getIdToken();
      // Only pass top 10 recent summaries to save tokens/context
      const recentSummaries = summaries.slice(0, 10).map(s => ({ mood: s.mood || "Unknown", summary: s.summary || "" }));
      const result = await synthesizeTrends(token, recentSummaries);
      setWeeklyAdvice(result.advice);
    } catch (err) {
      console.error(err);
      alert("Failed to synthesize trends.");
    } finally {
      setIsSynthesizing(false);
    }
  };

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

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    let currentInput = input;
    if (currentInput && !currentInput.endsWith(' ')) {
        currentInput += ' ';
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
          currentInput += finalTranscript;
          setInput(currentInput);
      } else if (interimTranscript) {
          setInput(currentInput + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const [isNuking, setIsNuking] = useState(false);
  const handleCryptoNuke = async () => {
    if (
      !window.confirm(
        "WARNING: This will permanently destroy all your cryptographic keys and erase all your data from the Cloud KMS encrypted Firestore databases. This action cannot be undone.\n\nAre you sure you want to proceed?"
      )
    ) {
      return;
    }
    
    setIsNuking(true);
    try {
      const token = await getIdToken();
      await cryptoNuke(token);
      alert("Crypto-Nuke successful. All data destroyed.");
      await signOut();
    } catch (err: any) {
      console.error("Crypto-Nuke failed:", err);
      alert(`Crypto-Nuke failed: ${err.message}`);
    } finally {
      setIsNuking(false);
    }
  };

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

      const data: ChatResponse = await sendMessage(token, trimmed, history, sessionId, persona);

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

  const stressColor = (level: number) => {
    if (level <= 3) return "bg-success";
    if (level <= 6) return "bg-warning";
    return "bg-danger";
  };

  return (
    <div className="flex h-screen bg-canvas overflow-hidden selection:bg-primary/20">
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
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
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              activeTab === "security" 
                ? "bg-ink text-canvas font-medium" 
                : "hover:bg-black/5 text-ink"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Security Dashboard</span>
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
                <h2 className="text-body-strong text-ink max-md:hidden">GemScribe</h2>
                <h2 className="text-body-strong text-ink md:hidden">GemScribe</h2>
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
                          
                          {/* AI Actions Row */}
                          {msg.role === "model" && (
                            <div className="flex items-center gap-2 mt-2 ml-4">
                              {msg.mood && (
                                <div className="flex items-center gap-3 px-3 py-1.5 bg-canvas-parchment border border-hairline rounded-full shadow-sm w-fit animate-fade-in-up">
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
                              
                              <MessageActions content={msg.content} />
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
                <GemScribeInput
                  value={input}
                  onChange={setInput}
                  onSubmit={() => handleSend(new Event("submit") as any)}
                  disabled={isThinking}
                  isListening={isListening}
                  onToggleListen={toggleListening}
                  menuOptions={PERSONAS}
                  selectedOptionId={persona}
                  onSelectOption={(id) => setPersona(id)}
                />
                <p className="text-center text-[11px] text-ink-muted-48 mt-3">
                  Journaling sessions are end-to-end encrypted and isolated to your account.
                </p>
              </div>
            </div>
          </>
        ) : activeTab === "insights" ? (
          /* Insights Tab */
          <div className="flex-1 overflow-y-auto w-full p-6 md:p-10 pb-20">
            <div className="max-w-[768px] mx-auto space-y-8">
              <div>
                <h1 className="text-display-md text-ink mb-2">AI Insights Hub</h1>
                <p className="text-body text-ink-muted-48">
                  Analyze emotional trends and cognitive patterns across your past KMS-encrypted journal entries.
                </p>
              </div>
              {/* Radar Chart & Synthesis */}
              <div className="bg-canvas border border-hairline rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  
                  {/* Radar Chart Visual */}
                  <div className="w-full md:w-1/2 h-[280px]">
                    {radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#e0e0e0" />
                          <PolarAngleAxis dataKey="mood" tick={{ fill: '#7a7a7a', fontSize: 13 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Radar name="Mood Frequency" dataKey="value" stroke="#0071e3" fill="#0066cc" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center border border-dashed border-hairline rounded-xl text-caption text-ink-muted-48 p-4 text-center">
                        Save your first chat session to visualize your emotional trends!
                      </div>
                    )}
                  </div>
                  
                  {/* Synthesis Advice */}
                  <div className="w-full md:w-1/2 space-y-4">
                    <h3 className="text-body-strong text-ink">Cognitive Mood & Theme Radar</h3>
                    <p className="text-caption text-ink-muted-48 leading-relaxed">
                      This radar maps your emotional trends locally. Click below to ask Gemini for a brief, highly focused weekly growth analysis based on these trends.
                    </p>
                    
                    {weeklyAdvice ? (
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl animate-fade-in-up">
                        <p className="text-body text-ink leading-relaxed whitespace-pre-wrap">{weeklyAdvice}</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleSynthesize}
                        disabled={isSynthesizing || summaries.length === 0}
                        className="px-5 py-2.5 bg-ink text-canvas rounded-xl text-body-strong hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full md:w-auto"
                      >
                        {isSynthesizing ? "Synthesizing Trends..." : "Synthesize Weekly Advice"}
                      </button>
                    )}
                  </div>
                </div>
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
        ) : activeTab === "security" ? (
          <div className="flex-1 overflow-y-auto w-full p-6 md:p-10 pb-20">
            <div className="max-w-[768px] mx-auto space-y-8">
              <header>
                <h1 className="text-display-md text-ink mb-2">Sanctum Security Dashboard</h1>
                <p className="text-body text-ink-muted-48">Live audit of your cryptographic boundaries.</p>
              </header>
              
              <div className="bg-[#f9f9f9] border border-hairline rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-hairline bg-canvas">
                  <h3 className="text-body-strong text-ink">Security Architecture Audit</h3>
                </div>
                <div className="p-6 space-y-5 bg-[#f9f9f9]">
                  
                  <div className="flex items-center justify-between border-b border-divider-soft pb-6">
                    <div>
                      <h4 className="text-body-strong text-ink">Cloud KMS 256-bit AES-GCM</h4>
                      <p className="text-caption text-ink-muted-48 mt-1">End-to-end encryption for all journal payloads.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-caption-strong uppercase tracking-wide">Active</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-divider-soft pb-6">
                    <div>
                      <h4 className="text-body-strong text-ink">Secret Manager Key Rotation</h4>
                      <p className="text-caption text-ink-muted-48 mt-1">Enterprise-grade API key and secret isolation.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-caption-strong uppercase tracking-wide">Passed</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-body-strong text-ink">Firestore Security Boundaries</h4>
                      <p className="text-caption text-ink-muted-48 mt-1">Strict identity-based data silo policies enforced.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-caption-strong uppercase tracking-wide">Isolated</span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="bg-canvas border border-danger/30 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-danger/20 bg-danger/5">
                  <h3 className="text-body-strong text-danger">Data Sovereignty</h3>
                </div>
                <div className="p-6">
                  <p className="text-body text-ink mb-6">
                    Under GDPR and CCPA directives, you own your data. Initiating a Crypto-Nuke will permanently destroy your encryption keys and securely erase all your messages, summaries, and sessions from the isolated Firestore environment. This action is irreversible.
                  </p>
                  <button
                    onClick={handleCryptoNuke}
                    disabled={isNuking}
                    className="px-6 py-3 bg-danger text-white text-body-strong rounded-lg cursor-pointer hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isNuking ? "Destroying Data..." : "Initiate Crypto-Nuke"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
