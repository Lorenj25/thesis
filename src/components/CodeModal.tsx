import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, FileCode, Copy, Check } from 'lucide-react';
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

  const getRiskColor = (risk: string | null) => {
    if (risk === 'High') return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (risk === 'Medium') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-stone-800 bg-stone-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">{submission.fileName}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  {submission.language}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Student ID: <span className="text-orange-400 font-mono font-bold">{submission.studentId}</span> • Submitted: {new Date(submission.submittedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-950 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Analysis Summary Bar */}
        <div className="px-6 py-3 bg-stone-900/40 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">AI Probability</span>
              <span className="text-sm font-black font-mono text-white">
                {submission.aiProbability !== null ? `${(submission.aiProbability * 100).toFixed(1)}%` : '--'}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Risk Assessment</span>
              <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs border ${getRiskColor(submission.riskLevel)}`}>
                {submission.riskLevel || 'ANALYZING'} RISK
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Token Count</span>
              <span className="font-mono text-stone-200">{submission.tokenCount} tokens</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Model Engine</span>
            <span className="text-orange-400 font-mono">Frozen CodeBERT (770-dim)</span>
          </div>
        </div>

        {/* Indicators Banner */}
        {submission.indicators && submission.indicators.length > 0 && (
          <div className="px-6 py-2.5 bg-stone-900/60 border-b border-stone-800/60 text-xs flex items-center gap-2 text-stone-300">
            <span className="font-bold text-orange-400 shrink-0">Signal Highlights:</span>
            <div className="flex flex-wrap gap-1.5">
              {submission.indicators.map((ind, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700/60 text-[11px]">
                  {ind}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-stone-950 font-mono text-xs text-stone-200">
          <div className="min-w-full">
            {lines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-stone-900/50 py-0.5 px-2 rounded">
                <span className="w-10 select-none text-stone-600 text-right pr-4 shrink-0 font-mono">
                  {idx + 1}
                </span>
                <span className="whitespace-pre overflow-x-auto text-stone-300">
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-900/80 flex items-center justify-between text-xs text-stone-400">
          <span>Treated purely as static text. Never compiled or executed.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-stone-950 font-bold"
          >
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
};
