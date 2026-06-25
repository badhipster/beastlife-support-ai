import React from 'react';
import {
  Zap,
  Inbox,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Settings,
  HelpCircle,
  Shield
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
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#041E49] border-r border-[#041E49] flex flex-col py-6 z-50 text-slate-300 shadow-xl">
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-xl font-medium text-white tracking-tight leading-tight">BeastLife</h1>
          <p className="text-[11px] text-blue-200 font-medium tracking-wide leading-none mt-1">Support Core</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-[232px] mx-3 flex items-center px-4 py-3 my-1 rounded-[16px] text-sm font-medium transition-all cursor-pointer group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/40 to-indigo-600/20 text-white font-semibold shadow-sm border border-blue-500/30'
                  : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 mr-4 transition-colors ${isActive ? 'text-blue-400 fill-blue-400/20' : 'text-slate-400 group-hover:text-white'}`} />
              <span className="flex-1 text-left">{item.label}</span>

              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  item.id === 'escalations' ? 'bg-red-500 text-white shadow-sm' : 'bg-white/20 text-white'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="px-4 py-4 mt-auto space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-blue-200 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10 group">
          <HelpCircle className="w-5 h-5 opacity-70 group-hover:opacity-100" /> Help
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-blue-200 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10 group">
          <Shield className="w-5 h-5 opacity-70 group-hover:opacity-100" /> Privacy
        </button>
      </div>
    </aside>
  );
}
