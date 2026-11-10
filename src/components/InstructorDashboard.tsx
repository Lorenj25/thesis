import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  Lock,
  Unlock,
  Download,
  Users,
  FileCode,
  CheckCircle2,
  Search,
  Eye,
  ExternalLink,
  BookOpen,
  LayoutDashboard,
  Layers,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import { Instructor, Lobby, RiskLevel, Submission, Theme } from '../types';
import { CodeModal } from './CodeModal';

type InstructorSection = 'dashboard' | 'lobbies' | 'submissions';

interface InstructorDashboardProps {
  instructor: Instructor;
  lobbies: Lobby[];
  submissions: Submission[];
  onCreateLobby: (lobbyData: {
    subject: string;
    title: string;
    durationMinutes: number;
    maxStudents: number;
  }) => Lobby;
  onToggleLock: (lobbyId: string) => void;
  onSwitchToStudentView: (lobbyCode: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  instructor,
  lobbies,
  submissions,
  onCreateLobby,
  onToggleLock,
  onSwitchToStudentView,
  theme,
  onToggleTheme,
  onLogout,
}) => {
  const [section, setSection] = useState<InstructorSection>('dashboard');
  const [selectedLobbyId, setSelectedLobbyId] = useState<string>(
    lobbies.length > 0 ? lobbies[0].id : ''
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [inspectedSubmission, setInspectedSubmission] = useState<Submission | null>(null);

  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [maxStudents, setMaxStudents] = useState(35);

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | RiskLevel>('All');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lobbyMenuOpen, setLobbyMenuOpen] = useState(false);
  const lobbyMenuRef = useRef<HTMLDivElement>(null);

  const activeLobby = lobbies.find((l) => l.id === selectedLobbyId) || lobbies[0];

  useEffect(() => {
    if (!lobbyMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!lobbyMenuRef.current?.contains(event.target as Node)) {
        setLobbyMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLobbyMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [lobbyMenuOpen]);

  const lobbySubmissions = submissions.filter(
    (s) => s.lobbyId === (activeLobby ? activeLobby.id : '')
  );

  const displayedSubmissions = lobbySubmissions.filter((sub) => {
    const matchesSearch =
      sub.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.language.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'All' || sub.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const uniqueStudents = new Set(lobbySubmissions.map((s) => s.studentId)).size;
  const highRiskCount = lobbySubmissions.filter((s) => s.riskLevel === 'High').length;
  const mediumRiskCount = lobbySubmissions.filter((s) => s.riskLevel === 'Medium').length;
  const lowRiskCount = lobbySubmissions.filter((s) => s.riskLevel === 'Low').length;

  const totalHighRisk = submissions.filter((s) => s.riskLevel === 'High').length;
  const activeLobbyCount = lobbies.filter((l) => l.status === 'ACTIVE').length;

  const handleCreateLobbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !title.trim()) return;

    const newLobby = onCreateLobby({
      subject: subject.trim(),
      title: title.trim(),
      durationMinutes: Number(durationMinutes),
      maxStudents: Number(maxStudents),
    });

    setSelectedLobbyId(newLobby.id);
    setShowCreateModal(false);
    setSubject('');
    setTitle('');
    setSection('lobbies');
  };

  const handleCopyCode = () => {
    if (!activeLobby) return;
    navigator.clipboard.writeText(activeLobby.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!activeLobby) return;
    const url = `${window.location.origin}?lobby=${activeLobby.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportCSV = () => {
    if (!activeLobby || lobbySubmissions.length === 0) {
      alert('No submissions in this lobby to export.');
      return;
    }

    const headers = [
      'Student ID',
      'File Name',
      'Language',
      'AI Probability (%)',
      'Risk Level',
      'Token Count',
      'Submitted At',
    ];

    const rows = lobbySubmissions.map((sub) => [
      sub.studentId,
      sub.fileName,
      sub.language,
      sub.aiProbability !== null ? (sub.aiProbability * 100).toFixed(1) : 'N/A',
      sub.riskLevel || 'N/A',
      sub.tokenCount,
      sub.submittedAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `codeauthentic_${activeLobby.code}_${activeLobby.subject.replace(/[^a-zA-Z0-9]/g, '_')}_grades.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
      active
        ? 'bg-ca-brand text-ca-brand-ink'
        : 'text-ca-ink hover:bg-ca-brand-soft hover:text-ca-brand'
    }`;

  const selectLobby = (lobbyId: string) => {
    setSelectedLobbyId(lobbyId);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 py-2 lg:min-h-[calc(100vh-8rem)]">
      <aside className="lg:w-64 shrink-0">
        <div className="lg:sticky lg:top-[7.25rem] rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md p-3 sm:p-4 flex flex-col gap-1.5 lg:min-h-[calc(100vh-8.5rem)] shadow-none dark:shadow-none">
          <div className="px-2 pb-3 mb-1 border-b border-ca-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ca-faint">Instructor</p>
            <p className="text-sm font-bold text-ca-ink font-display truncate">{instructor.name}</p>
            <p className="text-[11px] text-ca-brand font-mono">{instructor.idNumber}</p>
          </div>

          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            <button type="button" onClick={() => setSection('dashboard')} className={navItemClass(section === 'dashboard')}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>
            <button type="button" onClick={() => setSection('lobbies')} className={navItemClass(section === 'lobbies')}>
              <Layers className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Examination Lobbies</span>
            </button>
            <button
              type="button"
              onClick={() => setSection('submissions')}
              className={navItemClass(section === 'submissions')}
            >
              <FileCode className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Live Student Submissions</span>
            </button>
          </nav>

          <div className="mt-auto pt-3 border-t border-ca-border space-y-1 hidden lg:block">
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-ca-ink hover:bg-ca-brand-soft hover:text-ca-brand transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-3">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-ca-brand" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-ca-danger hover:bg-ca-brand-soft transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
        {section === 'dashboard' && (
          <div className="space-y-6 ca-fade-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-ca-ink">
                  Dashboard
                </h1>
                <p className="text-sm text-ca-muted mt-1">
                  Overview of lobbies, uploads, and AI risk across your exam sessions.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowDatasetModal(true)}
                  className="h-10 px-3.5 rounded-xl bg-ca-surface/95 hover:bg-ca-surface-hover text-ca-ink border border-ca-border text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer backdrop-blur-md"
                >
                  <BookOpen className="w-4 h-4 text-ca-brand" />
                  <span>Datasets</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="h-10 px-3.5 rounded-xl bg-ca-brand hover:bg-ca-brand-hover text-ca-brand-ink text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate New Lobby</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Lobbies', value: String(lobbies.length), valueClass: 'text-ca-ink' },
                { label: 'Active', value: String(activeLobbyCount), valueClass: 'text-ca-ok' },
                { label: 'Files', value: String(submissions.length), valueClass: 'text-ca-brand' },
                { label: 'High risk', value: String(totalHighRisk), valueClass: 'text-ca-danger' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="h-[5.5rem] p-3.5 rounded-xl border border-ca-border bg-ca-surface/95 backdrop-blur-md flex flex-col justify-between"
                >
                  <span className="text-[11px] font-medium text-ca-muted tracking-wide">{stat.label}</span>
                  <span className={`text-2xl font-bold font-mono leading-none ${stat.valueClass}`}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ca-ink font-display">Quick open lobbies</h2>
                <button
                  type="button"
                  onClick={() => setSection('lobbies')}
                  className="text-sm font-semibold text-ca-brand hover:text-ca-brand-hover transition-colors cursor-pointer"
                >
                  View all →
                </button>
              </div>
              {lobbies.length === 0 ? (
                <p className="text-sm text-ca-muted">No lobbies yet. Generate one to start an exam session.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {lobbies.slice(0, 4).map((lobby) => {
                    const isLocked = lobby.status === 'LOCKED';
                    return (
                      <button
                        key={lobby.id}
                        type="button"
                        onClick={() => {
                          selectLobby(lobby.id);
                          setSection('lobbies');
                        }}
                        className="text-left p-3.5 rounded-xl border border-ca-border bg-ca-surface-2/80 hover:border-ca-brand transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-ca-brand shrink-0">
                            {lobby.code}
                          </span>
                          <span className="text-sm font-semibold text-ca-ink truncate min-w-0 flex-1">
                            {lobby.subject}
                          </span>
                          <span
                            className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                              isLocked ? 'bg-ca-bg-elevated text-ca-muted' : 'bg-ca-ok-soft text-ca-ok'
                            }`}
                          >
                            {lobby.status}
                          </span>
                        </div>
                        <p className="text-xs text-ca-muted mt-1.5 line-clamp-1">{lobby.title}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {section === 'lobbies' && (
          <div className="space-y-6 ca-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold font-display text-ca-ink">Examination Lobbies</h1>
                <p className="text-sm text-ca-muted">Create lobbies, share codes, and lock exam access.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-10 px-3.5 rounded-xl bg-ca-brand hover:bg-ca-brand-hover text-ca-brand-ink text-xs font-semibold inline-flex items-center gap-2 self-start transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Generate New Lobby</span>
              </button>
            </div>

            <div className="grid lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-4 rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md p-4 space-y-3">
                <h2 className="text-xs font-semibold tracking-wide text-ca-muted">
                  Lobbies · {lobbies.length}
                </h2>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {lobbies.length === 0 ? (
                    <p className="text-sm text-ca-muted py-6 text-center">No lobbies yet.</p>
                  ) : (
                    lobbies.map((lobby) => {
                      const isSelected = activeLobby && activeLobby.id === lobby.id;
                      const isLocked = lobby.status === 'LOCKED';
                      const subCount = submissions.filter((s) => s.lobbyId === lobby.id).length;

                      return (
                        <button
                          key={lobby.id}
                          type="button"
                          onClick={() => selectLobby(lobby.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-ca-brand-soft border-ca-brand'
                              : 'bg-ca-surface-2/80 border-ca-border hover:border-ca-border-strong'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] font-bold text-ca-brand shrink-0">
                              {lobby.code}
                            </span>
                            <span className="text-sm font-semibold text-ca-ink truncate min-w-0 flex-1">
                              {lobby.subject}
                            </span>
                            <span
                              className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md whitespace-nowrap ${
                                isLocked
                                  ? 'bg-ca-bg-elevated text-ca-muted'
                                  : 'bg-ca-ok-soft text-ca-ok'
                              }`}
                            >
                              {lobby.status}
                            </span>
                          </div>
                          <p className="text-xs text-ca-muted mt-1.5 line-clamp-1">{lobby.title}</p>
                          <div className="mt-3 flex items-center justify-between text-[11px] text-ca-faint">
                            <span>Max {lobby.maxStudents}</span>
                            <span>{subCount} files</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="lg:col-span-8">
                {activeLobby ? (
                  <div className="rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md p-5 sm:p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-ca-brand">
                              {activeLobby.code}
                            </span>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                                activeLobby.status === 'ACTIVE'
                                  ? 'bg-ca-ok-soft text-ca-ok'
                                  : 'bg-ca-bg-elevated text-ca-muted'
                              }`}
                            >
                              {activeLobby.status}
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold font-display text-ca-ink leading-tight">
                            {activeLobby.subject}
                          </h2>
                          <p className="text-sm text-ca-muted">{activeLobby.title}</p>
                          <p className="text-xs text-ca-faint">Up to 3 uploads per student</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={handleCopyCode}
                            className="px-3 py-2 rounded-xl bg-ca-surface-2 hover:bg-ca-surface-hover text-ca-ink border border-ca-border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-ca-ok" /> : <Copy className="w-3.5 h-3.5 text-ca-brand" />}
                            <span>{copiedCode ? 'Copied' : 'Copy code'}</span>
                          </button>
                          <button
                            onClick={handleCopyLink}
                            className="px-3 py-2 rounded-xl bg-ca-surface-2 hover:bg-ca-surface-hover text-ca-ink border border-ca-border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5 text-ca-ok" /> : <ExternalLink className="w-3.5 h-3.5 text-ca-brand" />}
                            <span>{copiedLink ? 'Copied' : 'Copy link'}</span>
                          </button>
                          <button
                            onClick={() => onToggleLock(activeLobby.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                              activeLobby.status === 'ACTIVE'
                                ? 'bg-ca-danger-soft text-ca-danger border-transparent'
                                : 'bg-ca-ok-soft text-ca-ok border-transparent'
                            }`}
                          >
                            {activeLobby.status === 'ACTIVE' ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Lock</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: 'Students',
                          value: String(uniqueStudents),
                          unit: `/ ${activeLobby.maxStudents}`,
                          valueClass: 'text-ca-ink',
                        },
                        {
                          label: 'Files',
                          value: String(lobbySubmissions.length),
                          unit: 'uploaded',
                          valueClass: 'text-ca-brand',
                        },
                        {
                          label: 'High risk',
                          value: String(highRiskCount),
                          unit: '≥ 70%',
                          valueClass: 'text-ca-danger',
                        },
                        {
                          label: 'Med / Low',
                          value: `${mediumRiskCount} / ${lowRiskCount}`,
                          unit: 'M / L',
                          valueClass: 'text-ca-ink',
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="h-[5.5rem] p-3.5 rounded-xl bg-ca-surface-2/90 border border-ca-border flex flex-col justify-between"
                        >
                          <span className="text-[11px] font-medium text-ca-muted tracking-wide">
                            {stat.label}
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-2xl font-bold font-mono leading-none ${stat.valueClass}`}>
                              {stat.value}
                            </span>
                            <span className="text-[11px] text-ca-faint">{stat.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSection('submissions')}
                      className="text-sm font-semibold text-ca-brand hover:text-ca-brand-hover transition-colors cursor-pointer"
                    >
                      Open live student submissions →
                    </button>
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md text-ca-muted">
                    <h3 className="text-lg font-bold font-display text-ca-ink mb-2">No lobbies yet</h3>
                    <p className="text-sm mb-5">Generate a lobby to start an exam session.</p>
                    <button onClick={() => setShowCreateModal(true)} className="ca-btn-primary mx-auto">
                      Create exam lobby
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {section === 'submissions' && (
          <div className="space-y-6 ca-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold font-display text-ca-ink">Live Student Submissions</h1>
                <p className="text-sm text-ca-muted mt-1">
                  CodeBERT AI predictions calibrated for live lab exam grading.
                </p>
              </div>

              {lobbies.length > 0 && (
                <div ref={lobbyMenuRef} className="relative w-full sm:w-72 shrink-0">
                  <p className="text-[11px] font-medium text-ca-muted mb-1.5">Lobby</p>
                  <button
                    type="button"
                    onClick={() => setLobbyMenuOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={lobbyMenuOpen}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-ca-border bg-ca-surface/95 backdrop-blur-md text-left text-sm text-ca-ink hover:border-ca-border-strong transition-colors cursor-pointer"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-[11px] font-bold text-ca-brand mr-2">
                        {activeLobby?.code}
                      </span>
                      <span className="font-semibold">{activeLobby?.subject}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-ca-muted shrink-0 transition-transform ${
                        lobbyMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {lobbyMenuOpen && (
                    <div
                      role="listbox"
                      className="absolute right-0 left-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-ca-border bg-ca-surface-2 shadow-[var(--ca-shadow)] p-1.5"
                    >
                      {lobbies.map((lobby) => {
                        const selected = activeLobby?.id === lobby.id;
                        return (
                          <button
                            key={lobby.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              selectLobby(lobby.id);
                              setLobbyMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                              selected
                                ? 'bg-ca-brand-soft text-ca-ink'
                                : 'text-ca-ink hover:bg-ca-surface-hover'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] font-bold text-ca-brand shrink-0">
                                {lobby.code}
                              </span>
                              <span className="text-sm font-semibold truncate">{lobby.subject}</span>
                            </div>
                            <p className="text-[11px] text-ca-muted mt-0.5 line-clamp-1">{lobby.title}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeLobby ? (
              <div className="rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-5 h-5 text-ca-brand shrink-0" />
                    <h3 className="text-lg font-semibold text-ca-ink truncate">
                      {activeLobby.code}
                      <span className="text-ca-muted font-medium"> · {displayedSubmissions.length} files</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-2 rounded-xl bg-ca-brand-soft hover:bg-ca-brand text-ca-brand hover:text-ca-brand-ink text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => onSwitchToStudentView(activeLobby.code)}
                      className="px-3 py-2 rounded-xl bg-ca-surface-2 hover:bg-ca-surface-hover text-ca-ink border border-ca-border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-ca-brand" />
                      <span>Test as Student</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-ca-faint absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Student ID, filename, or language..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-ca-surface-2 border border-ca-border text-ca-ink placeholder:text-ca-faint text-sm focus:outline-none focus:border-ca-brand"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-ca-surface-2 p-1 rounded-xl border border-ca-border text-xs">
                    {(['All', 'High', 'Medium', 'Low'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRiskFilter(r)}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                          riskFilter === r ? 'bg-ca-brand text-ca-brand-ink' : 'text-ca-muted hover:text-ca-ink'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-ca-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-ca-surface-2 text-ca-muted text-[11px] font-medium tracking-wide border-b border-ca-border">
                      <tr>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">File name</th>
                        <th className="py-3 px-4">Language</th>
                        <th className="py-3 px-4">AI prediction</th>
                        <th className="py-3 px-4">Risk</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ca-border bg-ca-surface-2/60">
                      {displayedSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-ca-faint text-sm">
                            No submissions match these filters.
                          </td>
                        </tr>
                      ) : (
                        displayedSubmissions.map((sub) => {
                          const prob = sub.aiProbability !== null ? sub.aiProbability : 0;
                          const probPercent = (prob * 100).toFixed(1);

                          return (
                            <tr key={sub.id} className="hover:bg-ca-surface-hover/60 transition-colors">
                              <td className="py-3 px-4 font-mono font-semibold text-ca-ink">{sub.studentId}</td>
                              <td className="py-3 px-4 font-mono text-ca-muted text-xs">{sub.fileName}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-md bg-ca-bg-elevated text-ca-muted font-mono text-[10px] uppercase">
                                  .{sub.language}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1.5">
                                  <span className="text-xs font-mono font-semibold text-ca-ink">{probPercent}%</span>
                                  <div className="w-24 h-1.5 rounded-full bg-ca-bg-elevated overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        sub.riskLevel === 'High'
                                          ? 'bg-ca-danger'
                                          : sub.riskLevel === 'Medium'
                                            ? 'bg-ca-warn'
                                            : 'bg-ca-ok'
                                      }`}
                                      style={{ width: `${Math.min(100, prob * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wide ${
                                    sub.riskLevel === 'High'
                                      ? 'bg-ca-danger-soft text-ca-danger'
                                      : sub.riskLevel === 'Medium'
                                        ? 'bg-ca-brand-soft text-ca-brand'
                                        : 'bg-ca-ok-soft text-ca-ok'
                                  }`}
                                >
                                  {sub.riskLevel || 'Analyzing'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-ca-muted font-mono text-xs">
                                {new Date(sub.submittedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setInspectedSubmission(sub)}
                                  className="px-2.5 py-1.5 rounded-lg bg-ca-surface hover:bg-ca-brand hover:text-ca-brand-ink text-ca-muted border border-ca-border text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 rounded-xl bg-ca-brand-soft text-sm text-ca-muted flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-ca-brand shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-ca-brand font-semibold">Instructor guidance:</strong> scores
                    are probabilities for review support, not proof of dishonesty.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md text-ca-muted">
                <h3 className="text-lg font-bold font-display text-ca-ink mb-2">No lobby selected</h3>
                <p className="text-sm mb-5">Create a lobby first to review student submissions.</p>
                <button onClick={() => setShowCreateModal(true)} className="ca-btn-primary mx-auto">
                  Create exam lobby
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ca-overlay backdrop-blur-sm ca-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-ca-border bg-ca-bg p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-ca-border pb-4">
              <div>
                <h3 className="text-lg font-black text-ca-ink">Generate Exam Lobby</h3>
                <p className="text-xs text-ca-muted">Configure subject, student limit, and upload rules.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-ca-muted hover:text-ca-ink hover:bg-ca-bg-elevated cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLobbySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                  Subject / Course Code <span className="text-ca-brand">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. CS 111: Computer Programming 1"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-ca-surface-2 border border-ca-border text-ca-ink placeholder:text-ca-faint text-xs focus:outline-none focus:border-ca-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                  Exam Title / Section <span className="text-ca-brand">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Practical Exam - Room 302"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-ca-surface-2 border border-ca-border text-ca-ink placeholder:text-ca-faint text-xs focus:outline-none focus:border-ca-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                    Max Student Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-ca-surface-2 border border-ca-border text-ca-ink text-xs focus:outline-none focus:border-ca-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="480"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-ca-surface-2 border border-ca-border text-ca-ink text-xs focus:outline-none focus:border-ca-brand"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-ca-brand-soft border border-ca-border text-xs text-ca-brand flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Upload restriction: Exactly up to 3 uploads per student in this lobby.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-ca-surface-2 hover:bg-ca-bg-elevated text-ca-muted text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-ca-brand hover:bg-ca-brand-hover text-ca-brand-ink font-black text-xs cursor-pointer"
                >
                  Generate Lobby & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDatasetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ca-overlay backdrop-blur-sm ca-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl border border-ca-border bg-ca-bg p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ca-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-ca-ink">Hugging Face Human Datasets & ML Pipeline</h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-ca-brand-soft text-ca-brand border border-ca-border font-bold">
                    CodeBERT Frozen
                  </span>
                </div>
                <p className="text-xs text-ca-muted mt-1">
                  Human-written baseline datasets and classifier head training for C, Java, and Python.
                </p>
              </div>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="p-1.5 rounded-lg text-ca-muted hover:text-ca-ink hover:bg-ca-bg-elevated cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ca-muted">
                1. Connected Hugging Face Human Datasets
              </h4>
              <div className="grid sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-ca-surface-2 border border-ca-border space-y-1.5">
                  <span className="text-ca-ok font-bold block text-sm">Python Human</span>
                  <div className="text-ca-muted text-[11px]"><code>code_search_net</code></div>
                  <div className="text-ca-faint text-[10px]">subset: "python"</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-ca-surface-2 border border-ca-border space-y-1.5">
                  <span className="text-ca-brand font-bold block text-sm">Java Human</span>
                  <div className="text-ca-muted text-[11px]"><code>code_search_net</code></div>
                  <div className="text-ca-faint text-[10px]">subset: "java"</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-ca-surface-2 border border-ca-border space-y-1.5">
                  <span className="text-ca-brand font-bold block text-sm">C Human</span>
                  <div className="text-ca-muted text-[11px]"><code>bigcode/the-stack</code></div>
                  <div className="text-ca-faint text-[10px]">data_dir: "data/c"</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDatasetModal(false)}
                className="px-5 py-2.5 rounded-xl bg-ca-brand hover:bg-ca-brand-hover text-ca-brand-ink font-black text-xs cursor-pointer"
              >
                Close Pipeline Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      <CodeModal submission={inspectedSubmission} onClose={() => setInspectedSubmission(null)} />
    </div>
  );
};
