/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Instructor, Lobby, Submission, Theme } from './types';
import {
  getStoredInstructor,
  getStoredLobbies,
  getStoredSubmissions,
  getStoredTheme,
  saveStoredInstructor,
  saveStoredLobbies,
  saveStoredSubmissions,
  saveStoredTheme,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { HomeIntro } from './components/HomeIntro';
import { InstructorDashboard } from './components/InstructorDashboard';
import { StudentDashboard } from './components/StudentDashboard';

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentView, setCurrentView] = useState<'home' | 'instructor' | 'student'>('home');
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [initialStudentLobbyCode, setInitialStudentLobbyCode] = useState<string>('');

  // Initialize theme, instructor session, lobbies, and submissions from localStorage
  useEffect(() => {
    const savedTheme = getStoredTheme();
    setTheme(savedTheme);
    saveStoredTheme(savedTheme);

    const savedInstructor = getStoredInstructor();
    if (savedInstructor) {
      setInstructor(savedInstructor);
    }

    const savedLobbies = getStoredLobbies();
    setLobbies(savedLobbies);

    const savedSubmissions = getStoredSubmissions();
    setSubmissions(savedSubmissions);

    // Check if URL has ?lobby=CODE
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('lobby');
    if (codeParam) {
      setInitialStudentLobbyCode(codeParam);
      setCurrentView('student');
    }
  }, []);

  // Theme toggle
  const handleToggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveStoredTheme(nextTheme);
  };

  // Instructor Login
  const handleLogin = (newInstructor: Instructor) => {
    setInstructor(newInstructor);
    saveStoredInstructor(newInstructor);
    setCurrentView('instructor');
  };

  // Instructor Logout
  const handleLogout = () => {
    setInstructor(null);
    saveStoredInstructor(null);
    setCurrentView('home');
  };

  // Create Lobby
  const handleCreateLobby = ({
    subject,
    title,
    durationMinutes,
    maxStudents,
  }: {
    subject: string;
    title: string;
    durationMinutes: number;
    maxStudents: number;
  }): Lobby => {
    // Generate clean 6-character code (e.g. CCIS-12 or CARSU-3)
    const randomSuffix = Math.floor(10 + Math.random() * 89);
    const code = `CCIS-${randomSuffix}`;

    const now = new Date();
    const expires = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const newLobby: Lobby = {
      id: `lobby-${Date.now()}`,
      code,
      subject,
      title,
      instructorId: instructor?.idNumber || 'INS-FACULTY',
      instructorEmail: instructor?.email || 'instructor@carsu.edu.ph',
      maxStudents,
      durationMinutes,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'ACTIVE',
      maxUploadsPerStudent: 3, // Fixed: 3 uploads max per student
    };

    const updated = [newLobby, ...lobbies];
    setLobbies(updated);
    saveStoredLobbies(updated);
    return newLobby;
  };

  // Toggle Lobby Status (Lock / Unlock)
  const handleToggleLock = (lobbyId: string) => {
    const updated = lobbies.map((lobby) => {
      if (lobby.id === lobbyId) {
        const nextStatus = lobby.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
        return { ...lobby, status: nextStatus as 'ACTIVE' | 'LOCKED' };
      }
      return lobby;
    });
    setLobbies(updated);
    saveStoredLobbies(updated);
  };

  // Add new student submissions
  const handleAddSubmissions = (newSubmissions: Submission[]) => {
    const updated = [...newSubmissions, ...submissions];
    setSubmissions(updated);
    saveStoredSubmissions(updated);
  };

  // Switch to Student View with prefilled lobby code
  const handleSwitchToStudentView = (lobbyCode: string) => {
    setInitialStudentLobbyCode(lobbyCode);
    setCurrentView('student');
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-stone-950 text-stone-100 dark'
          : 'bg-stone-50 text-stone-900'
      }`}
    >
      {/* Universal Orange & Black Header */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        instructor={instructor}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentView === 'home' && (
          <HomeIntro
            onLogin={handleLogin}
            onNavigateToStudent={() => setCurrentView('student')}
            onNavigateToInstructor={() => {
              if (instructor) setCurrentView('instructor');
              else {
                const el = document.getElementById('instructor-login-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            isInstructorLoggedIn={!!instructor}
          />
        )}

        {currentView === 'instructor' && (
          <>
            {instructor ? (
              <InstructorDashboard
                instructor={instructor}
                lobbies={lobbies}
                submissions={submissions}
                onCreateLobby={handleCreateLobby}
                onToggleLock={handleToggleLock}
                onSwitchToStudentView={handleSwitchToStudentView}
              />
            ) : (
              <div className="py-12 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-orange-600/10 text-orange-500 border border-orange-500/20 flex items-center justify-center mx-auto text-2xl font-black">
                  !
                </div>
                <h2 className="text-xl font-black text-stone-100">Faculty Authentication Required</h2>
                <p className="text-xs text-stone-400">
                  Please sign in with your Instructor ID Number and Institutional Email on the homepage to access the instructor dashboard.
                </p>
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-bold text-xs"
                >
                  Go to Sign In
                </button>
              </div>
            )}
          </>
        )}

        {currentView === 'student' && (
          <StudentDashboard
            lobbies={lobbies}
            submissions={submissions}
            initialLobbyCode={initialStudentLobbyCode}
            onAddSubmissions={handleAddSubmissions}
          />
        )}
      </main>

      {/* Universal Footer */}
      <footer className="border-t border-stone-800 bg-stone-950 py-6 px-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-stone-300">
              Code<span className="text-orange-500">Authentic</span>
            </span>
            <span>• CCIS, Caraga State University</span>
          </div>
          <div className="text-[11px] text-stone-400">
            Frozen CodeBERT 770-dim feature extractor • C, Java, Python support • Max 3 files/student
          </div>
        </div>
      </footer>
    </div>
  );
}
