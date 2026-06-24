import React, { useState, useEffect } from 'react';
import { EmailThread } from '../types';
import { 
  AlertTriangle, 
  Clock, 
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

export default function EscalationTab({ threads, onSelectThread, onClaimThread }: EscalationTabProps) {
  const escalatedThreads = threads.filter(t => t.status === 'Escalated');
  const [seconds, setSeconds] = useState(522); // ~8m 42s

  // Live countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => (prev > 0 ? prev - 1 : 1200));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const getTriggerIcon = (category: string) => {
    if (category === 'Legal') return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
    if (category === 'Product Issue') return <HeartPulse className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />;
    return <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] p-6 gap-6 bg-[#F8FAFC] overflow-y-auto">
      {/* List section */}
      <div className="space-y-6">
        {/* Warning Indicator Banner */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-5.5 h-5.5 fill-current" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-800">SLA Breach Red Alert</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              We detected <span className="font-bold text-red-600">{escalatedThreads.length} active critical cases</span> in the escalation queue that require human inspection. These cases bypassed standard auto-replies due to legal keywords, VIP metadata tags, or food safety risks.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="text-[10px] font-bold text-red-700 bg-red-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider">Breach Warning</span>
            <span className="text-xs font-mono font-bold text-red-600 mt-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              {formatTimer(seconds)} to SLA Breach
            </span>
          </div>
        </div>

        {/* SLA stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SLA Compliance tracker */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Quarterly SLA Compliance</p>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-2xl font-bold text-slate-800">94.8%</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">+1.2% this week</span>
            </div>
            {/* Custom progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94.8%' }} />
            </div>
          </div>
          {/* Average response */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Avg Response Wait Time</p>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-2xl font-bold text-slate-800">14m 24s</span>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">-4m wait spike</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '78%' }} />
            </div>
          </div>
        </div>

        {/* Cases Under Investigation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Escalated Cases Pending claim</h4>
          
          {escalatedThreads.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto stroke-1" />
              <p className="text-sm font-medium mt-3">All clear! Standard response channels are normal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {escalatedThreads.map(thread => (
                <div 
                  key={thread.id}
                  className="p-4 border border-rose-100 rounded-xl bg-white hover:bg-rose-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-rose-500 group shadow-sm"
                >
                  <div className="space-y-1.5 flex-1 min-w-0" onClick={() => onSelectThread(thread)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{thread.id}</span>
                      <h5 className="text-xs font-bold text-slate-800 truncate">{thread.senderName}</h5>
                      <span className="text-[9px] font-bold text-red-600 shrink-0 bg-red-100 px-2 py-0.5 rounded uppercase tracking-tight">
                        {thread.sentiment}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-semibold truncate leading-snug">
                      {thread.topic}
                    </p>

                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mt-1">
                      {getTriggerIcon(thread.category)}
                      <p className="italic text-[11px] text-slate-500 leading-snug">
                        {thread.triggerReason || 'Trigger Rule Check: Manual supervisor escalation.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <button 
                      onClick={() => onClaimThread(thread.id)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 hover:border-slate-800 transition-all flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Claim Case
                    </button>
                    <button 
                      onClick={() => onSelectThread(thread)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:border-slate-300 transition-all flex items-center gap-1 group-hover:text-emerald-600 group-hover:border-emerald-200"
                    >
                      Inspect
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar Checklist column */}
      <div className="space-y-6">
        {/* Active Power Session banner */}
        <div className="bg-[#1E293B] border border-slate-700 text-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Autonomous Co-Pilot
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400 fill-current animate-pulse" />
          </div>

          <h3 className="text-sm font-bold text-white tracking-tight leading-tight">BeastLife Draft Co-Pilot</h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            Let the server-side Gemini model evaluate active support records, look up corresponding knowledge base files, write personalized compliance co-signed drafts, and flag regulatory complaints.
          </p>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Total Drafts Generated</span>
            <span className="text-emerald-400">4,051 (84%)</span>
          </div>
        </div>

        {/* Dynamic De-escalation Checklist */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Audit Protocol Checked</h4>
            <BookmarkCheck className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="space-y-2.5">
            {[
              { text: 'Acknowledge recipient complaints within 15 minutes.', checked: true },
              { text: 'Query local database for recent logistics records.', checked: true },
              { text: 'Verify batch quality status via QC manager logs.', checked: false },
              { text: 'Propose dynamic standard refund or free shaker bottle.', checked: false },
              { text: 'Escalate legal concerns directly to legal liaison.', checked: false }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border shrink-0 ${
                  item.checked 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                    : 'border-slate-300 bg-slate-50'
                }`}>
                  {item.checked && <span className="text-[9px] font-bold">✓</span>}
                </div>
                <span className={`text-xs ${item.checked ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resources Cards */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Team Quicklinks</h4>
          <div className="space-y-2 text-xs font-medium">
            <a href="#" className="block p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors">
              📜 BeastLife Returns Refund Standards v4.2
            </a>
            <a href="#" className="block p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors">
              🧪 Batch Analysis Certificate of Authenticity (COA)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
