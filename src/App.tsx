import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InboxTab from './components/InboxTab';
import EscalationTab from './components/EscalationTab';
import DetailView from './components/DetailView';
import AnalyticsTab from './components/AnalyticsTab';
import KnowledgeBaseTab from './components/KnowledgeBaseTab';
import SettingsTab from './components/SettingsTab';
import OnboardingTab from './components/OnboardingTab';

import { INITIAL_THREADS, INITIAL_RULES } from './data/mockData';
import { EmailThread, SettingsRule } from './types';

export default function App() {
  const [threads, setThreads] = useState<EmailThread[]>(INITIAL_THREADS);
  const [rules, setRules] = useState<SettingsRule[]>(INITIAL_RULES);
  const [selectedAgent, setSelectedAgent] = useState<string>('Alex Carter');
  const [activeTab, setActiveTab] = useState<string>('inbox');
  const [subTab, setSubTab] = useState<'all' | 'queue' | 'team'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);

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
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-800">
      
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
