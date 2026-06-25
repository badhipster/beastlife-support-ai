import React, { useState, useEffect } from 'react';
import {
  Zap, Inbox, ShieldCheck, Mail, ArrowRight, CheckCircle2, UserCog, Headset,
  BookOpen, Sparkles, Send, Tag, AlertTriangle
} from 'lucide-react';
import { Role } from '../types';

interface OnboardingFlowProps {
  user: { name: string };
  onDone: (role: Role) => void;
}

// Guided first-run setup: pick a role, then walk role-tailored steps with a
// progress stepper. Role is persisted server-side (per user) on finish.
export default function OnboardingFlow({ user, onDone }: OnboardingFlowProps) {
  const [chosen, setChosen] = useState<Role | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [gmail, setGmail] = useState<{ connected: boolean; email?: string }>({ connected: false });
  const [kbChunks, setKbChunks] = useState<number>(0);

  const steps = chosen === 'admin'
    ? ['Connect inbox', 'Knowledge base', 'Guardrails', 'Done']
    : ['How you work', 'Done'];

  useEffect(() => {
    if (chosen !== 'admin') return;
    fetch('/api/gmail/status').then((r) => r.json()).then(setGmail).catch(() => {});
    fetch('/api/kb/stats').then((r) => r.json()).then((d) => setKbChunks(d.totalChunks || 0)).catch(() => {});
  }, [chosen]);

  const saveRole = (role: Role) =>
    fetch('/api/me/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

  const finish = async () => {
    if (!chosen) return;
    await saveRole(chosen).catch(() => {});
    onDone(chosen);
  };

  // Persist role before leaving for OAuth so the redirect lands in the app.
  const connectInbox = async () => {
    await saveRole('admin').catch(() => {});
    window.location.href = '/api/auth/google';
  };

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const Stepper = () => (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-1.5 ${i <= stepIndex ? 'text-emerald-600' : 'text-slate-300'}`}>
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              i < stepIndex ? 'bg-emerald-600 text-white' : i === stepIndex ? 'bg-emerald-100 text-emerald-700 border border-emerald-500' : 'bg-slate-100 text-slate-400'
            }`}>
              {i < stepIndex ? '✓' : i + 1}
            </span>
            <span className="text-[10px] font-bold hidden sm:block">{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-px ${i < stepIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  const card = (children: React.ReactNode) => (
    <div className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-6 font-sans text-slate-200">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight leading-tight">BeastLife</h1>
            <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest leading-none mt-0.5">Support AI</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800">{children}</div>
      </div>
    </div>
  );

  // Step 0: role selection
  if (!chosen) {
    return card(
      <>
        <h2 className="text-lg font-bold">Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h2>
        <p className="text-sm text-slate-500 mt-1">How will you use BeastLife Support AI? This sets what you can access.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <button onClick={() => { setChosen('agent'); setStepIndex(0); }} className="text-left p-5 border border-slate-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Headset className="w-5 h-5" /></div>
            <h3 className="text-sm font-bold text-slate-800">Support Agent</h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">Work the inbox queue: review AI drafts, approve &amp; send, and handle escalations.</p>
            <span className="text-[11px] font-bold text-emerald-600 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">Continue as Agent <ArrowRight className="w-3.5 h-3.5" /></span>
          </button>
          <button onClick={() => { setChosen('admin'); setStepIndex(0); }} className="text-left p-5 border border-slate-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><UserCog className="w-5 h-5" /></div>
            <h3 className="text-sm font-bold text-slate-800">CX Lead / Admin</h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">Set up and oversee: connect Gmail, manage the knowledge base and rules, watch analytics.</p>
            <span className="text-[11px] font-bold text-emerald-600 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">Continue as Admin <ArrowRight className="w-3.5 h-3.5" /></span>
          </button>
        </div>
      </>
    );
  }

  const stepName = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return card(
    <>
      <Stepper />

      {/* AGENT: how you work */}
      {chosen === 'agent' && stepName === 'How you work' && (
        <div>
          <h2 className="text-lg font-bold">How you'll work the queue</h2>
          <p className="text-sm text-slate-500 mt-1">The AI does the heavy lifting; you stay in control.</p>
          <div className="mt-5 space-y-3">
            {[
              { icon: Tag, t: 'Mail arrives pre-triaged', d: 'Every email is auto-categorized and sentiment-scored, so you work by priority.' },
              { icon: Sparkles, t: 'A grounded draft is ready', d: 'Replies are drafted from the knowledge base. Review, tweak, done.' },
              { icon: Send, t: 'You approve &amp; send', d: 'Nothing sends without you. High-risk emails are flagged for human review.' },
            ].map((s) => (
              <div key={s.t} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><s.icon className="w-4 h-4" /></div>
                <div><h4 className="text-xs font-bold text-slate-800" dangerouslySetInnerHTML={{ __html: s.t }} /><p className="text-[11px] text-slate-500 leading-snug mt-0.5" dangerouslySetInnerHTML={{ __html: s.d }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: connect inbox */}
      {chosen === 'admin' && stepName === 'Connect inbox' && (
        <div>
          <h2 className="text-lg font-bold">Connect your support inbox</h2>
          <p className="text-sm text-slate-500 mt-1">Link the Gmail inbox the AI triages and replies from. You approve every reply.</p>
          <div className="mt-5 p-5 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Mail className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Gmail support inbox</h3>
                {gmail.connected
                  ? <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Connected{gmail.email ? ` — ${gmail.email}` : ''}</p>
                  : <p className="text-xs text-slate-500 mt-0.5">Not connected yet</p>}
              </div>
            </div>
            <button onClick={connectInbox} className={`px-4 py-2 text-xs font-bold rounded-lg shrink-0 ${gmail.connected ? 'text-slate-600 border border-slate-200 hover:bg-slate-50' : 'text-white bg-slate-900 hover:bg-slate-800'}`}>
              {gmail.connected ? 'Reconnect' : 'Connect Gmail'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> OAuth 2.0, encrypted in transit. No mailbox access without your sign-in.</p>
        </div>
      )}

      {/* ADMIN: knowledge base */}
      {chosen === 'admin' && stepName === 'Knowledge base' && (
        <div>
          <h2 className="text-lg font-bold">Knowledge base is loaded</h2>
          <p className="text-sm text-slate-500 mt-1">Replies are grounded in your knowledge base, not the model's guesswork.</p>
          <div className="mt-5 p-5 border border-slate-200 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{kbChunks} embedded chunks</h3>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">From the BeastLife Knowledge Base, searched via pgvector. If nothing relevant is found, the AI asks to clarify instead of inventing.</p>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN: guardrails */}
      {chosen === 'admin' && stepName === 'Guardrails' && (
        <div>
          <h2 className="text-lg font-bold">Safety guardrails are on</h2>
          <p className="text-sm text-slate-500 mt-1">These run automatically — editable later in Settings.</p>
          <div className="mt-5 space-y-2">
            {[
              'Human approval gate — no reply ever auto-sends.',
              'Legal / regulatory → flagged for a human, never admits liability.',
              'Health / adverse reaction → advise stop use + consult a professional.',
              'Quality complaint → request photo/video evidence before resolving.',
              'Grounded only → no invented policy, prices, or order data.',
            ].map((g) => (
              <div key={g} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <AlertTriangle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-600 leading-snug">{g}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DONE (both roles) */}
      {stepName === 'Done' && (
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-6 h-6" /></div>
          <h2 className="text-lg font-bold">You're all set</h2>
          <p className="text-sm text-slate-500 mt-1">
            {chosen === 'admin'
              ? 'Your workspace is configured. Head to the dashboard to monitor and manage support.'
              : 'Jump into the inbox — triaged emails and ready drafts are waiting.'}
          </p>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between mt-7">
        <button onClick={stepIndex === 0 ? () => setChosen(null) : back} className="text-xs font-bold text-slate-400 hover:text-slate-600">&larr; Back</button>
        {isLast ? (
          <button onClick={finish} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            <Inbox className="w-4 h-4" /> {chosen === 'admin' ? 'Enter dashboard' : 'Enter the inbox'}
          </button>
        ) : (
          <button onClick={next} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );
}
