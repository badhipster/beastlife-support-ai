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
  FileCheck,
  Clock,
  Plus,
  Trash2,
  Bell,
  SlidersHorizontal,
  X
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
  
  const [slaResponseTime, setSlaResponseTime] = useState<number>(4);
  const [workingHoursStart, setWorkingHoursStart] = useState<string>('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState<string>('17:00');
  
  // Real backend data states
  const [users, setUsers] = useState<any[]>([]);
  const [gmailStatus, setGmailStatus] = useState<{configured: boolean, connected: boolean, email: string | null}>({ configured: false, connected: false, email: null });

  React.useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(data => setUsers(data.users || []));
    fetch('/api/gmail/status').then(res => res.json()).then(data => setGmailStatus(data));
  }, []);
  
  const [toneProfiles, setToneProfiles] = useState<Record<string, string>>({
    'Legal': 'Professional',
    'Product Issue': 'Empathetic',
    'Delivery Issue': 'Apologetic',
    'Return/Refund': 'Concise',
    'Billing': 'Direct',
    'General Enquiry': 'Friendly'
  });

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
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] p-6 gap-6 bg-transparent overflow-y-auto">
      
      {/* LEFT COLUMN: ACTIVE ESCALATION TRIGGERS */}
      <div className="space-y-6">
        
        {/* Title */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Dynamic Escalation & Routing Rules</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Toggle criteria that trigger Tier 3 human agent alerts and bypass standard drafts</p>
        </div>

        {/* Rules List Box */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Operational triggers</h4>

          <div className="space-y-4">
            {rules.map((rule) => (
              <div 
                key={rule.id}
                className={`p-4 rounded-[16px] flex items-start gap-4 transition-all ${
                  rule.enabled 
                    ? 'bg-m3-surface-variant shadow-sm border border-slate-200/50' 
                    : 'bg-slate-50 border border-slate-100'
                }`}
              >
                {/* Checkbox Toggle element */}
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`w-10 h-6 rounded-full p-1 transition-all relative shrink-0 mt-0.5 cursor-pointer ${
                    rule.enabled ? 'bg-[#1A73E8]' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                    rule.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-semibold text-slate-800">{rule.title}</h5>
                    {rule.enabled ? (
                      <span className="text-[9px] font-semibold text-[#1A73E8] bg-blue-50 px-2 py-0.5 rounded leading-none uppercase tracking-wide">
                        Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded leading-none uppercase tracking-wide">
                        Standby
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{rule.description}</p>
                  
                  {rule.keywords && rule.keywords.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {rule.keywords.map((kw, i) => (
                          <span key={i} className="text-[10px] font-mono bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 leading-none shadow-sm flex items-center gap-1">
                            {kw}
                            <button className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                        <button className="text-[10px] font-mono bg-slate-50 border border-dashed border-slate-300 text-slate-500 rounded px-1.5 py-0.5 leading-none hover:bg-slate-100 flex items-center gap-1">
                          <Plus className="w-2.5 h-2.5" /> Add
                        </button>
                      </div>
                      
                      {/* Threshold Input */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-500">Threshold:</span>
                        <input type="range" min="1" max="10" defaultValue="7" className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                        <span className="text-[10px] text-slate-400">High sensitivity</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global LLM Safety Parameters */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">AI Quality Guardrails</h4>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-none">
            <div className="space-y-1.5 pr-4 flex-1">
              <h5 className="text-xs font-semibold text-slate-800">Mandate Draft Co-Pilot Co-Signing</h5>
              <p className="text-xs text-slate-500 leading-snug">
                When enabled, AI automatically prepares draft emails but forbids transmission until a human reviews and approves. Disabling this flags standard Q&A queries for direct autoresponse.
              </p>
            </div>
            <button
              onClick={() => setAutoApproveQuality(!autoApproveQuality)}
              className={`w-10 h-6 rounded-full p-1 transition-all relative shrink-0 cursor-pointer ${
                autoApproveQuality ? 'bg-[#1A73E8]' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                autoApproveQuality ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-none">
            <div className="space-y-1.5 pr-4 flex-1">
              <h5 className="text-xs font-semibold text-slate-800">Quality complaint requires evidence before escalation</h5>
              <p className="text-xs text-slate-500 leading-snug">
                For quality complaints (damaged, wrong item, missing, expired), the draft must request a photo or video and the batch number before the case can be escalated or marked resolved.
              </p>
            </div>
            <button
              onClick={() => setRequireEvidenceBeforeEscalation(!requireEvidenceBeforeEscalation)}
              className={`w-10 h-6 rounded-full p-1 transition-all relative shrink-0 cursor-pointer ${
                requireEvidenceBeforeEscalation ? 'bg-[#1A73E8]' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${
                requireEvidenceBeforeEscalation ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Tone Profile Configuration */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tone Profiles per Category</h4>
          <p className="text-[10px] text-slate-500">Set the default AI tone for drafts based on the predicted category.</p>
          
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(toneProfiles).map(([category, tone]) => (
              <div key={category} className="flex flex-col gap-1.5 p-3 border-none rounded-2xl bg-m3-surface-variant">
                <span className="text-[11px] font-semibold text-slate-700">{category}</span>
                <select 
                  value={tone}
                  onChange={(e) => setToneProfiles({...toneProfiles, [category]: e.target.value})}
                  className="w-full text-xs bg-white border-none rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#1A73E8]"
                >
                  <option value="Empathetic">Empathetic</option>
                  <option value="Professional">Professional</option>
                  <option value="Concise">Concise</option>
                  <option value="Apologetic">Apologetic</option>
                  <option value="Direct">Direct</option>
                  <option value="Friendly">Friendly</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSPACE META & ACTIVE PROFILE */}
      <div className="space-y-6">
        
        {/* Workspace Routing Configuration */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Workspace metadata Routing</h4>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                Inbound support Inbox Alias
              </label>
              <input 
                type="email" 
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-m3-surface-variant border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1A73E8] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Webhook className="w-3.5 h-3.5" />
                Slack Notifications webhook
              </label>
              <input 
                type="text" 
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full px-4 py-2.5 bg-m3-surface-variant border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1A73E8] focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* SLA Targets & Working Hours */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            SLA & Working Hours
          </h4>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">SLA Target (Hours)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={slaResponseTime}
                  onChange={(e) => setSlaResponseTime(parseInt(e.target.value) || 0)}
                  className="w-20 px-4 py-2 bg-m3-surface-variant border-none rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
                <span className="text-[11px] text-slate-500">hours to respond</span>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Working Hours (Local Time)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  className="px-4 py-2 bg-m3-surface-variant border-none rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
                <span className="text-xs text-slate-400">to</span>
                <input 
                  type="time" 
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  className="px-4 py-2 bg-m3-surface-variant border-none rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Connected Gmail Accounts */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Connected Accounts</h4>
            <button 
              onClick={() => window.location.href = '/api/auth/google'}
              className="text-[10px] font-semibold text-[#1A73E8] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Account
            </button>
          </div>
          
          <div className="space-y-2">
            {gmailStatus.connected && gmailStatus.email ? (
              <div className="flex items-center justify-between p-3 border-none rounded-2xl bg-m3-surface-variant">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">{gmailStatus.email}</span>
                  <span className="text-[9px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded uppercase">Active</span>
                </div>
                <button className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border-none rounded-2xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">No account connected</span>
                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded uppercase">Disconnected</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Active Agent profile - Visual fun! */}
        <div className="bg-m3-surface border border-slate-200/50 rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Team Members & Notifications</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Manage agents and their notification preferences</p>
            </div>
            <button className="text-[10px] font-semibold text-[#1A73E8] flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Invite
            </button>
          </div>

          <div className="space-y-2.5">
            {users.map((agnt) => (
              <div
                key={agnt.id}
                className={`p-3.5 border-none rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                  selectedAgent === agnt.name 
                    ? 'bg-m3-primary-container shadow-sm' 
                    : 'hover:bg-m3-surface-variant'
                }`}
                onClick={() => setSelectedAgent(agnt.name)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    selectedAgent === agnt.name ? 'bg-[#1A73E8] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {agnt.picture ? <img src={agnt.picture} alt={agnt.name} className="w-full h-full rounded-full" /> : agnt.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-semibold text-slate-800 leading-tight flex items-center gap-1.5">
                      {agnt.name}
                      {selectedAgent === agnt.name && <span className="text-[9px] font-semibold text-[#1A73E8] bg-blue-100 px-1.5 py-0.5 rounded leading-none">Active Profile</span>}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 capitalize">{agnt.role} &bull; {agnt.email}</p>
                  </div>
                </div>
                
                {/* Notification Toggle */}
                <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button className={`w-8 h-4 rounded-full p-0.5 transition-all relative ${
                    agnt.role === 'admin' ? 'bg-green-500' : 'bg-slate-300'
                  }`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow transition-all ${
                      agnt.role === 'admin' ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                  <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                    <Bell className="w-2.5 h-2.5" /> Alerts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Workspace Buttons */}
        <div className="flex">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-m3-primary border-none text-white rounded-full text-xs font-bold hover:bg-[#0842A0] transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Syncing...' : 'Save Workspace Parameters'}
          </button>
        </div>
      </div>
    </div>
  );
}
