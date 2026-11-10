import React, { useState } from 'react';
import { AlertTriangle, KeyRound, Sparkles } from 'lucide-react';
import { Instructor } from '../types';
import { DEFAULT_INSTRUCTOR } from '../utils/storage';
import heroHall from '../assets/HB.png';

interface InstructorLoginProps {
  onLogin: (instructor: Instructor) => void;
}

export const InstructorLogin: React.FC<InstructorLoginProps> = ({ onLogin }) => {
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) {
      setError('Please enter your Instructor ID Number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid institutional email address.');
      return;
    }

    onLogin({
      idNumber: idNumber.trim(),
      email: email.trim().toLowerCase(),
      name: name.trim() || `Instructor ${idNumber.trim()}`,
    });
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
                <span>Instructor Sign In</span>
              </h1>
              <p className="text-xs text-ca-muted">
                Faculty access for creating lobbies and reviewing AI risk scores.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-ca-danger-soft border border-ca-border text-ca-danger text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                  Instructor ID Number <span className="text-ca-brand">*</span>
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. INS-2024-CCIS or 101"
                  required
                  className="ca-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                  Faculty Email <span className="text-ca-brand">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. instructor@carsu.edu.ph"
                  required
                  className="ca-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                  Full Name <span className="text-ca-faint font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Prof. L. Buslon"
                  className="ca-input"
                />
              </div>

              <button type="submit" className="ca-btn-primary w-full">
                Sign In to Dashboard
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-ca-border w-full" />
                <span className="bg-ca-surface px-3 text-[11px] text-ca-faint uppercase font-bold absolute">
                  or quick access
                </span>
              </div>

              <button
                type="button"
                onClick={() => onLogin(DEFAULT_INSTRUCTOR)}
                className="ca-btn-secondary w-full text-xs text-ca-brand"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>One-Click Demo Instructor Login</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
