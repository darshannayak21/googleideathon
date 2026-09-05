import { MessageCircle, Shield, Brain } from "lucide-react";

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <div className="w-[90vw] md:w-[650px] shrink-0 rounded-[32px] bg-canvas border border-hairline p-8 md:p-10 shadow-2xl animate-fade-in-up max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-display-md text-ink mb-2">
            Welcome to<br />GemScribe
          </h1>
          <p className="text-body text-ink-muted-48">
            Your private, AI-powered journaling space.
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas-parchment text-ink shadow-sm">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="pt-0.5">
              <h3 className="mb-1 text-body-strong text-ink">
                Socratic Persona Switcher
              </h3>
              <p className="text-caption text-ink-muted-80 leading-relaxed">
                Toggle between Empathic Listener, Socratic Coach, Devil's Advocate, or Executive Summarizer instantly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas-parchment text-ink shadow-sm">
              <Brain className="h-6 w-6" />
            </div>
            <div className="pt-0.5">
              <h3 className="mb-1 text-body-strong text-ink">
                AI Insights Hub
              </h3>
              <p className="text-caption text-ink-muted-80 leading-relaxed">
                Visualize emotional trends via the Cognitive Mood Radar, get weekly advice, and search by specific calendar dates.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas-parchment text-ink shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
            <div className="pt-0.5">
              <h3 className="mb-1 text-body-strong text-ink">
                Military-Grade Security
              </h3>
              <p className="text-caption text-ink-muted-80 leading-relaxed">
                Cloud KMS AES-256 encryption. Verify your isolated status live or invoke the Crypto-Nuke to erase everything.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas-parchment text-ink shadow-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </div>
            <div className="pt-0.5">
              <h3 className="mb-1 text-body-strong text-ink">
                Purpose Journal
              </h3>
              <div className="text-fine-print text-ink-muted-80 space-y-1 mt-1">
                <p>• <b>Timers:</b> Set/manage native reminders in the Hub.</p>
                <p>• <b>Auto-Summaries:</b> Chats summarized & tagged securely.</p>
                <p>• <b>Dynamic Radar:</b> View emotional shifts per session.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-6 border-t border-hairline">
          <button 
            onClick={onClose}
            className="w-full rounded-pill bg-ink px-8 py-3.5 text-body-strong text-canvas transition-transform active:scale-[0.98] cursor-pointer hover:bg-ink-muted-80"
          >
            Start journaling
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 text-body-strong text-primary transition-colors hover:bg-canvas-parchment rounded-pill cursor-pointer"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
