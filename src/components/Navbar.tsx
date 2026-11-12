import React, { useEffect, useState } from 'react';
import { Sun, Moon, LogOut, User, Terminal, X, Home } from 'lucide-react';
import { Instructor, Theme } from '../types';
import csuCcisLogo from '../assets/CSU-CCIS.png';
import logoutLeaveArt from '../assets/logout-leave.png';

interface NavbarProps {
  currentView: 'home' | 'instructor' | 'student';
  setCurrentView: (view: 'home' | 'instructor' | 'student') => void;
  instructor: Instructor | null;
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  logoutConfirmOpen: boolean;
  setLogoutConfirmOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  instructor,
  onLogout,
  theme,
  onToggleTheme,
  logoutConfirmOpen,
  setLogoutConfirmOpen,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const showLandingMenu = !instructor;

  useEffect(() => {
    if (instructor) setMenuOpen(false);
  }, [instructor]);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const scrollingDown = currentY > lastY;
      const pastTop = currentY > 24;

      // Keep navbar visible while the menu drawer is open
      if (menuOpen) {
        setNavHidden(false);
      } else if (scrollingDown && pastTop) {
        setNavHidden(true);
      } else {
        setNavHidden(false);
      }

      lastY = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen && !logoutConfirmOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (logoutConfirmOpen) {
        setLogoutConfirmOpen(false);
        return;
      }
      setMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, logoutConfirmOpen]);

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
      <header
        className={`ca-navbar fixed inset-x-0 top-0 z-40 border-b border-transparent bg-transparent text-ca-ink ${
          navHidden ? 'is-hidden' : ''
        }`}
      >
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
              <button
                type="button"
                onClick={() => setCurrentView('instructor')}
                className="flex items-center gap-2.5 px-1 py-1 bg-transparent cursor-pointer"
                title="Open instructor console"
              >
                <div
                  className="w-9 h-9 rounded-full bg-ca-brand text-ca-brand-ink flex items-center justify-center text-xs font-bold shrink-0"
                  aria-hidden="true"
                >
                  {instructor.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? '')
                    .join('') || 'IN'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-ca-ink leading-tight">
                    {instructor.name}
                  </div>
                  <div className="text-[10px] text-ca-brand font-mono">
                    {instructor.idNumber}
                  </div>
                </div>
              </button>
            )}

            {showLandingMenu && (
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
            )}
          </div>
        </div>
      </header>

      {showLandingMenu && menuOpen && (
        <button
          type="button"
          className="ca-drawer-backdrop"
          aria-label="Close menu overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`ca-drawer ${showLandingMenu && menuOpen ? 'is-open' : ''}`}
        aria-hidden={!showLandingMenu || !menuOpen}
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

        <div className="pt-4 mt-auto border-t border-ca-border space-y-1">
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

          {instructor && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setLogoutConfirmOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-ca-danger hover:bg-ca-brand-soft transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          )}
        </div>
      </aside>

      {logoutConfirmOpen && (
        <div
          className="ca-logout-overlay fixed inset-0 z-50 flex items-center justify-center p-4 ca-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss logout confirmation"
            onClick={() => setLogoutConfirmOpen(false)}
          />
          <div className="ca-logout-card relative w-full max-w-sm rounded-2xl p-6 sm:p-7 text-center ca-fade-up">
            <div className="mb-5 flex justify-center">
              <img
                src={logoutLeaveArt}
                alt=""
                className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                aria-hidden="true"
              />
            </div>
            <h2
              id="logout-confirm-title"
              className="font-display text-xl sm:text-2xl font-bold text-ca-ink"
            >
              Come back soon!
            </h2>
            <p className="mt-2 text-sm text-ca-muted">
              Are you sure you want to leave?
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-ca-danger hover:text-ca-brand-hover transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  onLogout();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-ca-danger text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
