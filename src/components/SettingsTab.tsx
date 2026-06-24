import React, { useState } from 'react';
import { SettingsRule } from '../types';
import { 
  Settings, 
  SwitchCamera, 
  HelpCircle, 
  Mail, 
  GitPullRequest, 
  Save, 
  Sparkles,
  Users,
  Webhook,
  Activity,
  FileCheck
} from 'lucide-react';

interface SettingsTabProps {
  rules: SettingsRule[];
  setRules: (rules: SettingsRule[]) => void;
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
}

export default function SettingsTab({ 
  rules, 
  setRules,
  selectedAgent,
  setSelectedAgent
}: SettingsTabProps) {
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [supportEmail, setSupportEmail] = useState<string>('leads@beastlife.com');
  const [slackWebhook, setSlackWebhook] = useState<string>('https://hooks.slack.com/services/T0123/B4567/BLG89');
  const [autoApproveQuality, setAutoApproveQuality] = useState<boolean>(true);
  const [requireEvidenceBeforeEscalation, setRequireEvidenceBeforeEscalation] = useState<boolean>(true);

  // Toggle rule enabled state
  const handleToggleRule = (ruleId: string) => {
    const updatedRules = rules.map(rule => {
      if (rule.id === ruleId) {
        return { ...rule, enabled: !rule.enabled };
      }
      return rule;
    });
    setRules(updatedRules);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Workspace settings and escalation triggers successfully updated!');
    }, 1000);
  };

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] p-6 gap-6 bg-[#F8FAFC] overflow-y-auto">
      
      {/* LEFT COLUMN: ACTIVE ESCALATION TRIGGERS */}
      <div className="space-y-6">
        
        {/* Title */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Dynamic Escalation & Routing Rules</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Toggle criteria that trigger Tier 3 human agent alerts and bypass standard drafts</p>
        </div>

        {/* Rules List Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operational triggers</h4>

          <div className="space-y-4">
            {rules.map((rule) => (
              <div 
                key={rule.id}
                className={`p-4 border rounded-xl flex items-start gap-4 transition-all ${
                  rule.enabled 
                    ? 'border-emerald-200 bg-emerald-50/10' 
                    : 'border-slate-200 bg-slate-50/30'
                }`}
              >
                {/* Checkbox Toggle element */}
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`w-10 h-6 rounded-full p-1 transition-all relative shrink-0 mt-0.5 cursor-pointer ${
                    rule.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                    rule.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-slate-800">{rule.title}</h5>
                    {rule.enabled ? (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded leading-none uppercase tracking-wide">
                        Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded leading-none uppercase tracking-wide">
                        Standby
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{rule.description}</p>
                  
                  {rule.keywords && rule.keywords.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap pt-2">
                      {rule.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] font-mono bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 leading-none shadow-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global LLM Safety Parameters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Quality Guardrails</h4>
          
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1.5 pr-4 flex-1">
              <h5 className="text-xs font-bold text-slate-800">Mandate Draft Co-Pilot Co-Signing</h5>
              <p className="text-xs text-slate-500 leading-snug">
                When enabled, AI automatically prepares draft emails but forbids transmission until a human reviews and approves. Disabling this flags standard Q&A queries for direct autoresponse.
              </p>
            </div>
            <button
              onClick={() => setAutoApproveQuality(!autoApproveQuality)}
              className={`w-10 h-6 rounded-full p-1 transition-all relative shrink-0 cursor-pointer ${
                autoApproveQuality ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                autoApproveQuality ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1.5 pr-4 flex-1">
              <h5 className="text-xs font-bold text-slate-800">Quality complaint requires evidence before escalation</h5>
              <p className="text-xs text-slate-500 leading-snug">
                For quality complaints (damaged, wrong item, missing, expired), the draft must request a photo or video and the batch number before the case can be escalated or marked resolved.
              </p>
            </div>
            <button
              onClick={() => setRequireEvidenceBeforeEscalation(!requireEvidenceBeforeEscalation)}
              className={`w-10 h-6 rounded-full p-1 transition-all relative shrink-0 cursor-pointer ${
                requireEvidenceBeforeEscalation ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                requireEvidenceBeforeEscalation ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSPACE META & ACTIVE PROFILE */}
      <div className="space-y-6">
        
        {/* Workspace Routing Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Workspace metadata Routing</h4>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                Inbound support Inbox Alias
              </label>
              <input 
                type="email" 
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#FCFCFE] border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Webhook className="w-3.5 h-3.5" />
                Slack Notifications webhook
              </label>
              <input 
                type="text" 
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#FCFCFE] border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Change Active Agent profile - Visual fun! */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Workspace Agent Profile</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Determine whose personality handles live dashboard queues</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'Alex Carter', title: 'Lead Agent', initial: 'AC', desc: 'Expert in sports dietetics.' },
              { id: 'Marcus Chen', title: 'Senior Lead Agent', initial: 'MC', desc: 'Handles escalation threads.' },
              { id: 'Alex Miller', title: 'KB Admin', initial: 'AM', desc: 'Manages article references.' },
              { id: 'Support Admin', title: 'Tier 3 Admin', initial: 'SA', desc: 'Root master console.' }
            ].map((agnt) => (
              <button
                key={agnt.id}
                onClick={() => setSelectedAgent(agnt.id)}
                className={`p-3.5 border rounded-xl text-left transition-all cursor-pointer ${
                  selectedAgent === agnt.id 
                    ? 'border-emerald-500 bg-emerald-50/10 shadow-sm' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    selectedAgent === agnt.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {agnt.initial}
                  </div>
                  <h5 className="text-[11px] font-bold text-slate-800 leading-tight">{agnt.id}</h5>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">{agnt.title} &bull; {agnt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Save Workspace Buttons */}
        <div className="flex">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 hover:border-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Syncing...' : 'Save Workspace Parameters'}
          </button>
        </div>
      </div>
    </div>
  );
}
