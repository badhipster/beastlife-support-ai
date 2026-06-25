import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowUpRight, AlertTriangle, CheckCircle2, Inbox as InboxIcon } from 'lucide-react';

interface Analytics {
  total: number;
  escalated: number;
  replied: number;
  open: number;
  inQueue: number;
  closed: number;
  drafted: number;
  draftRatioPct: number;
  resolutionPct: number;
  byStatus: { label: string; count: number }[];
  byCategory: { label: string; count: number }[];
  bySentiment: { label: string; count: number }[];
}

// DESIGN.md sentiment tokens.
const SENTIMENT_COLOR: Record<string, string> = {
  Happy: '#16A34A',
  Neutral: '#64748B',
  Frustrated: '#EA580C',
  Sad: '#2563EB',
  Angry: '#DC2626',
};

const STATUS_COLOR: Record<string, string> = {
  Open: 'bg-amber-500',
  Escalated: 'bg-rose-500',
  Replied: 'bg-green-500',
  'In Queue': 'bg-blue-500',
  Closed: 'bg-slate-400',
};

export default function AnalyticsTab() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error('Failed to load analytics:', err));
  }, []);

  if (!data) {
    return <div className="flex-1 p-8 text-sm text-slate-400 bg-[#F6F8FC]">Loading analytics…</div>;
  }

  const maxCategory = Math.max(1, ...data.byCategory.map((c) => c.count));
  const frustratedAngry = data.bySentiment
    .filter((s) => s.label === 'Frustrated' || s.label === 'Angry')
    .reduce((n, s) => n + s.count, 0);
  const faPct = data.total ? Math.round((frustratedAngry / data.total) * 100) : 0;

  // Build cumulative donut segments from real sentiment counts.
  let offset = 0;
  const donut = data.bySentiment.map((s) => {
    const pct = data.total ? (s.count / data.total) * 100 : 0;
    const seg = { label: s.label, pct, dashoffset: -offset, color: SENTIMENT_COLOR[s.label] || '#CBD5E1', count: s.count };
    offset += pct;
    return seg;
  });

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F6F8FC] overflow-y-auto">
      {/* 1. KPI cards — all live from the database */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-semibold tracking-widest">
            <span>Emails Received</span>
            <InboxIcon className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-800">{data.total}</p>
          <p className="text-[10px] text-slate-400">Threads currently in the system</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-semibold tracking-widest">
            <span>Draft Coverage</span>
            <span className="text-[#1A73E8] bg-blue-50 px-2 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 text-[#1A73E8] fill-current" />
              AI
            </span>
          </div>
          <p className="text-2xl font-semibold text-slate-800">{data.draftRatioPct}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-[#1A73E8] h-full rounded-full" style={{ width: `${data.draftRatioPct}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">{data.drafted} of {data.total} have a draft ready</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-semibold tracking-widest">
            <span>Escalated</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-800">{data.escalated}</p>
          <p className="text-[10px] text-slate-400">Flagged for human review, no auto-action</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-semibold tracking-widest">
            <span>Resolution Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1A73E8]" />
          </div>
          <p className="text-2xl font-semibold text-slate-800">{data.resolutionPct}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-[#1A73E8] h-full rounded-full" style={{ width: `${data.resolutionPct}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">{data.replied + data.closed} replied or closed</p>
        </div>
      </section>

      {/* 2. Status breakdown + sentiment donut */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Emails by Status</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Live pipeline state across all threads</p>
          </div>
          <div className="space-y-3 pt-1">
            {data.byStatus.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-20 text-xs font-semibold text-slate-600 shrink-0">{s.label}</span>
                <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STATUS_COLOR[s.label] || 'bg-slate-400'}`}
                    style={{ width: `${data.total ? (s.count / data.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-800 w-6 text-right shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Counts update as emails are ingested, drafted, escalated, and approved.
          </p>
        </div>

        {/* Sentiment donut (real segments) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Sentiment Split</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Classification across all threads</p>
            </div>
            {faPct > 0 && (
              <p className="bg-orange-50 border border-orange-100 text-[10px] font-semibold text-orange-700 px-2 py-0.5 rounded">
                {faPct}% Frustrated/Angry
              </p>
            )}
          </div>

          <div className="flex justify-center py-4">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#F1F5F9" strokeWidth="3" />
                {donut.map((seg) => (
                  <circle
                    key={seg.label}
                    cx="18"
                    cy="18"
                    r="16"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="3"
                    strokeDasharray={`${seg.pct} 100`}
                    strokeDashoffset={seg.dashoffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold text-slate-800">{data.total}</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Processed</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-1">
            {data.bySentiment.map((s) => (
              <div key={s.label} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SENTIMENT_COLOR[s.label] || '#CBD5E1' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-700 truncate leading-tight">{s.label}</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-800">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Category breakdown — real counts */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Emails by Category</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Model classification across all threads</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.byCategory.map((item) => (
            <div key={item.label} className="p-4 border border-slate-100 rounded-lg bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="text-[10px] font-mono text-slate-400">{item.count} {item.count === 1 ? 'email' : 'emails'}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1A73E8] h-full rounded-full" style={{ width: `${(item.count / maxCategory) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-800 shrink-0">
                  {data.total ? Math.round((item.count / data.total) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
