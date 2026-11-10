import React, { useState } from 'react';
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

  const activeLobby = lobbies.find((l) => l.id === selectedLobbyId) || lobbies[0];

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
    <div className="flex flex-col lg:flex-row gap-6 py-2 min-h-[70vh]">
      <aside className="lg:w-60 shrink-0">
        <div className="lg:sticky lg:top-24 rounded-2xl border border-ca-border bg-ca-surface p-3 sm:p-4 flex flex-col gap-1.5 min-h-full">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ca-border pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-ca-brand-soft text-ca-brand border border-ca-border font-bold">
                    Faculty Instructor
                  </span>
                  <span className="text-xs text-ca-muted">ID: {instructor.idNumber}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-ca-ink mt-1">
                  Exam Lobby Management Console
                </h1>
                <p className="text-xs text-ca-muted">
                  Overview of lobbies, uploads, and AI risk across your exam sessions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDatasetModal(true)}
                  className="px-4 py-3 rounded-xl bg-ca-surface-2 hover:bg-ca-bg-elevated text-ca-ink border border-ca-border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-ca-brand" />
                  <span>Hugging Face Datasets</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-3 rounded-xl bg-ca-brand hover:bg-ca-brand-hover text-ca-brand-ink font-black text-sm tracking-wide flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Generate New Lobby</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-ca-surface border border-ca-border">
                <span className="text-[11px] font-bold text-ca-muted uppercase tracking-wider block">Lobbies</span>
                <span className="mt-1 text-2xl font-black text-ca-ink font-mono">{lobbies.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-ca-surface border border-ca-border">
                <span className="text-[11px] font-bold text-ca-ok uppercase tracking-wider block">Active</span>
                <span className="mt-1 text-2xl font-black text-ca-ok font-mono">{activeLobbyCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-ca-surface border border-ca-border">
                <span className="text-[11px] font-bold text-ca-brand uppercase tracking-wider block">Total Files</span>
                <span className="mt-1 text-2xl font-black text-ca-brand font-mono">{submissions.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-ca-surface border border-ca-border">
                <span className="text-[11px] font-bold text-ca-danger uppercase tracking-wider block">High Risk</span>
                <span className="mt-1 text-2xl font-black text-ca-danger font-mono">{totalHighRisk}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-ca-border bg-ca-surface p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ca-ink font-display">Quick open lobbies</h2>
                <button
                  type="button"
                  onClick={() => setSection('lobbies')}
                  className="text-xs font-semibold text-ca-brand hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              {lobbies.length === 0 ? (
                <p className="text-xs text-ca-muted">No lobbies yet. Generate one to start an exam session.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {lobbies.slice(0, 4).map((lobby) => (
                    <button
                      key={lobby.id}
                      type="button"
                      onClick={() => {
                        selectLobby(lobby.id);
                        setSection('lobbies');
                      }}
                      className="text-left p-3.5 rounded-xl border border-ca-border bg-ca-bg hover:border-ca-brand transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-ca-brand bg-ca-brand-soft px-1.5 py-0.5 rounded border border-ca-border">
                          {lobby.code}
                        </span>
                        <span className="text-xs font-bold text-ca-ink truncate">{lobby.subject}</span>
                      </div>
                      <p className="text-[11px] text-ca-muted mt-1 line-clamp-1">{lobby.title}</p>
                    </button>
                  ))}
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
                <p className="text-xs text-ca-muted">Create lobbies, share codes, and lock exam access.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 rounded-xl bg-ca-brand hover:bg-ca-brand-hover text-ca-brand-ink font-black text-sm flex items-center gap-2 self-start transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Generate New Lobby</span>
              </button>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 rounded-2xl border border-ca-border bg-ca-surface p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ca-muted">
                  Examination Lobbies ({lobbies.length})
                </h2>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {lobbies.map((lobby) => {
                    const isSelected = activeLobby && activeLobby.id === lobby.id;
                    const isLocked = lobby.status === 'LOCKED';
                    const subCount = submissions.filter((s) => s.lobbyId === lobby.id).length;

                    return (
                      <div
                        key={lobby.id}
                        onClick={() => selectLobby(lobby.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-ca-bg border-ca-brand'
                            : 'bg-ca-bg-elevated border-ca-border hover:border-ca-border-strong hover:bg-ca-bg'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-ca-brand bg-ca-brand-soft px-1.5 py-0.5 rounded border border-ca-border">
                                {lobby.code}
                              </span>
                              <span className="text-xs font-bold text-ca-ink truncate max-w-[170px]">
                                {lobby.subject}
                              </span>
                            </div>
                            <p className="text-[11px] text-ca-muted mt-1 line-clamp-1">{lobby.title}</p>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isLocked
                                ? 'bg-ca-bg-elevated text-ca-muted border border-ca-border-strong'
                                : 'bg-ca-ok-soft text-ca-ok border border-ca-border'
                            }`}
                          >
                            {lobby.status}
                          </span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-ca-border/80 flex items-center justify-between text-[11px] text-ca-muted font-mono">
                          <span>Max {lobby.maxStudents} Students</span>
                          <span>{subCount} Files</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-8">
                {activeLobby ? (
                  <div className="rounded-3xl border border-ca-border bg-ca-surface p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-ca-border pb-5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-black text-ca-brand bg-ca-brand-soft border border-ca-border px-2.5 py-1 rounded-lg">
                            CODE: {activeLobby.code}
                          </span>
                          <span
                            className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg border ${
                              activeLobby.status === 'ACTIVE'
                                ? 'bg-ca-ok-soft text-ca-ok border-ca-border'
                                : 'bg-ca-bg-elevated text-ca-muted border-ca-border-strong'
                            }`}
                          >
                            {activeLobby.status}
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-ca-bg-elevated text-ca-muted border border-ca-border-strong font-mono">
                            Up to 3 Uploads / Student
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-ca-ink pt-1">{activeLobby.subject}</h2>
                        <p className="text-xs text-ca-muted">{activeLobby.title}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleCopyCode}
                          className="px-3 py-2 rounded-xl bg-ca-bg hover:bg-ca-bg-elevated text-ca-ink border border-ca-border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-ca-ok" /> : <Copy className="w-3.5 h-3.5 text-ca-brand" />}
                          <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
                        </button>
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-2 rounded-xl bg-ca-bg hover:bg-ca-bg-elevated text-ca-ink border border-ca-border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-ca-ok" /> : <ExternalLink className="w-3.5 h-3.5 text-ca-brand" />}
                          <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
                        </button>
                        <button
                          onClick={() => onToggleLock(activeLobby.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            activeLobby.status === 'ACTIVE'
                              ? 'bg-ca-danger-soft text-ca-danger border border-ca-border'
                              : 'bg-ca-ok-soft text-ca-ok border border-ca-border'
                          }`}
                        >
                          {activeLobby.status === 'ACTIVE' ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock Lobby</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock Lobby</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-ca-bg border border-ca-border">
                        <span className="text-[11px] font-bold text-ca-muted uppercase tracking-wider block">Students Joined</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-ca-ink font-mono">{uniqueStudents}</span>
                          <span className="text-xs text-ca-faint font-mono">/ {activeLobby.maxStudents}</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-ca-bg border border-ca-border">
                        <span className="text-[11px] font-bold text-ca-muted uppercase tracking-wider block">Total Files</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-ca-brand font-mono">{lobbySubmissions.length}</span>
                          <span className="text-xs text-ca-faint">uploaded</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-ca-bg border border-ca-border">
                        <span className="text-[11px] font-bold text-ca-danger uppercase tracking-wider block">High AI Risk</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-ca-danger font-mono">{highRiskCount}</span>
                          <span className="text-xs text-ca-faint">(&ge; 70%)</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-ca-bg border border-ca-border">
                        <span className="text-[11px] font-bold text-ca-brand uppercase tracking-wider block">Med / Low Risk</span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-black text-ca-brand font-mono">{mediumRiskCount}M</span>
                          <span className="text-xl font-black text-ca-ok font-mono">{lowRiskCount}L</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSection('submissions')}
                      className="text-xs font-semibold text-ca-brand hover:underline cursor-pointer"
                    >
                      Open live student submissions for this lobby →
                    </button>
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-3xl border border-ca-border bg-ca-surface text-ca-muted">
                    <h3 className="text-lg font-bold text-ca-ink mb-2">No Lobbies Found</h3>
                    <p className="text-xs mb-4">Click Generate New Lobby to create an exam session.</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-ca-brand text-ca-brand-ink font-bold text-xs cursor-pointer"
                    >
                      Create Exam Lobby
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {section === 'submissions' && (
          <div className="space-y-6 ca-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold font-display text-ca-ink">Live Student Submissions</h1>
                <p className="text-xs text-ca-muted">
                  CodeBERT AI predictions calibrated for live lab exam grading.
                </p>
              </div>
              {lobbies.length > 0 && (
                <label className="text-xs text-ca-muted flex flex-col gap-1">
                  <span className="font-bold uppercase tracking-wider">Lobby</span>
                  <select
                    value={activeLobby?.id || ''}
                    onChange={(e) => selectLobby(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-ca-surface border border-ca-border text-ca-ink text-xs font-semibold focus:outline-none focus:border-ca-brand cursor-pointer"
                  >
                    {lobbies.map((lobby) => (
                      <option key={lobby.id} value={lobby.id}>
                        {lobby.code} — {lobby.subject}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {activeLobby ? (
              <div className="rounded-3xl border border-ca-border bg-ca-surface p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-ca-ink flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-ca-brand" />
                      <span>
                        {activeLobby.code} · {displayedSubmissions.length} files
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-2 rounded-xl bg-ca-brand-soft hover:bg-ca-brand text-ca-brand hover:text-ca-brand-ink border border-ca-border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Grade CSV</span>
                    </button>
                    <button
                      onClick={() => onSwitchToStudentView(activeLobby.code)}
                      className="px-3 py-2 rounded-xl bg-ca-bg hover:bg-ca-bg-elevated text-ca-muted border border-ca-border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-ca-brand" />
                      <span>Test as Student</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-ca-faint absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Student ID, filename, or language..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-ca-bg border border-ca-border text-ca-ink placeholder:text-ca-faint text-xs focus:outline-none focus:border-ca-brand"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-ca-bg p-1 rounded-xl border border-ca-border text-xs">
                    {(['All', 'High', 'Medium', 'Low'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRiskFilter(r)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          riskFilter === r ? 'bg-ca-brand text-ca-brand-ink' : 'text-ca-muted hover:text-ca-ink'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-ca-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ca-bg text-ca-muted uppercase text-[10px] font-bold tracking-wider border-b border-ca-border">
                      <tr>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">File Name</th>
                        <th className="py-3 px-4">Language</th>
                        <th className="py-3 px-4">AI Prediction</th>
                        <th className="py-3 px-4">Risk Level</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ca-border bg-ca-bg-elevated">
                      {displayedSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-ca-faint">
                            No student submissions found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        displayedSubmissions.map((sub) => {
                          const prob = sub.aiProbability !== null ? sub.aiProbability : 0;
                          const probPercent = (prob * 100).toFixed(1);

                          return (
                            <tr key={sub.id} className="hover:bg-ca-surface transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-ca-ink">{sub.studentId}</td>
                              <td className="py-3 px-4 font-mono text-ca-muted">{sub.fileName}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded bg-ca-bg-elevated text-ca-muted border border-ca-border-strong font-mono text-[10px] uppercase">
                                  .{sub.language}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="font-bold text-ca-ink">{probPercent}%</span>
                                  </div>
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
                                  className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide border ${
                                    sub.riskLevel === 'High'
                                      ? 'bg-ca-danger-soft text-ca-danger border-ca-border'
                                      : sub.riskLevel === 'Medium'
                                        ? 'bg-ca-brand-soft text-ca-brand border-ca-border'
                                        : 'bg-ca-ok-soft text-ca-ok border-ca-border'
                                  }`}
                                >
                                  {sub.riskLevel || 'ANALYZING'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-ca-muted font-mono text-[11px]">
                                {new Date(sub.submittedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setInspectedSubmission(sub)}
                                  className="px-2.5 py-1 rounded-lg bg-ca-surface-2 hover:bg-ca-brand hover:text-ca-brand-ink text-ca-muted border border-ca-border text-xs font-semibold flex items-center gap-1 ml-auto transition-all cursor-pointer"
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

                <div className="p-3.5 rounded-xl bg-ca-brand-soft border border-ca-border text-xs text-ca-muted flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-ca-brand shrink-0" />
                  <span>
                    <strong>Instructor Guidance:</strong> CodeAuthentic predictions represent statistical
                    CodeBERT token distribution deviations. Verify through code comprehension interviews
                    before recording formal penalties.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl border border-ca-border bg-ca-surface text-ca-muted">
                <h3 className="text-lg font-bold text-ca-ink mb-2">No lobby selected</h3>
                <p className="text-xs mb-4">Create a lobby first to review student submissions.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-ca-brand text-ca-brand-ink font-bold text-xs cursor-pointer"
                >
                  Create Exam Lobby
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
