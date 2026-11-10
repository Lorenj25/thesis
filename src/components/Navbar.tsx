import React, { useEffect, useState } from 'react';
import { Sun, Moon, LogOut, User, Terminal, X, Home } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const goTo = (view: 'home' | 'instructor' | 'student') => {
    setCurrentView(view);
    setMenuOpen(false);
  };

  const menuItemClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
      active
        ? 'bg-ca-brand text-ca-brand-ink'
        : 'text-ca-ink hover:bg-ca-brand-soft hover:text-ca-brand'
    }`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-transparent bg-transparent text-ca-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div
            onClick={() => goTo('home')}
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

          <div className="flex items-center gap-2.5">
            {instructor && (
              <div className="flex items-center gap-2 px-2 py-1.5">
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
            )}

            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2.5 px-1 py-1 bg-transparent text-ca-ink hover:text-ca-brand transition-colors cursor-pointer"
            >
              <span className="flex flex-col justify-center gap-[5px]" aria-hidden="true">
                <span className="block w-5 h-[2px] rounded-full bg-current" />
                <span className="block w-5 h-[2px] rounded-full bg-current" />
              </span>
              <span className="text-sm font-semibold tracking-[0.14em] uppercase">
                Menu
              </span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="ca-drawer-backdrop"
          aria-label="Close menu overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`ca-drawer ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ca-faint">Navigate</p>
            <p className="text-sm font-bold text-ca-ink font-display">CodeAuthentic</p>
          </div>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-xl border border-black bg-transparent text-ca-brand hover:bg-ca-brand-soft transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1">
          <button type="button" onClick={() => goTo('home')} className={menuItemClass(currentView === 'home')}>
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('instructor')}
            className={menuItemClass(currentView === 'instructor')}
          >
            <User className="w-4 h-4" />
            <span>Instructor</span>
          </button>
          <button
            type="button"
            onClick={() => goTo('student')}
            className={menuItemClass(currentView === 'student')}
          >
            <Terminal className="w-4 h-4" />
            <span>Student</span>
          </button>
        </nav>

        <div className="pt-4 mt-auto border-t border-ca-border">
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-ca-ink hover:bg-ca-brand-soft hover:text-ca-brand transition-colors"
          >
            <span className="inline-flex items-center gap-3">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-ca-brand" /> : <Moon className="w-4 h-4" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
            <span className="text-[11px] uppercase tracking-wider text-ca-faint">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
