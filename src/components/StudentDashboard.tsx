import React, { useState } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Terminal,
  X,
  Info,
} from 'lucide-react';
import { Language, Lobby, Submission } from '../types';
import { checkContext, EXT_TO_LANG, analyzeCode } from '../utils/aiDetector';
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

  const activeLobby = lobbies.find(
    (l) => l.code.toUpperCase().trim() === lobbyCode.toUpperCase().trim()
  );

  const studentExistingCount =
    activeLobby && studentId.trim()
      ? submissions.filter(
          (s) =>
            s.lobbyId === activeLobby.id &&
            s.studentId.toLowerCase().trim() === studentId.toLowerCase().trim()
        ).length
      : 0;

  const remainingQuota = Math.max(0, 3 - studentExistingCount);
  const quickStudentIds = ['221', '222', '223', '224', '225', '226'];

  const validateAndAddFile = (fileName: string, content: string, sizeBytes: number) => {
    setErrorMsg(null);
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();

    if (!EXT_TO_LANG[ext]) {
      setErrorMsg(
        `File '${fileName}' has an invalid extension. Only Python (.py), Java (.java), and C (.c) are accepted.`
      );
      return;
    }

    const language = EXT_TO_LANG[ext];

    if (sizeBytes > 200 * 1024) {
      setErrorMsg(`File '${fileName}' exceeds the maximum allowed size of 200 KB.`);
      return;
    }

    try {
      checkContext(content, language);
    } catch (err: any) {
      setErrorMsg(err.message || 'Source code is too short for laboratory verification.');
      return;
    }

    if (stagedFiles.length + 1 > remainingQuota) {
      setErrorMsg(
        `You can only submit up to 3 files total per lobby. You have already uploaded ${studentExistingCount} and can only add ${remainingQuota} more.`
      );
      return;
    }

    if (stagedFiles.some((f) => f.name.toLowerCase() === fileName.toLowerCase())) {
      setErrorMsg(`A file named '${fileName}' has already been added.`);
      return;
    }

    setStagedFiles((prev) => [...prev, { name: fileName, code: content, language, size: sizeBytes }]);
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

  const chipClass = (active: boolean) =>
    `text-xs px-2.5 py-1 rounded-lg font-mono font-bold transition-all border ${
      active
        ? 'bg-ca-brand text-ca-brand-ink border-ca-brand'
        : 'bg-ca-bg-elevated text-ca-muted hover:text-ca-ink border-ca-border'
    }`;

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6 ca-fade-up">
      <div className="ca-panel p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-ca-brand uppercase tracking-wider mb-2">
          <Terminal className="w-4 h-4" />
          <span>CCIS Student Examination Upload Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-ca-ink">
          Upload Examination Source Code
        </h1>
        <p className="text-xs text-ca-muted mt-1">
          Enter your Lobby Code, your Student ID, and upload up to 3 source files (
          <code className="text-ca-brand">.py</code>, <code className="text-ca-brand">.java</code>,{' '}
          <code className="text-ca-brand">.c</code>).
        </p>
      </div>

      {successReceipt && (
        <div className="p-6 rounded-3xl border border-ca-border bg-ca-ok-soft text-ca-ok space-y-3 ca-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-ca-ok-soft text-ca-ok">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-ca-ink">Submission Successfully Received!</h3>
              <p className="text-xs text-ca-muted">
                Your examination source code has been transmitted to the instructor&apos;s live dashboard.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-ca-surface border border-ca-border text-xs font-mono text-ca-muted grid sm:grid-cols-2 gap-2">
            <div>
              <span className="text-ca-faint block">Student ID:</span>
              <strong className="text-ca-brand">{successReceipt.studentId}</strong>
            </div>
            <div>
              <span className="text-ca-faint block">Exam Session:</span>
              <span className="text-ca-ink truncate block">{successReceipt.lobbyTitle}</span>
            </div>
            <div>
              <span className="text-ca-faint block">Files Uploaded:</span>
              <span className="text-ca-ink">{successReceipt.fileCount} file(s)</span>
            </div>
            <div>
              <span className="text-ca-faint block">Timestamp:</span>
              <span className="text-ca-ink">{successReceipt.submittedAt}</span>
            </div>
          </div>

          <div className="text-[11px] text-ca-muted flex items-center gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 text-ca-brand shrink-0" />
            <span>AI scores are never displayed on student portals.</span>
          </div>

          <button
            onClick={() => setSuccessReceipt(null)}
            className="text-xs underline text-ca-ok font-bold hover:opacity-80 block pt-1"
          >
            Submit additional file or new submission
          </button>
        </div>
      )}

      <div className="ca-panel p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted">
              1. Enter Lobby Code <span className="text-ca-brand">*</span>
            </label>
            <input
              type="text"
              value={lobbyCode}
              onChange={(e) => {
                setLobbyCode(e.target.value.toUpperCase());
                setErrorMsg(null);
              }}
              placeholder="e.g. CARSU-1 or ALGO-99"
              required
              className="ca-input font-mono font-bold tracking-widest uppercase"
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-ca-faint font-medium">Available Lobbies:</span>
              {lobbies.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => {
                    setLobbyCode(l.code);
                    setErrorMsg(null);
                  }}
                  className={chipClass(lobbyCode.toUpperCase() === l.code)}
                >
                  {l.code} ({l.status})
                </button>
              ))}
            </div>

            {activeLobby ? (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  activeLobby.status === 'ACTIVE'
                    ? 'bg-ca-ok-soft border-ca-border text-ca-ok'
                    : 'bg-ca-danger-soft border-ca-border text-ca-danger'
                }`}
              >
                <div>
                  <span className="font-bold text-ca-ink">{activeLobby.subject}</span>
                  <span className="block text-[11px] text-ca-muted">{activeLobby.title}</span>
                </div>
                <span className="font-mono font-black uppercase text-[10px] px-2 py-0.5 rounded bg-ca-surface text-ca-ink border border-ca-border">
                  {activeLobby.status}
                </span>
              </div>
            ) : lobbyCode.trim() ? (
              <div className="text-xs text-ca-danger flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>No active exam lobby found with code &quot;{lobbyCode}&quot;.</span>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-ca-muted">
              2. Student ID Number <span className="text-ca-brand">*</span>
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
              className="ca-input font-mono"
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-ca-faint">Quick ID Input:</span>
              {quickStudentIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setStudentId(id)}
                  className={chipClass(studentId === id)}
                >
                  {id}
                </button>
              ))}
            </div>

            {activeLobby && studentId.trim() && (
              <div className="p-3 rounded-xl bg-ca-bg-elevated border border-ca-border text-xs flex items-center justify-between text-ca-muted font-mono">
                <span>Uploads quota in this lobby:</span>
                <span className="font-bold text-ca-brand">
                  {studentExistingCount} / 3 used ({remainingQuota} remaining)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-ca-muted">
                3. Attach Source Files (.py, .java, .c only)
              </label>
              <span className="text-xs font-mono text-ca-faint">
                {stagedFiles.length} / {Math.min(3, remainingQuota)} staged (Max 3 total)
              </span>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative p-6 sm:p-8 rounded-2xl border-2 border-dashed border-ca-border hover:border-ca-brand bg-ca-bg-elevated text-center transition-all cursor-pointer group"
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
              <div className="w-12 h-12 rounded-2xl bg-ca-brand-soft text-ca-brand border border-ca-border flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-ca-ink mb-1">
                Drag and drop your code files or click to browse
              </h4>
              <p className="text-xs text-ca-muted max-w-sm mx-auto">
                Only <strong className="text-ca-brand">.py</strong>,{' '}
                <strong className="text-ca-brand">.java</strong>, and{' '}
                <strong className="text-ca-brand">.c</strong> files accepted. Max 200 KB each (min 30
                tokens).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-ca-faint">Quick Test Samples:</span>
              {(
                [
                  ['python_ai', '+ Python (Binary Search)'],
                  ['python_human', '+ Python (Student Lab)'],
                  ['c_ai', '+ C (Matrix Multiply)'],
                  ['java_human', '+ Java (Grade Calc)'],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleLoadSample(type)}
                  className="px-2 py-1 rounded bg-ca-bg-elevated text-ca-muted hover:text-ca-brand border border-ca-border font-mono text-[11px]"
                >
                  {label}
                </button>
              ))}
            </div>

            {stagedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-ca-faint uppercase">
                  Files ready to submit ({stagedFiles.length}):
                </div>
                {stagedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-ca-bg-elevated border border-ca-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-ca-brand shrink-0" />
                      <div>
                        <div className="font-mono font-bold text-ca-ink">{file.name}</div>
                        <div className="text-[10px] text-ca-faint font-mono">
                          {file.language.toUpperCase()} • {Math.round(file.size)} bytes
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagedFile(idx)}
                      className="p-1 rounded-lg text-ca-faint hover:text-ca-danger transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-ca-danger-soft border border-ca-border text-ca-danger text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

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
            className="ca-btn-primary w-full"
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
