import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      console.error("Full Auth Error:", err);
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error("Full Google Auth Error:", err);
      const message =
        err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f9f9f9] p-6 selection:bg-primary/20">
      
      {/* Centered Box Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[32px] bg-canvas border border-hairline shadow-sm px-8 py-10 sm:px-10 sm:py-10 flex flex-col items-center animate-fade-in-up">
        
        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-display-md text-ink font-semibold tracking-tight mb-2">
            GemScribe
          </h2>
          <p className="text-caption text-ink-muted-80">
            {isSignUp ? "Create an account to begin." : "Sign in to your private journal."}
          </p>
        </div>

        {error && (
          <div className="w-full mb-6 p-4 rounded-[14px] bg-danger/10 border border-danger/20 text-danger text-caption text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col w-full gap-4">
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-3.5 bg-canvas-parchment border border-hairline rounded-xl text-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Email address"
            />

            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-5 py-3.5 bg-canvas-parchment border border-hairline rounded-xl text-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Password"
            />

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-full bg-primary text-canvas text-body-strong transition-transform active:scale-[0.98] cursor-pointer hover:bg-primary-focus disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading
                ? "Please wait..."
                : isSignUp
                ? "Continue"
                : "Sign In"}
            </button>
          </form>

          <div className="flex items-center justify-center gap-4 my-2 opacity-60">
            <div className="flex-1 h-px bg-hairline" />
            <span className="text-caption text-ink-muted-48 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-hairline" />
          </div>

          <button
            id="google-signin-btn"
            onClick={handleGoogle}
            className="w-full py-3.5 rounded-full bg-canvas border border-hairline text-ink text-body-strong transition-colors hover:bg-canvas-parchment flex items-center justify-center gap-3 cursor-pointer shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <div className="w-full text-center mt-4">
            <span className="text-caption text-ink-muted-80">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-primary font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
              >
                {isSignUp ? "Sign in" : "Sign up, it's free!"}
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* User count and avatars (Social Proof) */}
      <div className="relative z-10 mt-8 flex flex-col items-center text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <p className="text-body text-ink-muted-48 mb-4">
          Join <span className="font-semibold text-ink">thousands</span> of
          professionals who are already using GemScribe.
        </p>
        <div className="flex -space-x-3">
          <img
            src="https://cdn.21st.dev/assets/mirror/a6/a634d4f02fe5b77804943c1d74b8d70e35ffe26454e0e9af9717432a2c72bfde.jpg"
            alt="user"
            className="w-10 h-10 rounded-full border-2 border-canvas object-cover shadow-sm"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/d8/d8dab29a5736d5c2b0084d720d3db02c785560071609be501541922928fdf831.jpg"
            alt="user"
            className="w-10 h-10 rounded-full border-2 border-canvas object-cover shadow-sm"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/d1/d1a3e08d4e37d6ee2b7de1db8df87c1dc7acd8ffb004caaf980917de518a60c9.jpg"
            alt="user"
            className="w-10 h-10 rounded-full border-2 border-canvas object-cover shadow-sm"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/f0/f07b84f12ef125cbb837a7bd64da401992f5f62bd55fee10d01cd3dcc8abae80.jpg"
            alt="user"
            className="w-10 h-10 rounded-full border-2 border-canvas object-cover shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}
