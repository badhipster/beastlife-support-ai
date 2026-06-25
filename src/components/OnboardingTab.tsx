import React, { useState, useEffect } from 'react';
import { Compass, Mail, ShieldCheck, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

interface OnboardingTabProps {
  onboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => void;
}

// Admin setup page: real connection status for the Gmail inbox and the KB index.
export default function OnboardingTab({ setOnboardingCompleted }: OnboardingTabProps) {
  const [gmail, setGmail] = useState<{ configured: boolean; connected: boolean; email?: string }>({ configured: false, connected: false });
  const [kbChunks, setKbChunks] = useState<number>(0);

  useEffect(() => {
    fetch('/api/gmail/status')
      .then((r) => r.json())
      .then((d) => {
        setGmail(d);
        if (d.connected) setOnboardingCompleted(true);
      })
      .catch(() => {});
    fetch('/api/kb/stats')
      .then((r) => r.json())
      .then((d) => setKbChunks(d.totalChunks || 0))
      .catch(() => {});
  }, [setOnboardingCompleted]);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] p-6 gap-6 bg-[#F8FAFC] overflow-y-auto">
      {/* LEFT: real setup status */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Compass className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Setup &amp; connections</h3>
              <p className="text-[10px] text-slate-400">Live status of the Gmail inbox and the knowledge base index</p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Workspace status</span>
            {gmail.connected ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500 fill-current" /> Ready
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Inbox not connected
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">Connections</h4>

          {/* Gmail inbox (real) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex gap-4.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-slate-800">Gmail support inbox</h5>
                  {gmail.connected ? (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">Connected</span>
                  ) : (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase">Not connected</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  {gmail.connected
                    ? `Watching ${gmail.email || 'the connected inbox'} via OAuth 2.0 — new mail is ingested every 60s.`
                    : 'Connect a Gmail inbox via OAuth 2.0 so the AI can triage and draft from it.'}
                </p>
              </div>
            </div>
            <a
              href="/api/auth/google"
              className={`px-3 py-1.5 self-end sm:self-center text-xs font-bold rounded-lg transition-all border shrink-0 text-center ${
                gmail.connected
                  ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  : 'border-[#1E293B] bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {gmail.connected ? 'Reconnect' : 'Connect Gmail'}
            </a>
          </div>

          {/* Knowledge base (real) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex gap-4.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-slate-800">Knowledge base index</h5>
                  {kbChunks > 0 && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">Loaded</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  {kbChunks} embedded chunks from the BeastLife Knowledge Base, served via pgvector for grounded replies.
                </p>
              </div>
            </div>
            <span className="self-end sm:self-center text-xs font-bold text-emerald-700 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-4 h-4" /> {kbChunks} chunks
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: how data is handled + FAQs */}
      <div className="space-y-6">
        <div className="bg-[#1E293B] border border-slate-700 text-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">How your data is handled</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            OAuth 2.0, encrypted in transit. You approve every reply before it sends.
          </p>
          <div className="space-y-2 text-xs font-medium border-t border-slate-800 pt-3">
            <p className="text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full block" />
              Gmail OAuth 2.0 with the scopes you grant. No mailbox access without your sign-in.
            </p>
            <p className="text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full block" />
              Transcripts and drafts are encrypted in transit between your inbox and this app.
            </p>
            <p className="text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full block" />
              No auto-send. Every reply waits for an agent to approve it.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">FAQs</h4>
          <div className="space-y-2 text-xs">
            <details className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
              <summary className="font-bold text-slate-700">How soon do drafts appear?</summary>
              <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                Within ~60 seconds. A background poller picks up new mail, classifies it, runs the escalation rules, and prepares a grounded draft for review.
              </p>
            </details>
            <details className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
              <summary className="font-bold text-slate-700">Is the knowledge base used to train models?</summary>
              <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                No. KB chunks are embedded and stored in your own database for retrieval only; they are not used to train any public model.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
