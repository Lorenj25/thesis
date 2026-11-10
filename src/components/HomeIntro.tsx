import React, { useState } from 'react';
import {
  Terminal,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  KeyRound,
  UserCheck,
  Layers,
} from 'lucide-react';
import { Instructor } from '../types';
import { DEFAULT_INSTRUCTOR } from '../utils/storage';

interface HomeIntroProps {
  onLogin: (instructor: Instructor) => void;
  onNavigateToStudent: () => void;
  onNavigateToInstructor: () => void;
  isInstructorLoggedIn: boolean;
}

export const HomeIntro: React.FC<HomeIntroProps> = ({
  onLogin,
  onNavigateToStudent,
  onNavigateToInstructor,
  isInstructorLoggedIn,
}) => {
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

    const instructor: Instructor = {
      idNumber: idNumber.trim(),
      email: email.trim().toLowerCase(),
      name: name.trim() || `Instructor ${idNumber.trim()}`,
    };

    setError(null);
    onLogin(instructor);
  };

  const handleQuickDemoLogin = () => {
    onLogin(DEFAULT_INSTRUCTOR);
  };

  return (
    <div className="space-y-12 py-4 ca-fade-up">
      <section className="ca-panel relative overflow-hidden p-8 sm:p-12">
        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ca-brand-soft border border-ca-border text-ca-brand text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>College of Computing and Information Sciences • Caraga State University</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-ca-ink tracking-tight leading-tight">
            Live AI Source Code Detection for{' '}
            <span className="text-ca-brand">Laboratory Exams</span>
          </h1>

          <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-ca-muted">
            CodeAuthentic supports exam integrity by helping instructors identify potentially AI-generated C, Java, and Python submissions in timed laboratory exams.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isInstructorLoggedIn ? (
              <button onClick={onNavigateToInstructor} className="ca-btn-primary">
                <span>Open Instructor Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <a href="#instructor-login-section" className="ca-btn-primary">
                <span>Instructor Sign In Below</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}

            <button onClick={onNavigateToStudent} className="ca-btn-secondary">
              <Terminal className="w-4 h-4 text-ca-brand" />
              <span>Student Submission Portal</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div id="instructor-login-section" className="lg:col-span-5 scroll-mt-24">
          <div className="ca-panel p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-ca-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold font-display text-ca-ink flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-ca-brand" />
                  <span>Instructor Login</span>
                </h2>
                <p className="text-xs text-ca-muted mt-1">
                  Enter your Faculty ID Number and Email
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-1 rounded bg-ca-brand-soft text-ca-brand border border-ca-border font-bold">
                Faculty Only
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-ca-danger-soft border border-ca-border text-ca-danger text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {isInstructorLoggedIn ? (
              <div className="p-5 rounded-2xl bg-ca-brand-soft border border-ca-border text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-ca-brand-soft text-ca-brand flex items-center justify-center mx-auto">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-ca-ink">You are currently signed in</h3>
                  <p className="text-xs text-ca-muted">Ready to create and monitor exam lobbies.</p>
                </div>
                <button onClick={onNavigateToInstructor} className="ca-btn-primary w-full">
                  Go to Live Dashboard
                </button>
              </div>
            ) : (
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
                  <p className="text-[11px] text-ca-faint mt-1">
                    Your institutional faculty identification number.
                  </p>
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

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-ca-border w-full" />
                  <span className="bg-ca-surface px-3 text-[11px] text-ca-faint uppercase font-bold absolute">
                    or quick access
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="ca-btn-secondary w-full text-xs text-ca-brand"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>One-Click Demo Instructor Login</span>
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="ca-panel p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-extrabold font-display text-ca-ink flex items-center gap-2">
              <Layers className="w-5 h-5 text-ca-brand" />
              <span>Exam System Workflow & Security Rules</span>
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  step: '01',
                  title: 'Instructor Creates Lobby',
                  body: 'Specifies course subject, section, time duration, and max student access limit. Generates a 6-character code and shareable link.',
                },
                {
                  step: '02',
                  title: 'Students Submit with ID',
                  body: 'Students enter the code and their Student ID (e.g., 221, 222, 223...). No student login required; students never see AI scores.',
                },
                {
                  step: '03',
                  title: '3 Uploads Maximum',
                  body: 'Every lobby strictly restricts students to at most 3 source code files (.c, .java, .py, up to 200 KB per file).',
                },
                {
                  step: '04',
                  title: 'Real-Time Risk Scoring',
                  body: 'Live dashboard groups submissions into Low (< 0.40), Medium (0.40–0.70), and High (≥ 0.70) AI generation probability.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-4 rounded-2xl bg-ca-bg-elevated border border-ca-border space-y-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-ca-brand-soft text-ca-brand font-bold flex items-center justify-center text-xs">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-ca-ink text-sm">{item.title}</h3>
                  <p className="text-xs text-ca-muted">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-ca-brand-soft border border-ca-border text-xs text-ca-muted flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-ca-brand shrink-0 mt-0.5" />
              <div>
                <strong className="text-ca-brand block mb-0.5">Academic Integrity Standard:</strong>
                Scores are probabilities to support instructor grading and manual code review, not proof of academic dishonesty. Code is treated strictly as plain text and is never executed or compiled.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
