import React, { useState } from 'react';
import { EmailThread, Sentiment, EmailStatus } from '../types';
import { Sparkles, ArrowRight, Check, AlertCircle, CircleDot } from 'lucide-react';

interface InboxTabProps {
  threads: EmailThread[];
  onSelectThread: (thread: EmailThread) => void;
  searchQuery: string;
}

export default function InboxTab({ threads, onSelectThread, searchQuery }: InboxTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Filter labels
  const categories = ['All', 'Product Issue', 'Billing', 'Legal', 'General', 'Delivery', 'Feedback'];
  const sentiments = ['All', 'Frustrated', 'Angry', 'Neutral', 'Sad', 'Happy'];
  const statuses = ['All', 'Open', 'Escalated', 'Replied', 'In Queue', 'Closed'];

  // Apply search query and dropdown filters
  const filteredThreads = threads.filter(t => {
    // Search query filter
    const matchesSearch = 
      t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.brief.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSentiment = selectedSentiment === 'All' || t.sentiment === selectedSentiment;
    const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesSentiment && matchesStatus;
  });

  // Calculate stats
  const totalOpen = threads.filter(t => t.status === 'Open').length;
  const totalDrafts = threads.filter(t => t.draftStatus === 'Draft ready' || t.draftStatus === 'Draft prepared').length;

  // Pagination logic
  const totalItems = filteredThreads.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedThreads = filteredThreads.slice(startIndex, startIndex + itemsPerPage);

  // Helper styles for sentiments
  const getSentimentBadge = (sentiment: Sentiment) => {
    switch (sentiment) {
      case 'Angry':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Frustrated':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'Sad':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Happy':
        return 'bg-green-50 text-green-700 border-green-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Helper avatar styles
  const getAvatarBg = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-orange-100 text-orange-700',
      'bg-pink-100 text-pink-700',
      'bg-purple-100 text-purple-700',
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-slate-100 text-slate-700',
      'bg-rose-100 text-rose-700'
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Sub-Header / Filters block */}
      <div className="px-8.5 py-4 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-2">Filters</span>
        
        {/* Category Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Category:</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium border-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Sentiment Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Sentiment:</span>
          <select 
            value={selectedSentiment} 
            onChange={(e) => { setSelectedSentiment(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium border-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {sentiments.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Status:</span>
          <select 
            value={selectedStatus} 
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium border-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {statuses.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {/* Live Counters */}
        <div className="ml-auto flex items-center gap-3 text-slate-500 text-xs font-medium">
          <p>
            <span className="font-semibold text-slate-800">{totalOpen}</span> open,{' '}
            <span className="font-semibold text-slate-800">{totalDrafts}</span> drafts ready
          </p>
        </div>
      </div>

      {/* Grid Table Workspace */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-[#F8FAFC]">
        {/* Table Header Row */}
        <div className="grid grid-cols-[1.2fr_1.8fr_2.5fr_1.1fr_1.1fr] px-6 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 rounded-lg mx-2 border border-slate-200">
          <div>Sender</div>
          <div>Topic & Summary</div>
          <div>AI Brief</div>
          <div>Context</div>
          <div className="text-right">Action Status</div>
        </div>

        {/* Thread List Body */}
        {paginatedThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-xl">
            <p className="text-sm font-medium">No emails found matching the filter criteria.</p>
            <button 
              onClick={() => { setSelectedCategory('All'); setSelectedSentiment('All'); setSelectedStatus('All'); }}
              className="mt-4 text-xs font-bold text-emerald-600 hover:underline"
            >
              Reset active filters
            </button>
          </div>
        ) : (
          paginatedThreads.map((thread) => {
            const isEscalated = thread.status === 'Escalated';
            const initials = thread.senderName.split(' ').map(n => n[0]).join('');
            
            return (
              <div 
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={`grid grid-cols-[1.2fr_1.8fr_2.5fr_1.1fr_1.1fr] items-center px-6 py-4.5 bg-white border rounded-xl hover:bg-slate-50 transition-all cursor-pointer group shadow-sm relative ${
                  isEscalated 
                    ? 'border-l-4 border-l-red-500 border-y border-r border-slate-200' 
                    : 'border-slate-200'
                }`}
              >
                {/* 1. Sender column */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarBg(thread.senderName)}`}>
                    {initials}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{thread.senderName}</p>
                    <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">{thread.senderEmail}</p>
                  </div>
                </div>

                {/* 2. Topic & Sentiment */}
                <div className="pr-4 overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{thread.topic}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 border text-[9px] font-bold rounded flex items-center gap-1 uppercase tracking-tight ${getSentimentBadge(thread.sentiment)}`}>
                      <CircleDot className="w-2 h-2 fill-current" />
                      {thread.sentiment}
                    </span>
                  </div>
                </div>

                {/* 3. AI Brief Column */}
                <div className="pr-4">
                  <p className="text-xs text-slate-500 italic leading-snug line-clamp-2">
                    {thread.brief}
                  </p>
                </div>

                {/* 4. Category & Status Context Badges */}
                <div className="flex flex-col gap-1 items-start">
                  <span className="px-2 py-0.5 border border-slate-200 rounded text-[9px] font-semibold bg-slate-50 text-slate-700">
                    {thread.category}
                  </span>
                  
                  {thread.status === 'Escalated' ? (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[9px] font-bold flex items-center gap-0.5 uppercase tracking-wide">
                      Escalated
                    </span>
                  ) : thread.status === 'Open' ? (
                    <span className="px-2 py-0.5 border border-amber-300 text-amber-700 rounded text-[9px] font-semibold uppercase tracking-wide">
                      Open
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 border border-emerald-300 text-emerald-700 rounded text-[9px] font-semibold uppercase tracking-wide">
                      {thread.status}
                    </span>
                  )}
                </div>

                {/* 5. Action Status indicator - floats right */}
                <div className="flex justify-end gap-2 items-center text-right overflow-hidden">
                  {thread.draftStatus === 'Draft ready' || thread.draftStatus === 'Draft prepared' ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 shrink-0 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-current" />
                      Draft ready
                    </span>
                  ) : thread.status === 'Escalated' ? (
                    <button className="text-[10px] font-bold px-2.5 py-1 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-lg shrink-0 transition-colors">
                      {thread.category === 'Legal' ? 'View Case' : thread.category === 'Delivery' ? 'Trace Hub' : 'View Case'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 capitalize">{thread.draftStatus}</span>
                  )}
                  
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination / Footer view */}
      <footer className="p-5.5 flex justify-between items-center border-t border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-500">
            Showing <span className="text-slate-800 font-bold">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="text-slate-800 font-bold">{totalItems}</span> emails
          </p>
          <div className="h-4 w-px bg-slate-200" />
          <select 
            value={itemsPerPage} 
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-transparent border-none text-xs font-bold focus:ring-0 p-0 pr-6 text-slate-700 cursor-pointer"
          >
            <option value={5}>Show 5 per page</option>
            <option value={10}>Show 10 per page</option>
            <option value={20}>Show 20 per page</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-1.5">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-all cursor-pointer"
          >
            &larr; Prev
          </button>
          
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx + 1)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentPage === idx + 1 
                  ? 'bg-emerald-600 text-white' 
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {idx + 1}
            </button>
          ))}

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-all cursor-pointer"
          >
            Next &rarr;
          </button>
        </div>
      </footer>
    </div>
  );
}
