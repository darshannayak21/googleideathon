import { MessageCircle, Shield, Brain } from "lucide-react";

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <div className="w-[90vw] md:w-[500px] shrink-0 rounded-[32px] bg-canvas border border-hairline p-10 shadow-2xl animate-fade-in-up">
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
        <div className="mb-10 space-y-8">
          
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
                Visualize your emotional trends with the Cognitive Mood Radar and get weekly synthesis advice.
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
                Cloud KMS AES-256 encryption. Verify your isolated status live or invoke the Crypto-Nuke.
              </p>
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
