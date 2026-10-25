import React from 'react';
import {
  Activity,
  Zap,
  HeartPulse,
  ShieldAlert,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';

interface PurposeCardProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: 'intake' | 'nurse' | 'care') => void;
}

export const PurposeCard: React.FC<PurposeCardProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-[#091126] border border-[#1C3166] shadow-2xl p-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00F5D4]/20 border border-[#00F5D4] flex items-center justify-center text-[#00F5D4]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Platform Purpose</h3>
              <span className="text-[10px] font-mono text-[#00F5D4]">11th Hour Core Mission</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simple 2-Point Content */}
        <div className="py-4 space-y-3 text-xs">
          {/* Point 1 */}
          <div className="p-3 rounded-xl bg-[#0D1836] border border-slate-800 flex items-start gap-3">
            <Zap className="w-4 h-4 text-[#00F5D4] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-mono text-[11px] mb-0.5">1. Emergency Intake</strong>
              <p className="text-slate-300">
                Voice input in <strong>English, Hindi, Telugu</strong> → Structured clinical ESI triage in <strong>&lt;30s</strong> (down from ~8 mins).
              </p>
            </div>
          </div>

          {/* Point 2 */}
          <div className="p-3 rounded-xl bg-[#0D1836] border border-slate-800 flex items-start gap-3">
            <HeartPulse className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-mono text-[11px] mb-0.5">2. CareContinuum Recovery</strong>
              <p className="text-slate-300">
                Converts discharge notes into daily recovery tasks, medication checklist, and 24/7 multilingual voice Q&amp;A.
              </p>
            </div>
          </div>

          {/* Safety Rule */}
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Assistive AI only — Licensed human clinician sign-off mandatory.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>ESI Standardized</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#00F5D4] text-[#0B132B] font-bold text-xs cursor-pointer hover:bg-[#00c9ae]"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
