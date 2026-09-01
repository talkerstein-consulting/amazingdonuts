import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, X } from 'lucide-react';
import { formatNorthAmericanPhone } from '../lib/phone';
import { C, F } from '../components/brand';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Sign in, on the auth-2 frame: a picture panel beside the form, the form
 * column carrying email, password with a reveal toggle, and the alternate
 * actions beneath. Delivered as a modal so signing in never loses the page
 * you were on.
 *
 * Both modes use the storefront session API; checkout never treats a closed
 * modal as authentication.
 */
export default function AuthModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: () => void }) {
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/house/auth/google/config').then(response => response.ok ? response.json() : null).then(body => setGoogleEnabled(Boolean(body?.enabled))).catch(() => setGoogleEnabled(false));
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="auth-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="auth"
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'in' ? 'Sign in' : 'Create an account'}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.34, ease: EASE }}
          >
            <button type="button" className="auth__close icon-btn" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>

            {/* picture panel — desktop only, as the frame has it */}
            <div className="auth__art">
              <div className="auth__artImg" />
              {/* Both sit at the top: the photo is square, so in this tall panel
                  `cover` shows its full height and the donut stack lands in the
                  lower half. Text at the bottom would have sat right on it. */}
              <div className="auth__artInner">
                <img src="/img/logo-amazing-donuts.svg" alt="Amazing Donuts" className="auth__artLogo" />
                <h2 className="auth__artHeading">
                  Fresh since '97.
                  <br />
                  Sign in for the good stuff.
                </h2>
              </div>
            </div>

            {/* form column */}
            <div className="auth__form">
              <h3 className="auth__title">{mode === 'in' ? 'Welcome back' : mode === 'forgot' ? 'Reset password' : 'Join the box'}</h3>
              <p className="auth__sub">
                {mode === 'in'
                  ? 'Sign in to reorder your favourites and track custom orders.'
                  : mode === 'forgot' ? 'Enter your email and we will send a secure reset link.' : 'Create an account to save your builds and speed through checkout.'}
              </p>

              {googleEnabled && mode !== 'forgot' && <>
                <div className="auth__providers">
                  <button type="button" className="auth__provider auth__provider--google" onClick={() => { const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`; window.location.assign(`/api/house/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09A6.8 6.8 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A10.9 10.9 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>
                </div>
                <div className="auth__divider">or continue with email</div>
              </>}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true); setError('');
                  try {
                    const response = await fetch(mode === 'in' ? '/api/house/auth/login' : mode === 'forgot' ? '/api/house/auth/forgot-password' : '/api/house/storefront/register', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(mode === 'in' ? { email, password, tenant: 'amazing-donuts' } : mode === 'forgot' ? { email, tenantSlug: 'amazing-donuts' } : { email, password, firstName, lastName, phone, tenantSlug: 'amazing-donuts' })
                    });
                    const rawBody = await response.text();
                    let body: any = null;
                    try { body = rawBody ? JSON.parse(rawBody) : null; } catch { /* Vercel can return plain text for platform-level failures. */ }
                    if (!response.ok) {
                      const fallback = mode === 'in'
                        ? 'Sign in is temporarily unavailable. Please try again.'
                        : 'Account creation is temporarily unavailable. Please try again.';
                      throw new Error(body?.error?.message || fallback);
                    }
                    if(mode === 'forgot'){setError(body?.message||'If an account exists for that email, a reset link has been sent.');return;}
                    if (!body?.user) throw new Error('The account service returned an invalid response. Please try again.');
                    window.dispatchEvent(new CustomEvent('amazing:auth-changed', { detail: body.user }));
                    onSuccess?.(); onClose();
                  } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not sign you in.'); }
                  finally { setBusy(false); }
                }}
              >
                {mode === 'up' && <div className="auth__nameRow"><label><span className="auth__label">First name</span><input className="auth__input" required autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)}/></label><label><span className="auth__label">Last name</span><input className="auth__input" required autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)}/></label></div>}
                <label className="auth__label" htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  className="auth__input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {mode !== 'forgot' && <><label className="auth__label" htmlFor="auth-password">
                  Password
                </label>
                <div className="auth__pw">
                  <input
                    id="auth-password"
                    className="auth__input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth__reveal"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div></>}
                {mode === 'up' && <><label className="auth__label" htmlFor="auth-phone">Phone</label><input id="auth-phone" className="auth__input" type="tel" required autoComplete="tel" value={phone} onChange={e=>setPhone(formatNorthAmericanPhone(e.target.value))}/></>}
                {error && <p className="auth__error" role="alert">{error}</p>}

                <button type="submit" className="auth__submit brand-press" disabled={busy}>
                  {busy ? 'Please wait...' : mode === 'in' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create account'}
                </button>
              </form>

              {mode === 'in' && <p className="auth__swap"><button type="button" onClick={()=>{setMode('forgot');setError('');}}>Forgot password?</button></p>}

              <p className="auth__swap">
                {mode === 'in' ? "Don't have an account?" : mode === 'forgot' ? 'Remembered your password?' : 'Already have one?'}{' '}
                <button type="button" onClick={() => {setMode(mode === 'in' ? 'up' : 'in');setError('');}}>
                  {mode === 'in' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
