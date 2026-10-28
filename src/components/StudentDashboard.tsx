import React, { useState } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Terminal,
  FileText,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { Language, Lobby, Submission } from '../types';
import { checkContext, EXT_TO_LANG, MIN_TOKENS, analyzeCode } from '../utils/aiDetector';
import { SAMPLE_CODES } from '../utils/storage';

interface StudentDashboardProps {
  lobbies: Lobby[];
  submissions: Submission[];
  initialLobbyCode?: string;
  onAddSubmissions: (newSubmissions: Submission[]) => void;
}

interface StagedFile {
  name: string;
  code: string;
  language: Language;
  size: number;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  lobbies,
  submissions,
  initialLobbyCode = '',
  onAddSubmissions,
}) => {
  const [lobbyCode, setLobbyCode] = useState(initialLobbyCode || (lobbies[0]?.code || ''));
  const [studentId, setStudentId] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    studentId: string;
    lobbyTitle: string;
    fileCount: number;
    submittedAt: string;
  } | null>(null);

  // Find lobby by entered code
  const activeLobby = lobbies.find(
    (l) => l.code.toUpperCase().trim() === lobbyCode.toUpperCase().trim()
  );

  // Calculate how many files this student already submitted to this lobby
  const studentExistingCount = (activeLobby && studentId.trim())
    ? submissions.filter(
        (s) =>
          s.lobbyId === activeLobby.id &&
          s.studentId.toLowerCase().trim() === studentId.toLowerCase().trim()
      ).length
    : 0;

  const remainingQuota = Math.max(0, 3 - studentExistingCount);

  // Common student ID shortcuts requested in prompt (221, 222, 223, 224, 225, 226)
  const quickStudentIds = ['221', '222', '223', '224', '225', '226'];

  const validateAndAddFile = (fileName: string, content: string, sizeBytes: number) => {
    setErrorMsg(null);
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();

    // 1. Strict extension validation: only .py, .java, .c
    if (!EXT_TO_LANG[ext]) {
      setErrorMsg(
        `File '${fileName}' has an invalid extension. Only Python (.py), Java (.java), and C (.c) are accepted.`
      );
      return;
    }

    const language = EXT_TO_LANG[ext];

    // 2. Maximum size check: 200 KB
    if (sizeBytes > 200 * 1024) {
      setErrorMsg(`File '${fileName}' exceeds the maximum allowed size of 200 KB.`);
      return;
    }

    // 3. Context check (tokens >= 30)
    try {
      checkContext(content, language);
    } catch (err: any) {
      setErrorMsg(err.message || 'Source code is too short for laboratory verification.');
      return;
    }

    // 4. Up to 3 uploads per student quota
    if (stagedFiles.length + 1 > remainingQuota) {
      setErrorMsg(
        `You can only submit up to 3 files total per lobby. You have already uploaded ${studentExistingCount} and can only add ${remainingQuota} more.`
      );
      return;
    }

    // Avoid duplicate filenames
    if (stagedFiles.some((f) => f.name.toLowerCase() === fileName.toLowerCase())) {
      setErrorMsg(`A file named '${fileName}' has already been added.`);
      return;
    }

    setStagedFiles((prev) => [
      ...prev,
      {
        name: fileName,
        code: content,
        language,
        size: sizeBytes,
      },
    ]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        validateAndAddFile(file.name, text, file.size);
      };
      reader.readAsText(file);
    });

    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files) return;

    Array.from(e.dataTransfer.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        validateAndAddFile(file.name, text, file.size);
      };
      reader.readAsText(file);
    });
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  // Sample code loader for instant student test
  const handleLoadSample = (type: 'python_ai' | 'python_human' | 'c_ai' | 'java_human') => {
    if (stagedFiles.length >= remainingQuota) {
      setErrorMsg(`Cannot add more files: maximum 3 files per student quota reached.`);
      return;
    }

    if (type === 'python_ai') {
      validateAndAddFile('binary_search.py', SAMPLE_CODES.python_ai, SAMPLE_CODES.python_ai.length);
    } else if (type === 'python_human') {
      validateAndAddFile('searchNum.py', SAMPLE_CODES.python_human, SAMPLE_CODES.python_human.length);
    } else if (type === 'c_ai') {
      validateAndAddFile('matrix_mult.c', SAMPLE_CODES.c_ai, SAMPLE_CODES.c_ai.length);
    } else if (type === 'java_human') {
      validateAndAddFile('ScoreCalculator.java', SAMPLE_CODES.java_human, SAMPLE_CODES.java_human.length);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeLobby) {
      setErrorMsg('Invalid exam lobby code. Please enter a valid lobby code.');
      return;
    }

    if (activeLobby.status === 'LOCKED') {
      setErrorMsg('This exam session is locked by the instructor. Submissions are closed.');
      return;
    }

    const cleanId = studentId.trim();
    if (!cleanId) {
      setErrorMsg('Please input your Student ID Number (e.g. 221, 222, 223...).');
      return;
    }

    if (stagedFiles.length === 0) {
      setErrorMsg('Please attach at least 1 source file (.c, .java, or .py).');
      return;
    }

    if (stagedFiles.length > remainingQuota) {
      setErrorMsg(
        `Upload limit exceeded! You may submit at most 3 files per exam lobby (remaining: ${remainingQuota}).`
      );
      return;
    }

    setIsSubmitting(true);

    // Simulate analysis queue
    setTimeout(() => {
      const newSubmissions: Submission[] = stagedFiles.map((f, idx) => {
        const analysis = analyzeCode(f.code, f.name);
        return {
          id: `sub-${Date.now()}-${idx}`,
          lobbyId: activeLobby.id,
          studentId: cleanId,
          fileName: f.name,
          language: f.language,
          sourceCode: f.code,
          status: 'done',
          aiProbability: analysis.aiProbability,
          riskLevel: analysis.riskLevel,
          tokenCount: analysis.tokenCount,
          indicators: analysis.indicators,
          submittedAt: new Date().toISOString(),
        };
      });

      onAddSubmissions(newSubmissions);
      setIsSubmitting(false);
      setSuccessReceipt({
        studentId: cleanId,
        lobbyTitle: `${activeLobby.subject} (${activeLobby.title})`,
        fileCount: stagedFiles.length,
        submittedAt: new Date().toLocaleTimeString(),
      });
      setStagedFiles([]);
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-stone-800 bg-gradient-to-r from-stone-950 via-stone-900 to-orange-950/40 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-orange-400 uppercase tracking-wider mb-2">
          <Terminal className="w-4 h-4" />
          <span>CCIS Student Examination Upload Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Upload Examination Source Code
        </h1>
        <p className="text-xs text-stone-300 mt-1">
          Enter your Lobby Code, your Student ID, and upload up to 3 source files (<code className="text-orange-400">.py</code>, <code className="text-orange-400">.java</code>, <code className="text-orange-400">.c</code>).
        </p>
      </div>

      {/* Success Receipt Banner */}
      {successReceipt && (
        <div className="p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 space-y-3 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Submission Successfully Received!</h3>
              <p className="text-xs text-emerald-400/90">
                Your examination source code has been transmitted directly to the instructor's live dashboard.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800/80 text-xs font-mono text-stone-300 grid sm:grid-cols-2 gap-2">
            <div>
              <span className="text-stone-500 block">Student ID:</span>
              <strong className="text-orange-400">{successReceipt.studentId}</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Exam Session:</span>
              <span className="text-white truncate block">{successReceipt.lobbyTitle}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Files Uploaded:</span>
              <span className="text-white">{successReceipt.fileCount} file(s)</span>
            </div>
            <div>
              <span className="text-stone-500 block">Timestamp:</span>
              <span className="text-white">{successReceipt.submittedAt}</span>
            </div>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Note: In accordance with university protocol, AI scores are never displayed on student portals.</span>
          </div>

          <button
            onClick={() => setSuccessReceipt(null)}
            className="text-xs underline text-emerald-400 font-bold hover:text-emerald-300 block pt-1"
          >
            Submit additional file or new submission
          </button>
        </div>
      )}

      {/* Main Submission Form */}
      <div className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 sm:p-8 shadow-xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Lobby Code Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
              1. Enter Lobby Code or Generated Link <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={lobbyCode}
                onChange={(e) => {
                  setLobbyCode(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                placeholder="e.g. CARSU-1 or ALGO-99"
                required
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono font-bold text-sm tracking-widest uppercase focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Quick Lobby Selectors */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-stone-500 font-medium">Available Lobbies:</span>
              {lobbies.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => {
                    setLobbyCode(l.code);
                    setErrorMsg(null);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold transition-all ${
                    lobbyCode.toUpperCase() === l.code
                      ? 'bg-orange-600 text-stone-950 shadow-sm'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {l.code} ({l.status})
                </button>
              ))}
            </div>

            {/* Lobby Status feedback */}
            {activeLobby ? (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  activeLobby.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div>
                  <span className="font-bold">{activeLobby.subject}</span>
                  <span className="block text-[11px] text-stone-400">{activeLobby.title}</span>
                </div>
                <span className="font-mono font-black uppercase text-[10px] px-2 py-0.5 rounded bg-stone-950">
                  {activeLobby.status}
                </span>
              </div>
            ) : lobbyCode.trim() ? (
              <div className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>No active exam lobby found with code "{lobbyCode}".</span>
              </div>
            ) : null}
          </div>

          {/* Step 2: Student ID Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
              2. Student ID Number <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="e.g. 221, 222, 223, 224, 225, 226 or 221-0045"
              required
              className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-white font-mono text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />

            {/* Prompt Quick Selection for 221, 222, 223, 224, 225, 226 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-stone-500">Quick ID Input:</span>
              {quickStudentIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setStudentId(id)}
                  className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold transition-colors ${
                    studentId === id
                      ? 'bg-orange-600 text-stone-950'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>

            {/* Quota Banner */}
            {activeLobby && studentId.trim() && (
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs flex items-center justify-between text-stone-300 font-mono">
                <span>Uploads quota in this lobby:</span>
                <span className="font-bold text-orange-400">
                  {studentExistingCount} / 3 used ({remainingQuota} remaining)
                </span>
              </div>
            )}
          </div>

          {/* Step 3: Source Code Upload Area (1 to 3 files: .c, .java, .py) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300">
                3. Attach Source Files (.py, .java, .c only)
              </label>
              <span className="text-xs font-mono text-stone-400">
                {stagedFiles.length} / {Math.min(3, remainingQuota)} staged (Max 3 total)
              </span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative p-6 sm:p-8 rounded-2xl border-2 border-dashed border-stone-800 hover:border-orange-500/60 bg-stone-950 text-center transition-all cursor-pointer group"
              onClick={() => document.getElementById('student-file-input')?.click()}
            >
              <input
                id="student-file-input"
                type="file"
                multiple
                accept=".py,.java,.c"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-500 border border-orange-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Drag and drop your code files or click to browse
              </h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Only <strong className="text-orange-400">.py</strong>, <strong className="text-orange-400">.java</strong>, and <strong className="text-orange-400">.c</strong> files accepted. Max 200 KB each (min 30 tokens).
              </p>
            </div>

            {/* Demo Templates Helper for quick testing */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-stone-500">Quick Test Samples:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('python_ai')}
                className="px-2 py-1 rounded bg-stone-950 text-stone-300 hover:text-orange-400 border border-stone-800 font-mono text-[11px]"
              >
                + Python (Binary Search)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('python_human')}
                className="px-2 py-1 rounded bg-stone-950 text-stone-300 hover:text-orange-400 border border-stone-800 font-mono text-[11px]"
              >
                + Python (Student Lab)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('c_ai')}
                className="px-2 py-1 rounded bg-stone-950 text-stone-300 hover:text-orange-400 border border-stone-800 font-mono text-[11px]"
              >
                + C (Matrix Multiply)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('java_human')}
                className="px-2 py-1 rounded bg-stone-950 text-stone-300 hover:text-orange-400 border border-stone-800 font-mono text-[11px]"
              >
                + Java (Grade Calc)
              </button>
            </div>

            {/* Staged Files List */}
            {stagedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-stone-400 uppercase">
                  Files ready to submit ({stagedFiles.length}):
                </div>
                {stagedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <div className="font-mono font-bold text-white">{file.name}</div>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {file.language.toUpperCase()} • {Math.round(file.size)} bytes
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagedFile(idx)}
                      className="p-1 rounded-lg text-stone-500 hover:text-rose-400 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={
              isSubmitting ||
              stagedFiles.length === 0 ||
              !studentId.trim() ||
              !activeLobby ||
              activeLobby.status === 'LOCKED' ||
              remainingQuota === 0
            }
            className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-black text-sm tracking-wide shadow-xl shadow-orange-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Encrypting & Transmitting Code...</span>
            ) : (
              <>
                <span>Submit {stagedFiles.length} File(s) for Grading</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
