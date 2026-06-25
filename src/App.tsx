import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InboxTab from './components/InboxTab';
import EscalationTab from './components/EscalationTab';
import DetailView from './components/DetailView';
import AnalyticsTab from './components/AnalyticsTab';
import KnowledgeBaseTab from './components/KnowledgeBaseTab';
import SettingsTab from './components/SettingsTab';
import OnboardingTab from './components/OnboardingTab';
import OnboardingFlow from './components/OnboardingFlow';

import { INITIAL_RULES } from './data/mockData';
import { EmailThread, SettingsRule, Role } from './types';

// Which tabs each role can access (admin = everything; agent = working surface).
const ROLE_TABS: Record<Role, string[]> = {
  admin: ['inbox', 'escalations', 'analytics', 'kb', 'onboarding', 'settings'],
  agent: ['inbox', 'escalations', 'analytics'],
};

// Persist a thread change to the backend (no-op server-side when no DB).
function persistThread(id: string, patch: Partial<EmailThread>) {
  fetch(`/api/emails/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: patch.category,
      sentiment: patch.sentiment,
      intent: patch.intent,
      status: patch.status,
      draftStatus: patch.draftStatus,
      triggerReason: patch.triggerReason,
    }),
  }).catch((err) => console.error('Failed to persist thread update:', err));
}

export default function App() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [rules, setRules] = useState<SettingsRule[]>(INITIAL_RULES);
  const [selectedAgent, setSelectedAgent] = useState<string>('Alex Carter');
  const [activeTab, setActiveTab] = useState<string>('inbox');
  const [subTab, setSubTab] = useState<'all' | 'queue' | 'team'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [gmailNotice, setGmailNotice] = useState<{ ok: boolean; email?: string } | null>(null);
  const [role, setRole] = useState<Role | null>(() => localStorage.getItem('bl_role') as Role | null);

  // Set/switch the active role (persisted), and reset to a safe tab.
  const persistRole = (r: Role) => {
    localStorage.setItem('bl_role', r);
    setRole(r);
    setActiveTab('inbox');
    setSelectedThread(null);
  };

  // If the current role can't access the open tab (e.g. after a role switch),
  // fall back to the inbox.
  useEffect(() => {
    if (role && !ROLE_TABS[role].includes(activeTab)) {
      setActiveTab('inbox');
      setSelectedThread(null);
    }
  }, [role, activeTab]);

  // Load threads from the API (Postgres when configured, else seeded mock data).
  useEffect(() => {
    fetch('/api/emails')
      .then((r) => r.json())
      .then((data) => setThreads(data.threads || []))
      .catch((err) => console.error('Failed to load emails:', err));
  }, []);

  // Show a confirmation when the Gmail OAuth callback redirects back here, then
  // strip the params from the URL so a refresh doesn't re-show it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get('gmail');
    if (!gmail) return;
    setGmailNotice({ ok: gmail === 'connected', email: params.get('email') || undefined });
    window.history.replaceState({}, '', window.location.pathname);
    const t = setTimeout(() => setGmailNotice(null), 6000);
    return () => clearTimeout(t);
  }, []);

  // Derive counts dynamically
  const openThreadsCount = threads.filter(t => t.status === 'Open').length;
  const escalatedCount = threads.filter(t => t.status === 'Escalated').length;

  // Search query action placeholder helper
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'inbox': return 'Search customer records...';
      case 'escalations': return 'Search escalation triggers...';
      case 'kb': return 'Search articles catalogue...';
      default: return 'Search workspace...';
    }
  };

  // SubTab Filtering
  const getFilteredSubtypeThreads = (list: EmailThread[]) => {
    if (subTab === 'queue') {
      // In a real database, filters by current agent's claimed threads
      // Standard mock logic: Claimed are THR-001, THR-003, THR-005
      return list.filter(t => ['THR-001', 'THR-003', 'THR-005'].includes(t.id));
    }
    if (subTab === 'team') {
      return list.filter(t => t.contactCount > 1 || t.status === 'Replied');
    }
    return list;
  };

  // Claim click handler
  const handleClaimThread = (threadId: string) => {
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          status: 'Open', // Claimed moves to open queue
          triggerReason: 'Claimed by ' + selectedAgent
        };
      }
      return t;
    }));
    persistThread(threadId, { status: 'Open', triggerReason: 'Claimed by ' + selectedAgent });
    alert(`Case ${threadId} has been added to your queue!`);
  };

  // Row update callbacks (passed to DetailView)
  const handleUpdateThread = (updatedThread: EmailThread) => {
    setThreads(prev => prev.map(t => {
      if (t.id === updatedThread.id) {
        return updatedThread;
      }
      return t;
    }));
    // Keep reference in detail view synced
    if (selectedThread && selectedThread.id === updatedThread.id) {
      setSelectedThread(updatedThread);
    }
    persistThread(updatedThread.id, updatedThread);
  };

  // First-run gate: no role chosen yet -> onboarding step.
  if (!role) {
    return <OnboardingFlow persistRole={persistRole} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-800">

      {/* Gmail connect confirmation toast (after OAuth redirect) */}
      {gmailNotice && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
          gmailNotice.ok ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'
        }`}>
          {gmailNotice.ok
            ? `Gmail connected${gmailNotice.email ? ` — ${gmailNotice.email}` : ''}. New mail will appear within ~60s.`
            : 'Gmail connection failed. Check the server logs and try again.'}
        </div>
      )}

      {/* PERSISTENT LEFT SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedThread(null); // Clear selected drawer context when shifting tabs
        }}
        openThreadsCount={openThreadsCount}
        escalatedCount={escalatedCount}
        onboardingCompleted={onboardingCompleted}
        allowedTabs={ROLE_TABS[role]}
        role={role}
        onSwitchRole={persistRole}
      />

      {/* PRIMARY DESKTOP APP FLOW CONTAINER */}
      <div className="flex-1 pl-[260px] flex flex-col h-screen overflow-hidden">
        
        {/* CONTEXT HEADER BAR */}
        <Header 
          title={activeTab.toUpperCase()}
          searchPlaceholder={getSearchPlaceholder()}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          subTab={subTab}
          setSubTab={setSubTab}
          openaiModel="Gemini 2.5 Flash"
        />

        {/* MAIN VISUAL WORKSPACE PANEL */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {selectedThread ? (
            <DetailView 
              thread={selectedThread} 
              onBack={() => setSelectedThread(null)}
              onUpdateThread={handleUpdateThread}
            />
          ) : (
            <>
              {/* Tab routing views */}
              {activeTab === 'inbox' && (
                <InboxTab 
                  threads={getFilteredSubtypeThreads(threads)} 
                  onSelectThread={(thread) => setSelectedThread(thread)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'escalations' && (
                <EscalationTab 
                  threads={threads} 
                  onSelectThread={(thread) => setSelectedThread(thread)}
                  onClaimThread={handleClaimThread}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsTab />
              )}

              {activeTab === 'kb' && (
                <KnowledgeBaseTab />
              )}

              {activeTab === 'settings' && (
                <SettingsTab 
                  rules={rules} 
                  setRules={setRules}
                  selectedAgent={selectedAgent}
                  setSelectedAgent={setSelectedAgent}
                />
              )}

              {activeTab === 'onboarding' && (
                <OnboardingTab 
                  onboardingCompleted={onboardingCompleted}
                  setOnboardingCompleted={setOnboardingCompleted}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
