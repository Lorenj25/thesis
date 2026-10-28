import React, { useState } from 'react';
import {
  Shield,
  BookOpen,
  Terminal,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  KeyRound,
  Mail,
  UserCheck,
  FileCode,
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
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-800 bg-gradient-to-br from-stone-950 via-stone-900 to-orange-950/30 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-600/15 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>College of Computing and Information Sciences • Caraga State University</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Live AI Source Code Detection for <span className="text-orange-500 underline decoration-orange-500/40">Laboratory Exams</span>
          </h1>

          {/* Introductory Note Required by User */}
          <div className="p-5 sm:p-6 rounded-2xl bg-stone-950/80 border border-stone-800 text-stone-300 text-sm sm:text-base leading-relaxed space-y-3">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Official Introductory Note & Purpose</span>
            </div>
            <p>
              <strong>CodeAuthentic</strong> is a dedicated examination integrity platform developed for live computer laboratory sessions at Caraga State University. 
              Built on a pre-trained, frozen <strong>CodeBERT</strong> feature-extraction pipeline (770-dimensional representations), it evaluates source files written in <strong>C, Java, and Python</strong> to detect synthetic AI patterns (ChatGPT, GitHub Copilot, Claude) under timed laboratory conditions.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span><strong>Up to 3 Uploads</strong> per student in every examination lobby.</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span><strong>Multi-Language</strong> support: C (<code>.c</code>), Java (<code>.java</code>), Python (<code>.py</code>).</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span><strong>Low, Medium, High</strong> risk stratification for instructor guidance.</span>
              </div>
            </div>
          </div>

          {/* Dual Action Gateway */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {isInstructorLoggedIn ? (
              <button
                onClick={onNavigateToInstructor}
                className="px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-sm tracking-wide shadow-lg shadow-orange-600/30 flex items-center gap-2 transition-all transform active:scale-95"
              >
                <span>Open Instructor Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <a
                href="#instructor-login-section"
                className="px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-sm tracking-wide shadow-lg shadow-orange-600/30 flex items-center gap-2 transition-all transform active:scale-95"
              >
                <span>Instructor Sign In Below</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onNavigateToStudent}
              className="px-6 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-100 border border-stone-700 hover:border-orange-500/40 font-bold text-sm flex items-center gap-2 transition-all"
            >
              <Terminal className="w-4 h-4 text-orange-400" />
              <span>Student Submission Portal</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Instructor Login & Exam Workflow */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Instructor Login Form (Requires ID Number and Email) */}
        <div id="instructor-login-section" className="lg:col-span-5 scroll-mt-24">
          <div className="rounded-3xl border border-stone-800 bg-stone-900/90 dark:bg-stone-900/80 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-orange-500" />
                  <span>Instructor Login</span>
                </h2>
                <p className="text-xs text-stone-400 mt-1">
                  Required to type your Faculty ID Number and Email
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">
                Faculty Only
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {isInstructorLoggedIn ? (
              <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-100">You are currently signed in</h3>
                  <p className="text-xs text-stone-400">Ready to create and monitor exam lobbies.</p>
                </div>
                <button
                  onClick={onNavigateToInstructor}
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-sm tracking-wide shadow-md transition-all"
                >
                  Go to Live Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Instructor ID Number Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    Instructor ID Number <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="e.g. INS-2024-CCIS or 101"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Your institutional faculty identification number.
                  </p>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    Faculty Email <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. instructor@carsu.edu.ph"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>
                </div>

                {/* Full Name (Optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    Full Name <span className="text-stone-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Prof. L. Buslon"
                    className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-sm tracking-wide shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
                >
                  Sign In to Dashboard
                </button>

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-stone-800 w-full" />
                  <span className="bg-stone-900 px-3 text-[11px] text-stone-500 uppercase font-bold absolute">
                    or quick access
                  </span>
                </div>

                {/* Quick Demo Login button */}
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  className="w-full py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-orange-400 border border-orange-500/30 hover:border-orange-500/60 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>One-Click Demo Instructor Login</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Col: How CodeAuthentic Works in Examinations */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              <span>Exam System Workflow & Security Rules</span>
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs">
                  01
                </div>
                <h3 className="font-bold text-white text-sm">Instructor Creates Lobby</h3>
                <p className="text-xs text-stone-400">
                  Specifies course subject, section, time duration, and max student access limit. Generates a 6-character code and shareable link.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs">
                  02
                </div>
                <h3 className="font-bold text-white text-sm">Students Submit with ID</h3>
                <p className="text-xs text-stone-400">
                  Students enter the code and their Student ID (e.g., 221, 222, 223...). No student login required; students never see AI scores.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs">
                  03
                </div>
                <h3 className="font-bold text-white text-sm">3 Uploads Maximum</h3>
                <p className="text-xs text-stone-400">
                  Every lobby strictly restricts students to at most 3 source code files (.c, .java, .py, up to 200 KB per file).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs">
                  04
                </div>
                <h3 className="font-bold text-white text-sm">Real-Time Risk Scoring</h3>
                <p className="text-xs text-stone-400">
                  Live dashboard groups submissions into Low (&lt; 0.40), Medium (0.40–0.70), and High (&ge; 0.70) AI generation probability.
                </p>
              </div>
            </div>

            {/* Academic Ethics Box */}
            <div className="p-4 rounded-2xl bg-orange-950/20 border border-orange-600/30 text-xs text-stone-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-orange-300 block mb-0.5">Academic Integrity Standard:</strong>
                Scores are probabilities to support instructor grading and manual code review, not proof of academic dishonesty. Code is treated strictly as plain text and is never executed or compiled.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
