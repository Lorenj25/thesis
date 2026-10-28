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
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Eye,
  RefreshCw,
  ExternalLink,
  Shield,
  BookOpen,
} from 'lucide-react';
import { Instructor, Lobby, RiskLevel, Submission } from '../types';
import { CodeModal } from './CodeModal';

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
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  instructor,
  lobbies,
  submissions,
  onCreateLobby,
  onToggleLock,
  onSwitchToStudentView,
}) => {
  const [selectedLobbyId, setSelectedLobbyId] = useState<string>(
    lobbies.length > 0 ? lobbies[0].id : ''
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [inspectedSubmission, setInspectedSubmission] = useState<Submission | null>(null);

  // Form states for creating a lobby
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [maxStudents, setMaxStudents] = useState(35);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | RiskLevel>('All');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeLobby = lobbies.find((l) => l.id === selectedLobbyId) || lobbies[0];

  // Submissions filtered by active lobby
  const lobbySubmissions = submissions.filter(
    (s) => s.lobbyId === (activeLobby ? activeLobby.id : '')
  );

  // Filtered by search and risk level
  const displayedSubmissions = lobbySubmissions.filter((sub) => {
    const matchesSearch =
      sub.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.language.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'All' || sub.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  // Calculate statistics
  const uniqueStudents = new Set(lobbySubmissions.map((s) => s.studentId)).size;
  const highRiskCount = lobbySubmissions.filter((s) => s.riskLevel === 'High').length;
  const mediumRiskCount = lobbySubmissions.filter((s) => s.riskLevel === 'Medium').length;
  const lowRiskCount = lobbySubmissions.filter((s) => s.riskLevel === 'Low').length;

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

  return (
    <div className="space-y-8 py-2">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
              Faculty Instructor
            </span>
            <span className="text-xs text-stone-400">ID: {instructor.idNumber}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Exam Lobby Management Console
          </h1>
          <p className="text-xs text-stone-400">
            Generate exam links, configure access limits (max 3 uploads/student), and review live AI predictions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDatasetModal(true)}
            className="px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 hover:border-orange-500/50 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-orange-400" />
            <span>Hugging Face Datasets</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-sm tracking-wide shadow-lg shadow-orange-600/30 flex items-center gap-2 self-start md:self-auto transition-all cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Generate New Lobby</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Lobby Navigation & Live Monitoring */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar: Lobbies List */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Examination Lobbies ({lobbies.length})
              </h2>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {lobbies.map((lobby) => {
                const isSelected = activeLobby && activeLobby.id === lobby.id;
                const isLocked = lobby.status === 'LOCKED';
                const subCount = submissions.filter((s) => s.lobbyId === lobby.id).length;

                return (
                  <div
                    key={lobby.id}
                    onClick={() => setSelectedLobbyId(lobby.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-950 border-orange-500 shadow-md shadow-orange-500/10'
                        : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                            {lobby.code}
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-[170px]">
                            {lobby.subject}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">{lobby.title}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isLocked
                            ? 'bg-stone-800 text-stone-400 border border-stone-700'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {lobby.status}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                      <span>Max {lobby.maxStudents} Students</span>
                      <span>{subCount} Files (Max 3/stu)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Area: Selected Lobby Live Detail */}
        <div className="lg:col-span-8 space-y-6">
          {activeLobby ? (
            <>
              {/* Lobby Status & Access Details Card */}
              <div className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-black text-orange-400 bg-orange-500/20 border border-orange-500/40 px-2.5 py-1 rounded-lg">
                        CODE: {activeLobby.code}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg border ${
                          activeLobby.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-stone-800 text-stone-400 border-stone-700'
                        }`}
                      >
                        {activeLobby.status}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                        Up to 3 Uploads / Student
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
                      {activeLobby.subject}
                    </h2>
                    <p className="text-xs text-stone-400">{activeLobby.title}</p>
                  </div>

                  {/* Quick Controls: Copy Code, Link, Lock/Unlock */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Copy 6-character Lobby Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-orange-400" />}
                      <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Copy Direct Submission Link"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5 text-orange-400" />}
                      <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
                    </button>

                    <button
                      onClick={() => onToggleLock(activeLobby.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        activeLobby.status === 'ACTIVE'
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {activeLobby.status === 'ACTIVE' ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Lock Lobby</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Unlock Lobby</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Live Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                      Students Joined
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white font-mono">{uniqueStudents}</span>
                      <span className="text-xs text-stone-500 font-mono">/ {activeLobby.maxStudents} max</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                      Total Files
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-orange-400 font-mono">
                        {lobbySubmissions.length}
                      </span>
                      <span className="text-xs text-stone-500">uploaded</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                      High AI Risk
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-rose-400 font-mono">{highRiskCount}</span>
                      <span className="text-xs text-stone-500">(&ge; 70%)</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
                    <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block">
                      Med / Low Risk
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-black text-orange-400 font-mono">{mediumRiskCount}M</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">{lowRiskCount}L</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submissions Table & Filters */}
              <div className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-orange-500" />
                      <span>Live Student Submissions ({displayedSubmissions.length})</span>
                    </h3>
                    <p className="text-xs text-stone-400">
                      CodeBERT AI predictions calibrated for live lab exam grading.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-stone-950 border border-orange-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Grade CSV</span>
                    </button>
                    <button
                      onClick={() => onSwitchToStudentView(activeLobby.code)}
                      className="px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Users className="w-3.5 h-3.5 text-orange-400" />
                      <span>Test as Student</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Student ID (e.g. 221, 222...), filename, or language..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
                    {(['All', 'High', 'Medium', 'Low'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRiskFilter(r)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          riskFilter === r
                            ? 'bg-orange-600 text-stone-950 shadow-sm'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-stone-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-950 text-stone-400 uppercase text-[10px] font-bold tracking-wider border-b border-stone-800">
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
                    <tbody className="divide-y divide-stone-800/80 bg-stone-950/40">
                      {displayedSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-stone-500">
                            No student submissions found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        displayedSubmissions.map((sub) => {
                          const prob = sub.aiProbability !== null ? sub.aiProbability : 0;
                          const probPercent = (prob * 100).toFixed(1);

                          return (
                            <tr key={sub.id} className="hover:bg-stone-900/60 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-white">
                                {sub.studentId}
                              </td>
                              <td className="py-3 px-4 font-mono text-stone-300">
                                {sub.fileName}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 font-mono text-[10px] uppercase">
                                  .{sub.language}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="font-bold text-white">{probPercent}%</span>
                                  </div>
                                  <div className="w-24 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        sub.riskLevel === 'High'
                                          ? 'bg-rose-500'
                                          : sub.riskLevel === 'Medium'
                                          ? 'bg-orange-500'
                                          : 'bg-emerald-500'
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
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : sub.riskLevel === 'Medium'
                                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  }`}
                                >
                                  {sub.riskLevel || 'ANALYZING'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-stone-400 font-mono text-[11px]">
                                {new Date(sub.submittedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setInspectedSubmission(sub)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-orange-600 hover:text-stone-950 text-stone-300 border border-stone-800 text-xs font-semibold flex items-center gap-1 ml-auto transition-all"
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

                {/* Academic Ethics Footer */}
                <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-600/30 text-xs text-stone-400 flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>
                    <strong>Instructor Guidance:</strong> CodeAuthentic predictions represent statistical CodeBERT token distribution deviations. Verify through code comprehension interviews before recording formal penalties.
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center rounded-3xl border border-stone-800 bg-stone-900/60 text-stone-400">
              <h3 className="text-lg font-bold text-white mb-2">No Lobbies Found</h3>
              <p className="text-xs mb-4">Click "Generate New Lobby" above to create an exam session.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-xl bg-orange-600 text-stone-950 font-bold text-xs"
              >
                Create Exam Lobby
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Lobby Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-stone-800 bg-stone-950 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Generate Exam Lobby</h3>
                <p className="text-xs text-stone-400">Configure subject, student limit, and upload rules.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLobbySubmit} className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Subject / Course Code <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. CS 111: Computer Programming 1"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Exam Title / Section <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Practical Exam - Room 302"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-white placeholder-stone-500 text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Grid: Max Students & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    Max Student Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">Laboratory capacity.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="480"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">Auto-locks at expiry.</span>
                </div>
              </div>

              {/* Rule reminder */}
              <div className="p-3 rounded-xl bg-orange-600/10 border border-orange-500/20 text-xs text-orange-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Upload restriction: Exactly up to 3 uploads per student in this lobby.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-xs shadow-md"
                >
                  Generate Lobby & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dataset & Hugging Face Training Pipeline Modal */}
      {showDatasetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-3xl border border-stone-800 bg-stone-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">Hugging Face Human Datasets & ML Pipeline</h3>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold">
                    CodeBERT Frozen
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Human-written baseline datasets and classifier head training for C, Java, and Python.
                </p>
              </div>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            {/* Hugging Face Datasets Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                1. Connected Hugging Face Human Datasets
              </h4>

              <div className="grid sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 space-y-1.5">
                  <span className="text-emerald-400 font-bold block text-sm">Python Human</span>
                  <div className="text-stone-300 text-[11px]"><code>code_search_net</code></div>
                  <div className="text-stone-500 text-[10px]">subset: "python" (functions + docstrings)</div>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Streamed / Cleaned
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 space-y-1.5">
                  <span className="text-orange-400 font-bold block text-sm">Java Human</span>
                  <div className="text-stone-300 text-[11px]"><code>code_search_net</code></div>
                  <div className="text-stone-500 text-[10px]">subset: "java" (methods + docstrings)</div>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Streamed / Cleaned
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 space-y-1.5">
                  <span className="text-blue-400 font-bold block text-sm">C Human</span>
                  <div className="text-stone-300 text-[11px]"><code>bigcode/the-stack</code></div>
                  <div className="text-stone-500 text-[10px]">data_dir: "data/c" (streaming)</div>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    HF Token Authenticated
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Extraction & Head Training Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                2. Representation & Classifier Architecture (Thesis Specification)
              </h4>
              <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 space-y-2">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Feature Vector:</span>
                  <strong className="text-white font-mono">770 values (768 mean-pooled hidden + 2 perplexity)</strong>
                </div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Chunking Strategy:</span>
                  <span className="text-white font-mono">510 tokens/chunk (max 8 chunks with [CLS]/[SEP])</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">Stratified Split:</span>
                  <span className="text-white font-mono">70% Train, 15% Validation, 15% Test</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Classifier Head:</span>
                  <span className="text-orange-400 font-mono">StandardScaler + LogisticRegression (Joblib)</span>
                </div>
              </div>
            </div>

            {/* Run Commands */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                3. CLI Execution Commands
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-stone-500 block mb-1"># Step A: Download human dataset from Hugging Face</span>
                  <code className="text-emerald-400 select-all">python -m ml.fetch_dataset --language all --samples 500</code>
                </div>

                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-stone-500 block mb-1"># Step B: Train classifier head on dataset/&lt;language&gt;</span>
                  <code className="text-orange-400 select-all">python -m ml.train_head --language python --data dataset/python</code>
                </div>

                <div className="p-3 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-stone-500 block mb-1"># Step C: Score single file</span>
                  <code className="text-blue-400 select-all">python -m ml.demo --file sample.py</code>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDatasetModal(false)}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-black text-xs"
              >
                Close Pipeline Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Inspector Modal */}
      <CodeModal
        submission={inspectedSubmission}
        onClose={() => setInspectedSubmission(null)}
      />
    </div>
  );
};
