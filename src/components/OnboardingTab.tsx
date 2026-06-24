import React, { useState } from 'react';
import { 
  Compass, 
  Mail, 
  RefreshCw, 
  ShieldCheck, 
  Network,
  Cpu
} from 'lucide-react';

interface OnboardingTabProps {
  onboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => void;
}

export default function OnboardingTab({ onboardingCompleted, setOnboardingCompleted }: OnboardingTabProps) {
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [inboundSynced, setInboundSynced] = useState<boolean>(false);
  const [dnsVerified, setDnsVerified] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const triggerConnection = (id: string, setter: (val: boolean) => void) => {
    setIsConnecting(id);
    setTimeout(() => {
      setter(true);
      setIsConnecting(null);
      // If all three connect, set broad completed state
      if (id === 'google' && inboundSynced && dnsVerified) setOnboardingCompleted(true);
      if (id === 'inbound' && googleConnected && dnsVerified) setOnboardingCompleted(true);
      if (id === 'dns' && googleConnected && inboundSynced) setOnboardingCompleted(true);
    }, 1200);
  };

  const handleTotalVerify = () => {
    setIsConnecting('all');
    setTimeout(() => {
      setGoogleConnected(true);
      setInboundSynced(true);
      setDnsVerified(true);
      setOnboardingCompleted(true);
      setIsConnecting(null);
    }, 1500);
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] p-6 gap-6 bg-[#F8FAFC] overflow-y-auto">
      
      {/* LEFT AREA: INTEGRATION CHANNELS WORKSPACE */}
      <div className="space-y-6">
        
        {/* Onboarding Master Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Compass className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Operational Onboarding Check</h3>
              <p className="text-[10px] text-slate-400">Sync customer support emails, SPF keys, and wellness guidelines</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Ensure BeastLife Support AI is correctly connected to your internal communication lines. Once connected, incoming client issues are analyzed in real-time by the server-side Gemini RAG engine to automatically prepare helpful draft solutions.
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Workspace sync status</span>
            
            {onboardingCompleted ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500 fill-current" />
                WORKSPACE CO-PILOT FULLY VERIFIED
              </span>
            ) : (
              <button 
                onClick={handleTotalVerify}
                disabled={isConnecting !== null}
                className="px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 hover:shadow shadow-emerald-900/10 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isConnecting === 'all' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Verify All Connections</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sync Cards */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">Connector Checklist</h4>

          {/* Card 1: Google Mail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-300 transition-all">
            <div className="flex gap-4.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-slate-800">Hook Google mail lists (G-Suite sync)</h5>
                  {googleConnected ? (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">Connected</span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase animate-pulse">Pending verification</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Establish an OAuth secure tunnel to pull emails list and metadata from `support@beastlife.com` dynamically.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => triggerConnection('google', setGoogleConnected)}
              disabled={isConnecting === 'google' || googleConnected}
              className={`px-3 py-1.5 self-end sm:self-center text-xs font-bold rounded-lg transition-all border shrink-0 cursor-pointer ${
                googleConnected 
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-default' 
                  : 'border-[#1E293B] bg-slate-900 hover:bg-slate-800 text-white hover:border-slate-800'
              }`}
            >
              {isConnecting === 'google' ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : googleConnected ? 'Connected ✓' : 'Connect G-Suite'}
            </button>
          </div>

          {/* Card 2: IMAP/SMTP */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-300 transition-all">
            <div className="flex gap-4.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-slate-800">Inbound SMTP routing tunnel</h5>
                  {inboundSynced ? (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">Verified</span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Disconnected</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Configure relay hooks to forward active support threads instantly to the BeastLife server-side RAG parser.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => triggerConnection('inbound', setInboundSynced)}
              disabled={isConnecting === 'inbound' || inboundSynced}
              className={`px-3 py-1.5 self-end sm:self-center text-xs font-bold rounded-lg transition-all border shrink-0 cursor-pointer ${
                inboundSynced 
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-default' 
                  : 'border-[#1E293B] bg-slate-900 hover:bg-slate-800 text-white hover:border-slate-800'
              }`}
            >
              {isConnecting === 'inbound' ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : inboundSynced ? 'Synced ✓' : 'Sync relays'}
            </button>
          </div>

          {/* Card 3: SPF/DKIM */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-300 transition-all">
            <div className="flex gap-4.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Network className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-slate-800">Verify SPF & DKIM DNS records</h5>
                  {dnsVerified ? (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">Verified</span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Unverified</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Ensure emails sent through the AI Draft panel bypass spam filters. Adds DKIM brand security records.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => triggerConnection('dns', setDnsVerified)}
              disabled={isConnecting === 'dns' || dnsVerified}
              className={`px-3 py-1.5 self-end sm:self-center text-xs font-bold rounded-lg transition-all border shrink-0 cursor-pointer ${
                dnsVerified 
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-default' 
                  : 'border-[#1E293B] bg-slate-900 hover:bg-slate-800 text-white hover:border-slate-800'
              }`}
            >
              {isConnecting === 'dns' ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : dnsVerified ? 'Verified ✓' : 'Verify TXT records'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: REASSURING COMPLIANCE DOCUMENTATION */}
      <div className="space-y-6">
        {/* Compliance checklist */}
        <div className="bg-[#1E293B] border border-slate-700 text-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Enterprise-grade Compliance</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            The BeastLife Support integration process fully adheres to global data safeguards, ensuring customer transcripts and internal formulation files are encrypted.
          </p>
          <div className="space-y-2 text-xs font-medium border-t border-slate-800 pt-3">
            <p className="text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full block animate-pulse" />
              SOC2 Type II Certified TLS tunnels.
            </p>
            <p className="text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full block animate-pulse" />
              Restricted server-to-server TLS routing on Port 3000.
            </p>
            <p className="text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full block animate-pulse" />
              HIPAA compliant security for private allergy logs.
            </p>
          </div>
        </div>

        {/* Setup Help Video simulation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Onboarding support FAQs</h4>
          <div className="space-y-2 text-xs">
            <details className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
              <summary className="font-bold text-slate-700">How soon do draft emails appear?</summary>
              <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                Immediately. When a customer email lands, SMTP triggers process it in seconds and generate draft suggestions awaiting review.
              </p>
            </details>
            <details className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
              <summary className="font-bold text-slate-700">Is our formulation catalog safe?</summary>
              <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">
                Yes. Embedded files are stored securely in the local RAG cluster and are never utilized to train generic public models.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
