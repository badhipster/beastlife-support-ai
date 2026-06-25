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
import Login from './components/Login';

import { INITIAL_RULES } from './data/mockData';
import { EmailThread, SettingsRule, Role } from './types';

interface Me {
  email: string;
  name: string;
  picture: string;
  role: Role | null;
}

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
  const [subTab, setSubTab] = useState<'all' | 'queue'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [gmailNotice, setGmailNotice] = useState<{ ok: boolean; email?: string } | null>(null);
  // Authenticated user: undefined = loading, null = signed out.
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const role = me?.role ?? null;

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user || null))
      .catch(() => setMe(null));
  }, []);

  // Onboarding finished: reflect the chosen role locally.
  const handleRoleChosen = (r: Role) => {
    setMe((prev) => (prev ? { ...prev, role: r } : prev));
    setActiveTab('inbox');
    setSelectedThread(null);
  };

  // If the current role can't access the open tab, fall back to the inbox.
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

  // SubTab Filtering: My Queue = threads assigned to the signed-in agent.
  const getFilteredSubtypeThreads = (list: EmailThread[]) => {
    if (subTab === 'queue') {
      return list.filter(t => me?.email && t.assignedTo === me.email);
    }
    return list;
  };

  // Claim = assign this thread to the current agent (it moves into My Queue).
  const handleClaimThread = (threadId: string) => {
    const email = me?.email;
    setThreads(prev => prev.map(t => (t.id === threadId ? { ...t, assignedTo: email } : t)));
    if (selectedThread?.id === threadId) {
      setSelectedThread(s => (s ? { ...s, assignedTo: email } : s));
    }
    fetch(`/api/emails/${threadId}/claim`, { method: 'POST' }).catch((err) => console.error('Claim failed:', err));
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

  // Auth + onboarding gate.
  if (me === undefined) {
    return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  }
  if (me === null) {
    return <Login />;
  }
  if (!me.role) {
    return <OnboardingFlow user={{ name: me.name }} onDone={handleRoleChosen} />;
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
        allowedTabs={ROLE_TABS[me.role]}
        role={me.role}
        user={{ name: me.name, email: me.email, picture: me.picture }}
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
          showSubTabs={activeTab === 'inbox' && !selectedThread}
          allCount={threads.length}
          queueCount={threads.filter(t => me.email && t.assignedTo === me.email).length}
          openaiModel="Gemini 2.5 Flash"
        />

        {/* MAIN VISUAL WORKSPACE PANEL */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {selectedThread ? (
            <DetailView
              thread={selectedThread}
              onBack={() => setSelectedThread(null)}
              onUpdateThread={handleUpdateThread}
              onClaim={handleClaimThread}
              currentEmail={me.email}
            />
          ) : (
            <>
              {/* Tab routing views */}
              {activeTab === 'inbox' && (
                <InboxTab
                  threads={getFilteredSubtypeThreads(threads)}
                  onSelectThread={(thread) => setSelectedThread(thread)}
                  searchQuery={searchQuery}
                  currentEmail={me.email}
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
