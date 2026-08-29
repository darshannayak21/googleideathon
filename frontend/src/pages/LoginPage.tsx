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
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed";
      setError(message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-parchment px-6">
      <div className="w-full max-w-[400px] animate-fade-in-up">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-display-lg text-ink mb-2">
            Gemini Journal
          </h1>
          <p className="text-lead-airy text-ink-muted-48">
            Your private, AI-powered thinking space.
          </p>
        </div>

        {/* Card */}
        <div className="bg-canvas rounded-lg border border-hairline p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-caption-strong text-ink-muted-80 mb-1.5">
                Email
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-canvas-parchment border border-hairline rounded-sm text-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-focus/20 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-caption-strong text-ink-muted-80 mb-1.5">
                Password
              </label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-canvas-parchment border border-hairline rounded-sm text-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-focus/20 transition-all"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p className="text-caption text-danger text-center">{error}</p>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-on-primary text-body font-semibold rounded-pill cursor-pointer transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary-focus"
            >
              {loading
                ? "Please wait..."
                : isSignUp
                ? "Create Account"
                : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-divider-soft" />
            <span className="text-caption text-ink-muted-48">or</span>
            <div className="flex-1 h-px bg-divider-soft" />
          </div>

          {/* Google Sign-In */}
          <button
            id="google-signin-btn"
            onClick={handleGoogle}
            className="w-full py-3 bg-canvas border border-hairline rounded-pill text-body text-ink cursor-pointer transition-transform active:scale-95 hover:bg-canvas-parchment flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          {/* Toggle */}
          <div className="text-center mt-6">
            <button
              id="auth-toggle-btn"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-caption text-primary cursor-pointer hover:underline bg-transparent border-none"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Need an account? Create one"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-fine-print text-ink-muted-48 text-center mt-8">
          Your journal is end-to-end encrypted and stored securely with zero
          cross-user data access.
        </p>
      </div>
    </div>
  );
}
