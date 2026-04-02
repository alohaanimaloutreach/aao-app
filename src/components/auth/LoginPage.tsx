import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PawPrint, Eye, EyeOff, ArrowRight, Mail, Check } from 'lucide-react';

const USERNAME_ALIASES: Record<string, string> = {
  furangel: 'furangelfoundation@gmail.com',
};

function resolveEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  if (USERNAME_ALIASES[trimmed]) return USERNAME_ALIASES[trimmed];
  return `${trimmed}@alohaanimaloutreach.org`;
}

export default function LoginPage() {
  const { signIn, sendMagicLink, session, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center animate-pulse">
          <PawPrint className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const email = resolveEmail(username);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
    }
    setSubmitting(false);
  }

  async function handleMagicLink() {
    if (!username.trim()) {
      setError('Enter your username or email first');
      return;
    }
    setError('');
    setSubmitting(true);

    const email = resolveEmail(username);
    const { error } = await sendMagicLink(email);
    if (error) {
      setError(error);
    } else {
      setMagicLinkSent(true);
    }
    setSubmitting(false);
  }

  if (magicLinkSent) {
    const email = resolveEmail(username);
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(110,168,50,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(232,200,74,0.05),transparent_50%)]" />
        <div className="w-full max-w-sm relative">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Aloha Animal Outreach"
              className="w-16 h-16 rounded-2xl mb-5 mx-auto shadow-[0_4px_16px_rgba(110,168,50,0.3)]"
            />
          </div>
          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(28,23,8,0.06)] p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-night">Check your email</h2>
            <p className="text-sm text-muted">
              We sent a login link to<br />
              <span className="font-medium text-night">{email}</span>
            </p>
            <p className="text-xs text-muted">
              Tap the link in the email to sign in. It expires in 1 hour.
            </p>
            <button
              onClick={() => { setMagicLinkSent(false); setError(''); }}
              className="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center px-4">
      {/* Subtle background texture */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(110,168,50,0.06),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(232,200,74,0.05),transparent_50%)]" />

      <div className="w-full max-w-sm relative">
        {/* Branding */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Aloha Animal Outreach"
            className="w-16 h-16 rounded-2xl mb-5 mx-auto shadow-[0_4px_16px_rgba(110,168,50,0.3)]"
          />
          <h1 className="text-2xl font-bold text-night font-heading tracking-tight">
            AAO Command Center
          </h1>
          <p className="text-muted text-sm mt-1.5">Aloha Animal Outreach</p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handlePasswordLogin}
          className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(28,23,8,0.06)] p-6 space-y-5"
        >
          {error && (
            <div id="login-error" className="bg-ember/8 border border-ember/15 text-ember text-sm rounded-xl p-3 flex items-start gap-2" role="alert" aria-live="assertive">
              <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-ember/15 flex items-center justify-center text-[10px] font-bold">!</span>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-night mb-1.5">
              Username or email
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username@alohaanimaloutreach.org"
              required
              autoComplete="username"
              className="w-full px-4 py-2.5 border border-night/8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 bg-sand/50 text-sm placeholder:text-muted/40 transition-all"
            />
            {username.trim() && !username.includes('@') && (
              <p className="text-xs text-muted mt-1">
                Will sign in as {resolveEmail(username)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-night mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-night/8 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 bg-sand/50 text-sm pr-11 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/50 hover:text-night transition-colors p-0.5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !password}
            aria-describedby={error ? 'login-error' : undefined}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(110,168,50,0.25)] hover:shadow-[0_4px_12px_rgba(110,168,50,0.35)] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in
              </span>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-night/8" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-muted">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={submitting}
            className="w-full bg-sand hover:bg-sand/80 text-night font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm border border-night/8"
          >
            <Mail className="w-4 h-4" />
            Send me a login link instead
          </button>
        </form>

        <p className="text-center text-xs text-muted/60 mt-6">
          Invite only — contact your admin for access
        </p>
      </div>
    </div>
  );
}
