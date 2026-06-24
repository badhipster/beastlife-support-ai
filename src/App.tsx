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

import { INITIAL_TICKETS, INITIAL_RULES } from './data/mockData';
import { Ticket, SettingsRule } from './types';

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [rules, setRules] = useState<SettingsRule[]>(INITIAL_RULES);
  const [selectedAgent, setSelectedAgent] = useState<string>('Alex Carter');
  const [activeTab, setActiveTab] = useState<string>('inbox');
  const [subTab, setSubTab] = useState<'all' | 'queue' | 'team'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);

  // Derive counts dynamically
  const openTicketsCount = tickets.filter(t => t.status === 'Open').length;
  const escalatedCount = tickets.filter(t => t.status === 'Escalated').length;

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
  const getFilteredSubtypeTickets = (list: Ticket[]) => {
    if (subTab === 'queue') {
      // In a real database, filters by current agent's claimed tickets
      // Standard mock logic: Claimed are TKT-001, TKT-003, TKT-005
      return list.filter(t => ['TKT-001', 'TKT-003', 'TKT-005'].includes(t.id));
    }
    if (subTab === 'team') {
      return list.filter(t => t.contactCount > 1 || t.status === 'Replied');
    }
    return list;
  };

  // Claim click handler
  const handleClaimTicket = (ticketId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: 'Open', // Claimed moves to open queue
          triggerReason: 'Claimed by ' + selectedAgent
        };
      }
      return t;
    }));
    alert(`Ticket ${ticketId} has been added to your queue!`);
  };

  // Row update callbacks (passed to DetailView)
  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => {
      if (t.id === updatedTicket.id) {
        return updatedTicket;
      }
      return t;
    }));
    // Keep reference in detail view synced
    if (selectedTicket && selectedTicket.id === updatedTicket.id) {
      setSelectedTicket(updatedTicket);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-800">
      
      {/* PERSISTENT LEFT SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab); 
          setSelectedTicket(null); // Clear selected drawer context when shifting tabs
        }} 
        openTicketsCount={openTicketsCount}
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
          openaiModel="Gemini 3.5 Flash"
        />

        {/* MAIN VISUAL WORKSPACE PANEL */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {selectedTicket ? (
            <DetailView 
              ticket={selectedTicket} 
              onBack={() => setSelectedTicket(null)}
              onUpdateTicket={handleUpdateTicket}
            />
          ) : (
            <>
              {/* Tab routing views */}
              {activeTab === 'inbox' && (
                <InboxTab 
                  tickets={getFilteredSubtypeTickets(tickets)} 
                  onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'escalations' && (
                <EscalationTab 
                  tickets={tickets} 
                  onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                  onClaimTicket={handleClaimTicket}
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
