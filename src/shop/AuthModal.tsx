import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, X } from 'lucide-react';
import { C, F } from '../components/brand';

/* lucide dropped brand icons, so the two provider marks are inline. Both are
   used as the providers' own sign-in guidelines require. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H1.05v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H1.05a9 9 0 0 0 0 8.12l2.92-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 1.05 4.94l2.92 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.78c.02 2.53 2.22 3.37 2.25 3.38-.02.06-.35 1.2-1.16 2.38-.7 1.02-1.43 2.03-2.58 2.05-1.13.02-1.49-.67-2.78-.67-1.29 0-1.69.65-2.76.69-1.11.04-1.95-1.1-2.66-2.11-1.5-2.17-2.65-6.14-1.1-8.82.76-1.33 2.13-2.17 3.61-2.19 1.09-.02 2.12.73 2.78.73.67 0 1.92-.9 3.24-.77.55.02 2.1.2 3.09 1.51-.08.05-1.85 1.08-1.93 3.82M14.3 3.9c.6-.72 1-1.72.89-2.72-.86.03-1.9.57-2.52 1.29-.55.63-1.03 1.65-.9 2.62.96.07 1.94-.49 2.53-1.19" />
    </svg>
  );
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Sign in, on the auth-2 frame: a picture panel beside the form, the form
 * column carrying email, password with a reveal toggle, and the alternate
 * actions beneath. Delivered as a modal so signing in never loses the page
 * you were on.
 *
 * No auth backend exists yet, so submit is a no-op that closes the panel —
 * the fields and validation are real, the credential check is not.
 */
export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
              <h3 className="auth__title">{mode === 'in' ? 'Welcome back' : 'Join the box'}</h3>
              <p className="auth__sub">
                {mode === 'in'
                  ? 'Sign in to reorder your favourites and track custom orders.'
                  : 'Create an account to save your builds and speed through checkout.'}
              </p>

              <div className="auth__providers">
                <button type="button" className="auth__provider auth__provider--google" onClick={onClose}>
                  <GoogleMark />
                  Continue with Google
                </button>
                <button type="button" className="auth__provider auth__provider--apple" onClick={onClose}>
                  <AppleMark />
                  Continue with Apple
                </button>
              </div>

              <div className="auth__divider">
                <span>or with email</span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onClose();
                }}
              >
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

                <label className="auth__label" htmlFor="auth-password">
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
                </div>

                {mode === 'in' && (
                  <button type="button" className="auth__forgot">
                    Forgot your password?
                  </button>
                )}

                <button type="submit" className="auth__submit brand-press">
                  {mode === 'in' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className="auth__swap">
                {mode === 'in' ? "Don't have an account?" : 'Already have one?'}{' '}
                <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
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
