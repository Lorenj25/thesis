import React, { useState } from 'react';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { Instructor } from '../types';
import { ApiRequestError, loginInstructor, registerInstructor } from '../utils/api';
import heroHall from '../assets/HB.png';

interface InstructorLoginProps {
  onLogin: (instructor: Instructor, token: string) => void;
}

export const InstructorLogin: React.FC<InstructorLoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await registerInstructor(name.trim(), email.trim(), password);
        setIsRegistering(false);
        setPassword('');
        setSuccess('Account created. Sign in with your email and password.');
        return;
      }
      const token = await loginInstructor(email.trim(), password);
      const cleanEmail = email.trim().toLowerCase();
      onLogin({
        idNumber: cleanEmail,
        email: cleanEmail,
        name: name.trim() || cleanEmail.split('@')[0],
      }, token);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 404) {
        setError('The account service was not found. Restart the backend and refresh this page.');
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="ca-hero ca-hero--login">
      <img src={heroHall} alt="CSU Hiraya Hall" className="ca-hero__media" />
      <div className="ca-hero__scrim" aria-hidden="true" />

      <div className="ca-hero__content flex items-center justify-center min-h-[100vh] pt-20 pb-10">
        <div className="w-full max-w-md ca-fade-up">
          <div className="ca-panel p-6 sm:p-8 space-y-6">
            <div className="border-b border-ca-border pb-4 space-y-1">
              <h1 className="text-xl font-bold font-display text-ca-ink flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-ca-brand" />
                <span>{isRegistering ? 'Create Instructor Account' : 'Instructor Sign In'}</span>
              </h1>
              <p className="text-xs text-ca-muted">
                Sign in to manage exam lobbies stored on the shared server.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-ca-danger-soft border border-ca-border text-ca-danger text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div
                className="p-3 rounded-xl bg-ca-brand/10 border border-ca-border text-ca-ink text-sm"
                role="status"
              >
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    className="ca-input"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                  Faculty Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="ca-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={isRegistering ? 6 : undefined}
                  maxLength={100}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  className="ca-input"
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="ca-btn-primary w-full">
                {isSubmitting
                  ? 'Please wait...'
                  : isRegistering
                    ? 'Create Account'
                    : 'Sign In to Dashboard'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsRegistering((registering) => !registering);
                setError(null);
                setSuccess(null);
              }}
              className="w-full text-xs font-semibold text-ca-brand hover:underline cursor-pointer"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : 'New instructor? Create an account'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
