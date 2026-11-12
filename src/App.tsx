/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Instructor, Lobby, Submission, Theme } from './types';
import {
  clearAuthSession,
  createLobby as createRemoteLobby,
  deleteLobby as deleteRemoteLobby,
  getAuthToken,
  getSavedInstructor,
  loadInstructorData,
  saveAuthSession,
  setLobbyLocked,
} from './utils/api';
import { getStoredTheme, saveStoredTheme } from './utils/storage';
import { Navbar } from './components/Navbar';
import { HomeIntro } from './components/HomeIntro';
import { InstructorLogin } from './components/InstructorLogin';
import { InstructorDashboard } from './components/InstructorDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import instructorBg from './assets/BG ins.jpg';

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentView, setCurrentView] = useState<'home' | 'instructor' | 'student'>('home');
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [initialStudentLobbyCode, setInitialStudentLobbyCode] = useState('');
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const refreshDashboardData = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await loadInstructorData(authToken);
      setLobbies(data.lobbies);
      setSubmissions(data.submissions);
      setDashboardError(null);
    } catch (error) {
      setDashboardError(
        error instanceof Error ? error.message : 'Unable to load instructor data.',
      );
    }
  }, [authToken]);

  useEffect(() => {
    const savedTheme = getStoredTheme();
    setTheme(savedTheme);
    saveStoredTheme(savedTheme);

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('lobby');
    if (codeParam) {
      setInitialStudentLobbyCode(codeParam);
      setCurrentView('student');
      return;
    }

    const savedInstructor = getSavedInstructor();
    const savedToken = getAuthToken();
    if (savedInstructor && savedToken) {
      setInstructor(savedInstructor);
      setAuthToken(savedToken);
      setCurrentView('instructor');
    }
  }, []);

  useEffect(() => {
    if (!authToken) return;
    void refreshDashboardData();
    const timer = window.setInterval(() => void refreshDashboardData(), 10_000);
    return () => window.clearInterval(timer);
  }, [authToken, refreshDashboardData]);

  const handleToggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveStoredTheme(nextTheme);
  };

  const handleLogin = (newInstructor: Instructor, token: string) => {
    saveAuthSession(newInstructor, token);
    setInstructor(newInstructor);
    setAuthToken(token);
    setCurrentView('instructor');
  };

  const handleLogout = () => {
    clearAuthSession();
    setInstructor(null);
    setAuthToken(null);
    setLobbies([]);
    setSubmissions([]);
    setDashboardError(null);
    setCurrentView('home');
  };

  const handleCreateLobby = async (data: {
    subject: string;
    title: string;
    language: 'c' | 'java' | 'python';
    durationMinutes: number;
    maxStudents: number;
  }): Promise<Lobby> => {
    if (!authToken) throw new Error('Please sign in again to create a lobby.');
    const lobby = await createRemoteLobby(
      authToken,
      data.subject,
      data.title,
      data.language,
      data.durationMinutes,
      data.maxStudents,
    );
    await refreshDashboardData();
    return lobby;
  };

  const handleToggleLock = async (lobbyId: string) => {
    if (!authToken) throw new Error('Please sign in again to update this lobby.');
    const lobby = lobbies.find((item) => item.id === lobbyId);
    if (!lobby) throw new Error('This lobby is no longer available.');
    await setLobbyLocked(authToken, lobbyId, lobby.status === 'ACTIVE');
    await refreshDashboardData();
  };

  const handleDeleteLobby = async (lobbyId: string) => {
    if (!authToken) throw new Error('Please sign in again to delete this lobby.');
    await deleteRemoteLobby(authToken, lobbyId);
    await refreshDashboardData();
  };

  const handleSwitchToStudentView = (lobbyCode: string) => {
    setInitialStudentLobbyCode(lobbyCode);
    setCurrentView('student');
  };

  const handleSetCurrentView = (view: 'home' | 'instructor' | 'student') => {
    setCurrentView(view);
  };

  return (
    <div className="ca-page flex flex-col font-sans transition-colors duration-200">
      <Navbar
        currentView={currentView}
        setCurrentView={handleSetCurrentView}
        instructor={instructor}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        logoutConfirmOpen={logoutConfirmOpen}
        setLogoutConfirmOpen={setLogoutConfirmOpen}
      />

      <main className="flex-1 w-full">
        {currentView === 'home' ? (
          <HomeIntro
            onNavigateToStudent={() => setCurrentView('student')}
            onNavigateToInstructor={() => setCurrentView('instructor')}
            isInstructorLoggedIn={!!instructor}
          />
        ) : currentView === 'instructor' && !instructor ? (
          <InstructorLogin onLogin={handleLogin} />
        ) : currentView === 'instructor' && instructor ? (
          <section className="ca-hero ca-hero--app">
            <img src={instructorBg} alt="" className="ca-hero__media" aria-hidden="true" />
            <div className="ca-hero__scrim" aria-hidden="true" />
            <div className="ca-hero__content max-w-7xl mx-auto px-4 sm:px-6 w-full">
              <InstructorDashboard
                instructor={instructor}
                lobbies={lobbies}
                submissions={submissions}
                onCreateLobby={handleCreateLobby}
                onToggleLock={handleToggleLock}
                onDeleteLobby={handleDeleteLobby}
                onSwitchToStudentView={handleSwitchToStudentView}
                onRefresh={refreshDashboardData}
                errorMessage={dashboardError}
                theme={theme}
                onToggleTheme={handleToggleTheme}
                onLogout={() => setLogoutConfirmOpen(true)}
              />
            </div>
          </section>
        ) : currentView === 'student' ? (
          <section className="ca-hero ca-hero--app">
            <img src={instructorBg} alt="" className="ca-hero__media" aria-hidden="true" />
            <div className="ca-hero__scrim" aria-hidden="true" />
            <div className="ca-hero__content max-w-7xl mx-auto px-4 sm:px-6 w-full">
              <StudentDashboard initialLobbyCode={initialStudentLobbyCode} />
            </div>
          </section>
        ) : null}
      </main>

      <footer className="relative z-10 border-t border-ca-border bg-ca-surface/95 backdrop-blur-md py-6 px-4 text-center text-xs text-ca-faint">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-extrabold text-ca-ink">
              Code<span className="text-ca-brand">Authentic</span>
            </span>
            <span>• CCIS, Caraga State University</span>
          </div>
          <div className="text-[11px] text-ca-muted">
            Frozen CodeBERT 770-dim feature extractor • C, Java, Python • Max 3 files/student
          </div>
        </div>
      </footer>
    </div>
  );
}
