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
  user
}: HeaderProps) {
  const initials = user ? (user.name || user.email || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <header className="flex flex-col bg-white border-b border-slate-200 sticky top-0 z-40 shrink-0">
      <div className="h-16 flex justify-between items-center px-8">
        <div className="flex items-center gap-6 flex-1">
          {/* Dynamic Search Bar */}
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 border border-transparent focus:border-blue-500"
              placeholder={searchPlaceholder}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-all">
            <Bot className="w-5 h-5" />
          </button>
          
          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 ml-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      {showSubTabs && (
        <div className="px-8 flex gap-6 mt-2">
          <button
            onClick={() => setSubTab('all')}
            className={`text-sm pb-3 font-medium transition-all flex items-center gap-2 ${
              subTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
            }`}
          >
            All Emails
          </button>
          <button
            onClick={() => setSubTab('queue')}
            className={`text-sm pb-3 font-medium transition-all flex items-center gap-2 ${
              subTab === 'queue'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
            }`}
          >
            My Queue <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{queueCount}</span>
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
