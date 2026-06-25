import React from 'react';
import { Zap, ShieldCheck } from 'lucide-react';

// Sign-in screen. Real auth via Google; the server starts the OAuth login flow.
export default function Login() {
  return (
    <div className="min-h-screen w-full bg-[#F6F8FC] flex items-center justify-center p-6 font-sans text-slate-700">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#1A73E8] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight leading-tight">BeastLife</h1>
            <p className="text-[10px] text-[#1A73E8]/80 font-semibold uppercase tracking-widest leading-none mt-0.5">Support AI</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-md border border-slate-200 text-slate-800">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">Use your Google account to access the support workspace.</p>

          <a
            href="/api/auth/login"
            className="mt-6 w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-[#F2F6FC] transition-all"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Sign in with Google
          </a>

          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
            OAuth 2.0 — we only read your name and email to create your account.
          </p>
        </div>
        <p className="text-[11px] text-slate-500 mt-4">In testing mode, only whitelisted Google accounts can sign in.</p>
      </div>
    </div>
  );
}

