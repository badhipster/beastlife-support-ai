import React from 'react';
import { Search, Bell, HelpCircle, Sparkles, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchPlaceholder: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  subTab: 'all' | 'queue' | 'team';
  setSubTab: (subTab: 'all' | 'queue' | 'team') => void;
  openaiModel?: string;
}

export default function Header({
  title,
  searchPlaceholder,
  searchQuery,
  setSearchQuery,
  subTab,
  setSubTab,
  openaiModel = "Gemini 3.5 Flash"
}: HeaderProps) {
  return (
    <header className="h-16 flex justify-between items-center px-8 border-b border-slate-200 bg-white sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-6">
        {/* Title */}
        <h2 className="text-base font-semibold text-slate-800 hidden sm:block">{title}</h2>
        
        {/* Vertical Divider */}
        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Dynamic Search Bar */}
        <div className="relative w-72 md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            placeholder={searchPlaceholder}
          />
        </div>

        {/* Quick Sub-Tabs */}
        <nav className="flex gap-4 h-full items-center pl-4">
          <button 
            onClick={() => setSubTab('all')}
            className={`text-xs pb-1 transition-all ${
              subTab === 'all' 
                ? 'text-emerald-600 font-bold border-b-2 border-emerald-600' 
                : 'text-slate-500 hover:text-emerald-500'
            }`}
          >
            All Emails
          </button>
          <button 
            onClick={() => setSubTab('queue')}
            className={`text-xs pb-1 transition-all ${
              subTab === 'queue' 
                ? 'text-emerald-600 font-bold border-b-2 border-emerald-600' 
                : 'text-slate-500 hover:text-emerald-500'
            }`}
          >
            My Queue
          </button>
          <button 
            onClick={() => setSubTab('team')}
            className={`text-xs pb-1 transition-all ${
              subTab === 'team' 
                ? 'text-emerald-600 font-bold border-b-2 border-emerald-600' 
                : 'text-slate-500 hover:text-emerald-500'
            }`}
          >
            Team Activity
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* AI Model Indicator Badges */}
        <div className="hidden md:flex items-center px-2.5 py-1 bg-[#dae2fd] text-[#131b2e] rounded-full gap-1.5 border border-slate-100">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-current" />
          <span className="text-[10px] font-bold tracking-tight">{openaiModel}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button className="p-2 text-slate-500 hover:text-emerald-600 rounded-full hover:bg-slate-50 transition-all relative">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <button className="p-2 text-slate-500 hover:text-emerald-600 rounded-full hover:bg-slate-50 transition-all">
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
          <button className="p-2 text-slate-500 hover:text-emerald-600 rounded-full hover:bg-slate-50 transition-all">
            <User className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
