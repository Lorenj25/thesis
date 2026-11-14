import React from 'react';
import { X, FileCode, Copy, Check } from 'lucide-react';
import { Submission } from '../types';

interface CodeModalProps {
  submission: Submission | null;
  onClose: () => void;
}

export const CodeModal: React.FC<CodeModalProps> = ({ submission, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!submission) return null;

  const lines = submission.sourceCode.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(submission.sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskClasses = (risk: string | null, status: Submission['status']) => {
    if (status === 'failed') return 'text-ca-danger bg-ca-danger-soft border-ca-border';
    if (risk === 'High') return 'text-ca-danger bg-ca-danger-soft border-ca-border';
    if (risk === 'Medium') return 'text-ca-warn bg-ca-warn-soft border-ca-border';
    if (risk === 'Low') return 'text-ca-ok bg-ca-ok-soft border-ca-border';
    return 'text-ca-muted bg-ca-bg-elevated border-ca-border';
  };
  const analysisLabel =
    submission.status === 'failed'
      ? 'FAILED'
      : submission.riskLevel || (submission.status === 'done' ? 'NO SCORE' : 'ANALYZING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ca-overlay backdrop-blur-sm ca-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col ca-panel overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ca-border bg-ca-surface-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-ca-brand-soft text-ca-brand border border-ca-border">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ca-ink text-base">{submission.fileName}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-ca-bg-elevated text-ca-muted border border-ca-border">
                  {submission.language}
                </span>
              </div>
              <p className="text-xs text-ca-muted">
                Student ID:{' '}
                <span className="text-ca-brand font-mono font-bold">{submission.studentId}</span> •
                Submitted: {new Date(submission.submittedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="ca-btn-secondary text-xs !py-1.5 !px-3">
              {copied ? <Check className="w-3.5 h-3.5 text-ca-ok" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ca-muted hover:text-ca-ink hover:bg-ca-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-ca-bg-elevated border-b border-ca-border flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-ca-faint block text-[10px] uppercase font-bold">AI Probability</span>
              <span className="text-sm font-black font-mono text-ca-ink">
                {submission.aiProbability !== null
                  ? `${(submission.aiProbability * 100).toFixed(1)}%`
                  : '--'}
              </span>
            </div>
            <div>
              <span className="text-ca-faint block text-[10px] uppercase font-bold">Risk Assessment</span>
              <span
                className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs border ${getRiskClasses(submission.riskLevel, submission.status)}`}
              >
                {analysisLabel}
              </span>
            </div>
            <div>
              <span className="text-ca-faint block text-[10px] uppercase font-bold">Token Count</span>
              <span className="font-mono text-ca-ink">{submission.tokenCount} tokens</span>
            </div>
          </div>

          {submission.status === 'failed' && submission.errorMessage && (
            <div
              role="alert"
              className="px-6 py-3 bg-ca-danger-soft border-b border-ca-border text-sm text-ca-danger"
            >
              <strong className="block mb-1">Analysis failed</strong>
              <span>{submission.errorMessage}</span>
            </div>
          )}

          <div className="text-right">
            <span className="text-ca-faint block text-[10px] uppercase font-bold">Model Engine</span>
            <span className="text-ca-brand font-mono">Frozen CodeBERT (770-dim)</span>
          </div>
        </div>

        {submission.indicators && submission.indicators.length > 0 && (
          <div className="px-6 py-2.5 bg-ca-surface border-b border-ca-border text-xs flex items-center gap-2 text-ca-muted">
            <span className="font-bold text-ca-brand shrink-0">Signal Highlights:</span>
            <div className="flex flex-wrap gap-1.5">
              {submission.indicators.map((ind, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-ca-bg-elevated text-ca-muted border border-ca-border text-[11px]"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 bg-ca-bg font-mono text-xs text-ca-ink ca-scroll">
          <div className="min-w-full">
            {lines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-ca-surface-hover py-0.5 px-2 rounded">
                <span className="w-10 select-none text-ca-faint text-right pr-4 shrink-0 font-mono">
                  {idx + 1}
                </span>
                <span className="whitespace-pre overflow-x-auto text-ca-muted">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-ca-border bg-ca-surface-2 flex items-center justify-between text-xs text-ca-muted">
          <span>Treated purely as static text. Never compiled or executed.</span>
          <button onClick={onClose} className="ca-btn-primary !py-1.5 !px-4 text-xs">
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
};
