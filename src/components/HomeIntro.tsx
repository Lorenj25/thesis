import React from 'react';
import { Terminal, AlertTriangle, ArrowRight, Layers } from 'lucide-react';
import heroHall from '../assets/HB.png';

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
    <div className="ca-fade-up">
      <section className="ca-hero">
        <img
          src={heroHall}
          alt="CSU Hiraya Hall"
          className="ca-hero__media"
        />
        <div className="ca-hero__scrim" aria-hidden="true" />

        <div className="ca-hero__content space-y-7">
          <p className="ca-hero-eyebrow text-sm sm:text-base font-semibold tracking-wide">
            College of Computing and Information Sciences • Caraga State University
          </p>

          <h1 className="ca-hero-title font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.12] max-w-5xl">
            <span className="block">
              Live AI <span className="ca-hero-accent">Source Code Detection</span>
            </span>
            <span className="block">
              for Laboratory <span className="ca-hero-accent">Exams</span>
            </span>
          </h1>

          <p className="ca-hero-copy max-w-2xl text-base sm:text-lg leading-relaxed">
            CodeAuthentic supports exam integrity by helping instructors identify potentially
            AI-generated C, Java, and Python submissions in timed laboratory exams.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button onClick={onNavigateToInstructor} className="ca-btn-primary text-base !px-6 !py-3.5">
              <span>{isInstructorLoggedIn ? 'Open Instructor Dashboard' : 'Instructor Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button onClick={onNavigateToStudent} className="ca-btn-secondary text-base !px-6 !py-3.5">
              <Terminal className="w-4 h-4 text-ca-brand" />
              <span>Student Submission Portal</span>
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-8">
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-ca-ink flex items-center gap-3">
          <Layers className="w-6 h-6 text-ca-brand" />
          <span>How it works</span>
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            {
              step: '01',
              title: 'Instructor Creates Lobby',
              body: 'Specifies the course, section, language, and duration. The server saves a unique lobby code and shareable link.',
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
            <article key={item.step} className="ca-panel p-5 sm:p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-ca-brand-soft text-ca-brand font-bold font-mono text-sm flex items-center justify-center">
                {item.step}
              </div>
              <h3 className="font-bold text-ca-ink text-lg sm:text-xl font-display">{item.title}</h3>
              <p className="text-sm sm:text-base text-ca-muted leading-relaxed">{item.body}</p>
            </article>
          ))}
        </div>

        <div className="pt-2 text-sm sm:text-base text-ca-muted flex items-start gap-3 max-w-3xl">
          <AlertTriangle className="w-5 h-5 text-ca-brand shrink-0 mt-0.5" />
          <p>
            <strong className="text-ca-brand">Academic Integrity Standard: </strong>
            Scores are probabilities to support instructor grading and manual code review, not
            proof of academic dishonesty. Code is treated strictly as plain text and is never
            executed or compiled.
          </p>
        </div>
      </section>
    </div>
  );
};
