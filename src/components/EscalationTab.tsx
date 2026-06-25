import React from 'react';
import { EmailThread } from '../types';
import {
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  BookmarkCheck,
  UserCheck,
  HeartPulse
} from 'lucide-react';

interface EscalationTabProps {
  threads: EmailThread[];
  onSelectThread: (thread: EmailThread) => void;
  onClaimThread: (threadId: string) => void;
}

const getTriggerIcon = (category: string) => {
  if (category === 'Legal') return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
  if (category === 'Product Issue') return <HeartPulse className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />;
  return <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
};

const EscalationRow = React.memo(({ thread, onSelectThread }: { thread: EmailThread, onSelectThread: (t: EmailThread) => void }) => {
  return (
    <div 
      className="p-4 rounded-[16px] bg-white hover:bg-rose-50/50 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/60 border-l-[4px] border-l-rose-500 group shadow-sm mb-4 mx-2 lg:mx-0 cursor-pointer"
    >
      <div className="space-y-1.5 flex-1 min-w-0 cursor-pointer" onClick={() => onSelectThread(thread)}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-100 to-red-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm mr-1">
            {thread.senderName.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-[10px] font-mono font-semibold text-slate-400">{thread.id}</span>
          <h5 className="text-xs font-semibold text-slate-800 truncate">{thread.senderName}</h5>
          <span className="text-[9px] font-semibold text-red-600 shrink-0 bg-red-100 px-2 py-0.5 rounded uppercase tracking-tight">
            {thread.sentiment}
          </span>
        </div>

        <p className="text-xs text-slate-700 font-semibold truncate leading-snug">
          {thread.topic}
        </p>

        <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mt-1">
          {getTriggerIcon(thread.category || '')}
          <p className="italic text-[11px] text-slate-500 leading-snug">
            {thread.triggerReason || 'Trigger Rule Check: Manual supervisor escalation.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
        <button 
          onClick={() => onSelectThread(thread)}
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:border-slate-300 transition-all flex items-center gap-1 group-hover:text-[#1A73E8] group-hover:border-blue-200 cursor-pointer"
        >
          Inspect
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
});

export default function EscalationTab({ threads, onSelectThread, onClaimThread }: EscalationTabProps) {
  const escalatedThreads = React.useMemo(() => threads.filter(t => t.status === 'Escalated'), [threads]);
  const total = threads.length;
  const draftsReady = threads.filter(t => t.draftStatus === 'Draft ready' || t.draftStatus === 'Draft prepared').length;
  const openCount = threads.filter(t => t.status === 'Open').length;
  const draftRatio = total ? Math.round((draftsReady / total) * 100) : 0;

  // Clean empty state when nothing is escalated (no stale reference cards).
  if (escalatedThreads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-[#E9EEF6] flex items-center justify-center text-slate-600 mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No escalations right now</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">
          When an email trips a guardrail — legal, health/adverse reaction, angry repeat contact, VIP, an attachment, or a quality complaint missing evidence — it appears here for human review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] p-6 gap-6 bg-transparent overflow-y-auto">
      {/* List section */}
      <div className="space-y-6">
        {/* Warning Indicator Banner */}
        <div className="bg-rose-50 border border-rose-100 rounded-[24px] p-6 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5 fill-current" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-800">Human review required</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              <span className="font-semibold text-red-600">{escalatedThreads.length} {escalatedThreads.length === 1 ? 'case' : 'cases'}</span> were flagged by the escalation engine and were not auto-drafted, per the guardrails: legal or regulatory language, health or adverse reactions, angry repeat contacts, VIP accounts, attachments to review, or quality complaints missing evidence.
            </p>
          </div>
        </div>

        {/* Real queue stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Cases needing review</p>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-3xl font-medium text-slate-800">{escalatedThreads.length}</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Escalated</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">No auto-action taken; a human approves any reply.</p>
          </div>
          <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm">
            <p className="text-[10px] uppercase font-semibold tracking-widest text-slate-400">Drafts ready to send</p>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-2xl font-semibold text-slate-800">{draftsReady}</span>
              <span className="text-xs font-semibold text-[#1A73E8] bg-blue-50 px-2 py-0.5 rounded">{draftRatio}% of inbox</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#1A73E8] h-full rounded-full" style={{ width: `${draftRatio}%` }} />
            </div>
          </div>
        </div>

        {/* Cases Under Investigation */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Escalated Cases Pending claim</h4>
          
          {escalatedThreads.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShieldCheck className="w-12 h-12 text-[#1A73E8] mx-auto stroke-1" />
              <p className="text-sm font-medium mt-3">All clear! Standard response channels are normal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {escalatedThreads.map(thread => (
                <EscalationRow key={thread.id} thread={thread} onSelectThread={onSelectThread} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar Checklist column */}
      <div className="space-y-6">
        {/* Active Power Session banner */}
        <div className="bg-white border border-slate-200/50 text-slate-800 rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#1A73E8] bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Autonomous Co-Pilot
            </span>
            <Sparkles className="w-4 h-4 text-[#1A73E8] fill-current animate-pulse" />
          </div>

          <h3 className="text-sm font-semibold text-slate-800 tracking-tight leading-tight">BeastLife Draft Co-Pilot</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Let the server-side Gemini model evaluate active support records, look up corresponding knowledge base files, write personalized compliance co-signed drafts, and flag regulatory complaints.
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Drafts ready in inbox</span>
            <span className="text-[#1A73E8]">{draftsReady} of {total} ({draftRatio}%)</span>
          </div>
        </div>

        {/* Escalation handling protocol (static reference, mirrors the guardrails) */}
        <div className="bg-m3-surface rounded-3xl p-6 shadow-m3-1 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Escalation handling protocol</h4>
            <BookmarkCheck className="w-4 h-4 text-[#1A73E8]" />
          </div>

          <div className="space-y-2.5">
            {[
              'Quality complaint: request a photo or unboxing video before resolving.',
              'Legal or regulatory: never admit liability or offer a settlement.',
              'Health or adverse reaction: advise stop use and consult a professional.',
              'VIP / repeat angry contact: prioritize and respond personally.',
              'A human approves every reply before it sends.',
            ].map((text, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-[#1A73E8] shrink-0" />
                <span className="text-xs text-slate-600 leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reference docs (KB-backed) — derived from escalated threads */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3.5">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Knowledge base references</h4>
          <div className="space-y-2 text-xs font-medium">
            {(() => {
              const KB_MAP: Record<string, { icon: string; label: string }> = {
                'Return/Refund': { icon: '📜', label: 'Returns & Refunds policy (care@beastlife.in, 2-day window)' },
                'Product Issue': { icon: '🧪', label: 'Product Quality Issues: evidence required by issue type' },
                'Delivery': { icon: '📦', label: 'Delivery & Tracking: courier escalation and resolution SLA' },
                'Legal': { icon: '⚖️', label: 'Legal & Regulatory: compliance guidelines and response protocol' },
                'Health': { icon: '🏥', label: 'Health & Safety: adverse reaction response procedure' },
                'Account': { icon: '🔐', label: 'Account Management: verification and access recovery' },
                'General': { icon: '📋', label: 'General Inquiry: FAQ and standard response templates' },
              };
              const seen = new Set<string>();
              const refs: { icon: string; label: string }[] = [];
              escalatedThreads.forEach(t => {
                const cat = t.category || 'General';
                if (!seen.has(cat)) {
                  seen.add(cat);
                  const entry = KB_MAP[cat] || { icon: '📄', label: `${cat}: related knowledge base articles` };
                  refs.push(entry);
                }
              });
              if (refs.length === 0) refs.push({ icon: '📋', label: 'No active references — escalation queue is clear' });
              return refs.map((ref, idx) => (
                <div key={idx} className="block p-2.5 bg-slate-50 rounded-lg text-slate-700">
                  {ref.icon} {ref.label}
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
