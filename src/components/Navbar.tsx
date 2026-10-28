import React from 'react';
import { Shield, Sun, Moon, LogIn, LogOut, Code, User, Terminal } from 'lucide-react';
import { Instructor, Theme } from '../types';

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
  return (
    <header className="sticky top-0 z-40 border-b transition-colors bg-stone-950/90 dark:bg-stone-950/95 border-stone-800 text-stone-100 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-orange-600 text-stone-950 font-black shadow-lg shadow-orange-600/30 group-hover:bg-orange-500 transition-colors">
            <Shield className="w-5 h-5 fill-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-white group-hover:text-orange-400 transition-colors">
                Code<span className="text-orange-500">Authentic</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40">
                CCIS CSU
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium hidden sm:block">
              AI Code Detector for Lab Examinations
            </p>
          </div>
        </div>

        {/* Center View Selector */}
        <nav className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setCurrentView('home')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'home'
                ? 'bg-orange-600 text-stone-950 font-bold shadow-md shadow-orange-600/20'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Home:
          </button>
          <button
            onClick={() => setCurrentView('instructor')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentView === 'instructor'
                ? 'bg-orange-600 text-stone-950 font-bold shadow-md shadow-orange-600/20'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Instructor Portal</span>
          </button>
          <button
            onClick={() => setCurrentView('student')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              currentView === 'student'
                ? 'bg-orange-600 text-stone-950 font-bold shadow-md shadow-orange-600/20'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Student Upload</span>
          </button>
        </nav>

        {/* Right Actions: Dark/Light Mode + Instructor Profile */}
        <div className="flex items-center gap-2.5">
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Dark/Light Mode"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2 rounded-xl border border-stone-800 bg-stone-900 text-stone-300 hover:text-orange-400 hover:border-orange-500/50 transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-orange-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-300" />
            )}
          </button>

          {/* Instructor Session Badge */}
          {instructor ? (
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-stone-200 leading-tight">
                  {instructor.name}
                </div>
                <div className="text-[10px] text-orange-400 font-mono">
                  {instructor.idNumber}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign out of instructor account"
                className="p-1 text-stone-400 hover:text-rose-400 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentView('home')}
              className="px-3 py-1.5 rounded-xl bg-orange-600/20 border border-orange-500/40 text-orange-400 hover:bg-orange-600 hover:text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-all"
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
