import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowUpRight, AlertTriangle, CheckCircle2, Inbox as InboxIcon, Clock, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

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
  volumeData: { date: string; received: number; autoReplied: number; escalated: number }[];
  sentimentTrend: { date: string; Happy: number; Neutral: number; Frustrated: number }[];
  topEscalationReasons: { reason: string; count: number }[];
  avgResponseTime: { ai: string; human: string };
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

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-1.5 lg:col-span-4 flex items-center justify-between">
          <div>
             <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-semibold tracking-widest mb-1">
                <span>Avg Response Time</span>
                <Clock className="w-3.5 h-3.5" />
             </div>
             <p className="text-[10px] text-slate-500">Automated vs Human Dispatch</p>
          </div>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-2xl font-semibold text-[#1A73E8]">{data.avgResponseTime?.ai || 'N/A'}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AI Drafted</p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <p className="text-2xl font-semibold text-slate-700">{data.avgResponseTime?.human || 'N/A'}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Human Handled</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Charts: Volume and Sentiment Trend */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 h-80 flex flex-col">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Email Volume (7 Days)</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Received vs. Auto-replied vs. Escalated</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.volumeData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />
                <Bar dataKey="received" name="Received" fill="#94A3B8" radius={[2, 2, 0, 0]} maxBarSize={40} />
                <Bar dataKey="autoReplied" name="Replied (AI)" fill="#10B981" radius={[2, 2, 0, 0]} maxBarSize={40} />
                <Bar dataKey="escalated" name="Escalated" fill="#F43F5E" radius={[2, 2, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 h-80 flex flex-col">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Sentiment Trend (7 Days)</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Customer emotion across incoming emails</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.sentimentTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />
                <Line type="monotone" dataKey="Happy" stroke="#16A34A" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Neutral" stroke="#94A3B8" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Frustrated" stroke="#EA580C" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 3. Top Escalations & Status */}
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

        {/* Top Escalation Reasons */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Top Escalation Drivers</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Why emails bypass the AI</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 space-y-3 pt-2">
            {(data.topEscalationReasons || []).length > 0 ? (data.topEscalationReasons || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                 <span className="text-xs font-medium text-slate-700">{r.reason}</span>
                 <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">{r.count}</span>
              </div>
            )) : (
              <div className="flex items-center justify-center h-full pb-4">
                 <p className="text-xs text-slate-400 italic">No escalations recorded.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Category breakdown — real counts */}
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
