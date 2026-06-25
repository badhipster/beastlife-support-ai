import React from 'react';
import {
  Zap,
  Inbox,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Settings,
  Compass,
  LogOut
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
  user: { name: string; email: string; picture: string };
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  openThreadsCount,
  escalatedCount,
  onboardingCompleted,
  allowedTabs,
  role,
  user
}: SidebarProps) {

  const initials = (user.name || user.email || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = role === 'admin' ? 'CX Lead / Admin' : 'Support Agent';

  const allNavItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: openThreadsCount, color: 'text-emerald-400' },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle, count: escalatedCount, color: 'text-red-400' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
    { id: 'onboarding', label: onboardingCompleted ? 'Onboarding (Verified)' : 'Onboarding', icon: Compass },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  // Only show tabs this role can access.
  const navItems = allNavItems.filter((item) => allowedTabs.includes(item.id));

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
              {isActive && (
                <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500 rounded-r-md" />
              )}

              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>

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

      {/* Profile + sign out (real signed-in user) */}
      <div className="px-4 py-4 border-t border-slate-800 mt-auto space-y-3">
        <div className="flex items-center gap-3">
          {user.picture ? (
            <img
              className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow-sm"
              src={user.picture}
              alt={user.name}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-800/50 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-700/50">
              {initials}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-white truncate leading-tight">{user.name}</p>
            <p className="text-[10px] text-emerald-400/90 font-semibold truncate mt-0.5">{roleLabel}</p>
            <p className="text-[9px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <a
          href="/api/auth/logout"
          className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-lg py-2 transition-all"
        >
          <LogOut className="w-3 h-3" />
          Sign out
        </a>
      </div>
    </aside>
  );
}
