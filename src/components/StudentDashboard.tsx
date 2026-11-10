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
    `text-[11px] px-2.5 py-1.5 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
      active
        ? 'bg-ca-brand text-ca-brand-ink'
        : 'bg-ca-surface-2 text-ca-muted hover:text-ca-ink border border-ca-border'
    }`;

  return (
    <div className="max-w-3xl mx-auto py-2 ca-fade-up">
      <div className="rounded-2xl border border-ca-border bg-ca-surface/95 backdrop-blur-md overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-ca-border">
          <p className="text-[11px] font-semibold tracking-wide text-ca-brand flex items-center gap-2 mb-1.5">
            <Terminal className="w-3.5 h-3.5" />
            <span>Student upload portal</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-ca-ink">
            Submit exam source code
          </h1>
          <p className="text-sm text-ca-muted mt-1">
            Enter lobby code and student ID, then upload up to 3 files (
            <span className="font-mono text-ca-brand">.py</span>,{' '}
            <span className="font-mono text-ca-brand">.java</span>,{' '}
            <span className="font-mono text-ca-brand">.c</span>).
          </p>
        </div>

        {successReceipt ? (
          <div className="p-5 sm:p-6 space-y-4 ca-fade-in bg-ca-ok-soft">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-ca-ok shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-ca-ink">Submission received</h3>
                <p className="text-sm text-ca-muted mt-0.5">
                  Your files were sent to the instructor dashboard. AI scores stay hidden on the student side.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-ca-surface/80 border border-ca-border p-3">
                <p className="text-[11px] text-ca-faint">Student ID</p>
                <p className="font-mono font-semibold text-ca-brand mt-0.5">{successReceipt.studentId}</p>
              </div>
              <div className="rounded-xl bg-ca-surface/80 border border-ca-border p-3">
                <p className="text-[11px] text-ca-faint">Exam</p>
                <p className="font-semibold text-ca-ink mt-0.5 truncate">{successReceipt.lobbyTitle}</p>
              </div>
              <div className="rounded-xl bg-ca-surface/80 border border-ca-border p-3">
                <p className="text-[11px] text-ca-faint">Files</p>
                <p className="font-semibold text-ca-ink mt-0.5">{successReceipt.fileCount}</p>
              </div>
              <div className="rounded-xl bg-ca-surface/80 border border-ca-border p-3">
                <p className="text-[11px] text-ca-faint">Time</p>
                <p className="font-semibold text-ca-ink mt-0.5">{successReceipt.submittedAt}</p>
              </div>
            </div>

            <button
              onClick={() => setSuccessReceipt(null)}
              className="text-sm font-semibold text-ca-ok hover:opacity-80 cursor-pointer"
            >
              Submit another file →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <section className="space-y-3 min-w-0">
                <label className="text-sm font-semibold text-ca-ink">
                  1. Lobby code <span className="text-ca-brand">*</span>
                </label>
                <input
                  type="text"
                  value={lobbyCode}
                  onChange={(e) => {
                    setLobbyCode(e.target.value.toUpperCase());
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. CCIS-25"
                  required
                  className="ca-input font-mono font-semibold tracking-wider uppercase"
                />

                {lobbies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
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
                        {l.code}
                        <span className="opacity-70"> · {l.status === 'ACTIVE' ? 'open' : 'locked'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeLobby ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-ca-surface-2/80 border border-ca-border px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ca-ink truncate">{activeLobby.subject}</p>
                      <p className="text-xs text-ca-muted truncate">{activeLobby.title}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                        activeLobby.status === 'ACTIVE'
                          ? 'bg-ca-ok-soft text-ca-ok'
                          : 'bg-ca-danger-soft text-ca-danger'
                      }`}
                    >
                      {activeLobby.status}
                    </span>
                  </div>
                ) : lobbyCode.trim() ? (
                  <p className="text-sm text-ca-danger flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    No lobby found for “{lobbyCode}”.
                  </p>
                ) : null}
              </section>

              <section className="space-y-3 min-w-0">
                <label className="text-sm font-semibold text-ca-ink">
                  2. Student ID <span className="text-ca-brand">*</span>
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 221-0045"
                  required
                  className="ca-input font-mono"
                />

                <div className="flex flex-wrap gap-1.5">
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
                  <p className="text-xs text-ca-muted">
                    Quota:{' '}
                    <span className="font-semibold text-ca-brand">
                      {studentExistingCount}/3 used · {remainingQuota} left
                    </span>
                  </p>
                )}
              </section>
            </div>

            <section className="space-y-3 pt-1 border-t border-ca-border">
              <div className="flex items-center justify-between gap-3 pt-4">
                <label className="text-sm font-semibold text-ca-ink">3. Source files</label>
                <span className="text-xs text-ca-faint font-mono">
                  {stagedFiles.length}/{Math.min(3, Math.max(remainingQuota, stagedFiles.length))} staged
                </span>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative px-5 py-7 sm:py-8 rounded-xl border border-dashed border-ca-border hover:border-ca-brand bg-ca-surface-2/70 text-center transition-colors cursor-pointer group"
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
                <UploadCloud className="w-8 h-8 text-ca-brand mx-auto mb-3" />
                <p className="text-sm font-semibold text-ca-ink">Drop files here or browse</p>
                <p className="text-xs text-ca-muted mt-1">.py · .java · .c · max 200 KB each</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['python_ai', 'Sample · Python AI'],
                    ['python_human', 'Sample · Python'],
                    ['c_ai', 'Sample · C'],
                    ['java_human', 'Sample · Java'],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleLoadSample(type)}
                    className="px-2.5 py-1.5 rounded-lg bg-ca-surface-2 text-ca-muted hover:text-ca-brand border border-ca-border text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  {stagedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-3 rounded-xl bg-ca-surface-2/80 border border-ca-border flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileCode className="w-4 h-4 text-ca-brand shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-ca-ink truncate">{file.name}</p>
                          <p className="text-[11px] text-ca-faint font-mono">
                            {file.language.toUpperCase()} · {Math.round(file.size)} B
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStagedFile(idx)}
                        className="p-1.5 rounded-lg text-ca-faint hover:text-ca-danger transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-ca-danger-soft text-ca-danger text-sm flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
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
                className="h-11 w-full sm:flex-1 rounded-xl bg-ca-brand hover:bg-ca-brand-hover text-ca-brand-ink text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Submitting…</span>
                ) : (
                  <>
                    <span>
                      Submit {stagedFiles.length || ''} file{stagedFiles.length === 1 ? '' : 's'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-ca-faint flex items-center gap-1.5 justify-center sm:justify-start sm:shrink-0">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Scores visible to instructors only
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
