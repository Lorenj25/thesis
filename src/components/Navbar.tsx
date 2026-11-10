import React from 'react';
import { Sun, Moon, LogIn, LogOut, User, Terminal } from 'lucide-react';
import { Instructor, Theme } from '../types';
import csuCcisLogo from '../assets/CSU-CCIS.png';

interface NavbarProps {
  currentView: 'home' | 'instructor' | 'student';
  setCurrentView: (view: 'home' | 'instructor' | 'student') => void;
  instructor: Instructor | null;
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  instructor,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const navBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
      active
        ? 'bg-ca-brand text-ca-brand-ink font-bold'
        : 'text-ca-muted hover:text-ca-ink'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-transparent text-ca-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src={csuCcisLogo}
            alt="CSU CCIS"
            className="h-10 w-10 sm:h-11 sm:w-11 object-contain shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-ca-ink group-hover:text-ca-brand transition-colors">
                Code<span className="text-ca-brand">Authentic</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-ca-brand-soft text-ca-brand border border-ca-border">
                CCIS CSU
              </span>
            </div>
            <p className="text-[11px] text-ca-muted font-medium hidden sm:block">
              AI Code Detector for Lab Examinations
            </p>
          </div>
        </div>

        <nav className="flex items-center bg-ca-bg-elevated p-1 rounded-xl border border-ca-border text-xs sm:text-sm font-semibold">
          <button onClick={() => setCurrentView('home')} className={navBtn(currentView === 'home')}>
            Home
          </button>
          <button
            onClick={() => setCurrentView('instructor')}
            className={navBtn(currentView === 'instructor')}
          >
            <User className="w-3.5 h-3.5" />
            <span>Instructor</span>
          </button>
          <button
            onClick={() => setCurrentView('student')}
            className={navBtn(currentView === 'student')}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Dark/Light Mode"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2 rounded-xl border border-ca-border bg-ca-surface text-ca-muted hover:text-ca-brand hover:border-ca-brand transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-ca-brand" />
            ) : (
              <Moon className="w-4 h-4 text-ca-muted" />
            )}
          </button>

          {instructor ? (
            <div className="flex items-center gap-2 bg-ca-surface border border-ca-border px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-ca-ok animate-pulse" />
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-ca-ink leading-tight">
                  {instructor.name}
                </div>
                <div className="text-[10px] text-ca-brand font-mono">
                  {instructor.idNumber}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign out of instructor account"
                className="p-1 text-ca-muted hover:text-ca-danger transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentView('instructor')}
              className="px-3 py-1.5 rounded-xl bg-ca-brand-soft border border-ca-border text-ca-brand hover:bg-ca-brand hover:text-ca-brand-ink font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Instructor Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
