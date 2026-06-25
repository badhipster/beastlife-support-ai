import React from 'react';
import {
  Zap,
  Inbox,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Settings,
  HelpCircle,
  Shield,
  Edit2
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openThreadsCount: number;
  escalatedCount: number;
  onboardingCompleted: boolean;
  allowedTabs: string[];
  role: Role;
  user: { name: string; email: string; picture: string }; // Still passed, but not used in UI directly anymore
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  openThreadsCount,
  escalatedCount,
  onboardingCompleted,
  allowedTabs,
  role
}: SidebarProps) {

  const allNavItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: openThreadsCount },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle, count: escalatedCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const navItems = allNavItems.filter((item) => allowedTabs.includes(item.id));

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#111827] flex flex-col py-5 border-r border-slate-800 z-50 text-slate-300">
      {/* Brand Header */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#86efac] rounded-lg flex items-center justify-center text-[#111827]">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight leading-tight">BeastLife</h1>
          <p className="text-[10px] text-[#86efac] font-semibold tracking-widest leading-none mt-0.5">Support Core</p>
        </div>
      </div>

      {/* Compose Button */}
      <div className="px-4 mb-6">
        <button className="w-full flex items-center justify-center gap-2 bg-[#86efac] hover:bg-green-400 text-slate-900 font-bold py-2.5 rounded-xl transition-all shadow-sm cursor-pointer">
          <Edit2 className="w-4 h-4 fill-current" /> Compose
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-slate-800/80 text-[#86efac] border-l-4 border-[#86efac]'
                  : 'hover:bg-slate-800/40 text-slate-400 border-l-4 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-[#86efac]' : 'text-slate-500'}`} />
              <span className="flex-1 text-left">{item.label}</span>

              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                  item.id === 'escalations' ? 'bg-rose-500' : 'bg-slate-700'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="px-4 py-4 mt-auto space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-800/40">
          <HelpCircle className="w-4 h-4" /> Help
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-800/40">
          <Shield className="w-4 h-4" /> Privacy
        </button>
      </div>
    </aside>
  );
}
