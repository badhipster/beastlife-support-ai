import React from 'react';
import { 
  Zap, 
  Inbox, 
  AlertTriangle, 
  BarChart3, 
  BookOpen, 
  Settings, 
  SquarePen,
  Compass
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openThreadsCount: number;
  escalatedCount: number;
  onboardingCompleted: boolean;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  openThreadsCount,
  escalatedCount,
  onboardingCompleted
}: SidebarProps) {
  
  // Decide active profile based on the loaded tabs
  const getAgentProfile = () => {
    switch (activeTab) {
      case 'analytics':
        return {
          name: 'Alex Chen',
          role: 'Support Lead',
          initials: 'AC',
          photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80'
        };
      case 'kb':
        return {
          name: 'Alex Miller',
          role: 'KB Admin',
          initials: 'AM',
          photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=80&h=80&q=80'
        };
      case 'escalations':
        return {
          name: 'Marcus Chen',
          role: 'Senior Lead Agent',
          initials: 'MC',
          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80'
        };
      case 'settings':
        return {
          name: 'Support Admin',
          role: 'Tier 3 Agent',
          initials: 'SA',
          photo: ''
        };
      default:
        return {
          name: 'Alex Carter',
          role: 'Lead Agent',
          initials: 'AC',
          photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80'
        };
    }
  };

  const agent = getAgentProfile();

  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: openThreadsCount, color: 'text-emerald-400' },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle, count: escalatedCount, color: 'text-red-400' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
    { id: 'onboarding', label: onboardingCompleted ? 'Onboarding (Verified)' : 'Onboarding', icon: Compass },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#0F172A] flex flex-col py-5 border-r border-[#1E293B] z-50 text-slate-300">
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight leading-tight">BeastLife</h1>
          <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest leading-none mt-0.5">Support AI</p>
        </div>
      </div>

      {/* Compose Button */}
      <div className="px-4 mb-6">
        <button 
          onClick={() => setActiveTab('inbox')} 
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-md shadow-emerald-900/10"
        >
          <SquarePen className="w-4 h-4" />
          Compose
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-full flex items-center px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                isActive 
                  ? 'bg-slate-800 text-white font-semibold' 
                  : 'hover:text-white hover:bg-slate-800/40'
              }`}
            >
              {/* Active Stripe Indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500 rounded-r-md" />
              )}
              
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              
              {/* Badge */}
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.id === 'escalations' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="px-4 py-4 border-t border-slate-800 mt-auto">
        <div className="flex items-center gap-3">
          {agent.photo ? (
            <img 
              className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow-sm" 
              src={agent.photo} 
              alt={agent.name} 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-800/50 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-700/50">
              {agent.initials}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-white truncate leading-tight">{agent.name}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{agent.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
