import React, { useState, useEffect } from 'react';
import { Zap, Inbox, ShieldCheck, Mail, ArrowRight, CheckCircle2, UserCog, Headset } from 'lucide-react';
import { Role } from '../types';

interface OnboardingFlowProps {
  // Persists the chosen role (localStorage + app state) and enters the app.
  persistRole: (role: Role) => void;
}

// First-run onboarding: choose a role, then (admin) connect the support inbox.
export default function OnboardingFlow({ persistRole }: OnboardingFlowProps) {
  const [step, setStep] = useState<'role' | 'connect'>('role');
  const [gmail, setGmail] = useState<{ configured: boolean; connected: boolean; email?: string }>({ configured: false, connected: false });

  useEffect(() => {
    if (step !== 'connect') return;
    fetch('/api/gmail/status').then((r) => r.json()).then(setGmail).catch(() => {});
  }, [step]);

  const connectGmail = () => {
    // Remember the role before leaving for OAuth so the redirect lands in the app.
    localStorage.setItem('bl_role', 'admin');
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-6 font-sans text-slate-200">
      <div className="w-full max-w-2xl">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight leading-tight">BeastLife</h1>
            <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest leading-none mt-0.5">Support AI</p>
          </div>
        </div>

        {step === 'role' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800">
            <h2 className="text-lg font-bold">Welcome — let's get you set up</h2>
            <p className="text-sm text-slate-500 mt-1">Choose how you'll use BeastLife Support AI. You can switch roles anytime.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <button
                onClick={() => persistRole('agent')}
                className="text-left p-5 border border-slate-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Headset className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Support Agent</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">Work the inbox queue: review AI drafts, approve &amp; send, and handle escalations.</p>
                <span className="text-[11px] font-bold text-emerald-600 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Continue as Agent <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>

              <button
                onClick={() => setStep('connect')}
                className="text-left p-5 border border-slate-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <UserCog className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">CX Lead / Admin</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">Set up and oversee: connect Gmail, manage the knowledge base and rules, watch analytics.</p>
                <span className="text-[11px] font-bold text-emerald-600 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Continue as Admin <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 'connect' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800">
            <button onClick={() => setStep('role')} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 mb-3">&larr; Back</button>
            <h2 className="text-lg font-bold">Connect your support inbox</h2>
            <p className="text-sm text-slate-500 mt-1">Link the Gmail inbox the AI should triage and reply from. You approve every reply before it sends.</p>

            <div className="mt-6 p-5 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Gmail support inbox</h3>
                  {gmail.connected ? (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected{gmail.email ? ` — ${gmail.email}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">Not connected yet</p>
                  )}
                </div>
              </div>
              {gmail.connected ? (
                <button onClick={connectGmail} className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Reconnect
                </button>
              ) : (
                <button onClick={connectGmail} className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shrink-0">
                  Connect Gmail
                </button>
              )}
            </div>

            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> How your data is handled
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">OAuth 2.0, encrypted in transit. No mailbox access without your sign-in, and no reply ever sends without a human approving it.</p>
            </div>

            <button
              onClick={() => persistRole('admin')}
              className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Inbox className="w-4 h-4" />
              Enter dashboard
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">You can connect or reconnect the inbox later from the Onboarding tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}
