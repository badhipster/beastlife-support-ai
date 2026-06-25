import React from 'react';
import { Search, Bot, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchPlaceholder: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  subTab: 'all' | 'queue';
  setSubTab: (subTab: 'all' | 'queue') => void;
  showSubTabs?: boolean;
  allCount?: number;
  queueCount?: number;
  openaiModel?: string;
  user?: { name: string; email: string; picture: string };
  onLogout?: () => void;
  showSearch?: boolean;
}

export default function Header({
  title,
  searchPlaceholder,
  searchQuery,
  setSearchQuery,
  subTab,
  setSubTab,
  showSubTabs = false,
  allCount = 0,
  queueCount = 0,
  openaiModel = "Gemini 2.5 Flash",
  user,
  onLogout,
  showSearch = true
}: HeaderProps) {
  const initials = user ? (user.name || user.email || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <header className="flex flex-col bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 shrink-0 shadow-sm transition-all">
      <div className="h-16 flex justify-between items-center px-8">
        <div className="flex items-center gap-6 flex-1">
          {/* Dynamic Search Bar */}
          {showSearch && (
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-full text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] focus:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] transition-all placeholder:text-slate-400 border border-slate-200/80"
                placeholder={searchPlaceholder}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button className="p-2.5 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-200/50 transition-all">
            <Bot className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 ml-2">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
                  {initials}
                </div>
              )}
            </div>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                title="Sign out"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      {showSubTabs && (
        <div className="px-8 flex gap-8 mt-1">
          <button
            onClick={() => setSubTab('all')}
            className={`text-sm pb-4 font-medium transition-all flex items-center gap-2 relative ${
              subTab === 'all'
                ? 'text-m3-primary'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Emails
            {subTab === 'all' && <div className="absolute bottom-0 left-0 w-full h-1 bg-m3-primary rounded-t-md" />}
          </button>
          <button
            onClick={() => setSubTab('queue')}
            className={`text-sm pb-4 font-medium transition-all flex items-center gap-2 relative ${
              subTab === 'queue'
                ? 'text-m3-primary'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Queue <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${subTab === 'queue' ? 'bg-m3-primary-container text-m3-on-primary-container' : 'bg-slate-200 text-slate-600'}`}>{queueCount}</span>
            {subTab === 'queue' && <div className="absolute bottom-0 left-0 w-full h-1 bg-m3-primary rounded-t-md" />}
          </button>
          <button
            onClick={() => alert("Team Activity dashboard coming soon")}
            className="text-sm pb-3 font-medium transition-all flex items-center gap-2 text-slate-500 hover:text-slate-700 border-b-2 border-transparent cursor-pointer"
          >
            Team Activity
          </button>
        </div>
      )}
    </header>
  );
}
