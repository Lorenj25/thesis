import React from 'react';
import { Terminal, AlertTriangle, ArrowRight, Layers } from 'lucide-react';

interface HomeIntroProps {
  onNavigateToStudent: () => void;
  onNavigateToInstructor: () => void;
  isInstructorLoggedIn: boolean;
}

export const HomeIntro: React.FC<HomeIntroProps> = ({
  onNavigateToStudent,
  onNavigateToInstructor,
  isInstructorLoggedIn,
}) => {
  return (
    <div className="space-y-14 py-6 sm:py-10 ca-fade-up">
      <section className="relative max-w-4xl space-y-6 pt-4 sm:pt-8 pb-2">
        <p className="text-xs sm:text-sm font-semibold text-ca-brand tracking-wide">
          College of Computing and Information Sciences • Caraga State University
        </p>

        <h1 className="font-display text-3xl sm:text-5xl font-bold text-ca-ink leading-[1.15]">
          Live AI Source Code Detection for{' '}
          <span className="text-ca-brand">Laboratory Exams</span>
        </h1>

        <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-ca-muted">
          CodeAuthentic supports exam integrity by helping instructors identify potentially
          AI-generated C, Java, and Python submissions in timed laboratory exams.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button onClick={onNavigateToInstructor} className="ca-btn-primary">
            <span>{isInstructorLoggedIn ? 'Open Instructor Dashboard' : 'Instructor Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button onClick={onNavigateToStudent} className="ca-btn-secondary">
            <Terminal className="w-4 h-4 text-ca-brand" />
            <span>Student Submission Portal</span>
          </button>
        </div>
      </section>

      <section className="ca-panel p-6 sm:p-8 space-y-6 max-w-5xl">
        <h2 className="text-xl font-bold font-display text-ca-ink flex items-center gap-2">
          <Layers className="w-5 h-5 text-ca-brand" />
          <span>How it works</span>
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
              body: 'Students enter the code and their Student ID. No student login required; students never see AI scores.',
            },
            {
              step: '03',
              title: '3 Uploads Maximum',
              body: 'Every lobby restricts students to at most 3 source code files (.c, .java, .py, up to 200 KB per file).',
            },
            {
              step: '04',
              title: 'Real-Time Risk Scoring',
              body: 'Live dashboard groups submissions into Low (< 0.40), Medium (0.40–0.70), and High (≥ 0.70) AI probability.',
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
            Scores are probabilities to support instructor grading and manual code review, not
            proof of academic dishonesty. Code is treated strictly as plain text and is never
            executed or compiled.
          </div>
        </div>
      </section>
    </div>
  );
};
