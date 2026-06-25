import React, { useState, useMemo } from 'react';
import { EmailThread, Sentiment } from '../types';
import { AlertTriangle, Square, Star, RefreshCw, MoreVertical, Gauge, Bot, Sparkles } from 'lucide-react';

interface InboxTabProps {
  threads: EmailThread[];
  onSelectThread: (thread: EmailThread) => void;
  searchQuery: string;
  currentEmail?: string;
  onNavigateToEscalations?: () => void;
  onRefresh?: () => void;
}

const getSentimentColor = (sentiment?: Sentiment) => {
  switch (sentiment) {
    case 'Angry': return 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm';
    case 'Frustrated': return 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm';
    case 'Happy': return 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm';
    case 'Sad': return 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm';
    default: return 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm';
  }
};

const getCategoryColor = (category?: string) => {
  switch (category?.toUpperCase()) {
    case 'LEGAL': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'PRODUCT ISSUE': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'DELIVERY': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'RETURN/REFUND': return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'BILLING': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'GENERAL': return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'FEEDBACK': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'SPAM': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const ThreadRow = React.memo(({ t, onSelectThread }: { t: EmailThread, onSelectThread: (thread: EmailThread) => void }) => {
  const needsAttention = t.status !== 'Replied' && t.status !== 'Closed';
  return (
    <div
      onClick={() => onSelectThread(t)}
      className={`flex items-center px-4 py-3 mx-3 my-2 rounded-2xl cursor-pointer transition-all duration-300 ease-in-out group ${
        needsAttention ? 'bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300' : 'bg-transparent border border-transparent hover:bg-slate-50'
      } ${t.status === 'Escalated' ? 'border-l-[4px] border-l-rose-500 rounded-l-md' : ''}`}
    >
      {/* Left Spacer */}
      <div className="w-4 shrink-0"></div>

      {/* Sender Avatar & Name */}
      <div className="w-56 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
          {t.senderName.substring(0, 2).toUpperCase()}
        </div>
        <span className={`text-sm truncate ${needsAttention ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
          {t.senderName}
        </span>
      </div>

      {/* Subject, Brief & Pill */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-3">
          <span className={`text-sm truncate ${needsAttention ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
            {t.topic}
          </span>
          {t.category && (
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${getCategoryColor(t.category)}`}>
              {t.category}
            </span>
          )}
        </div>
        {t.brief && (
          <span className="text-xs text-slate-400 truncate pr-4">
            {t.brief}
          </span>
        )}
      </div>

      {/* Right meta */}
      <div className="flex items-center gap-4 shrink-0 ml-4">
        {/* Sentiment Pill */}
        {t.sentiment && (
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full border tracking-wide uppercase ${getSentimentColor(t.sentiment)}`}>
            {t.sentiment}
          </span>
        )}
        
        {/* Date */}
        <span className="text-xs font-semibold text-slate-400 min-w-fit text-right whitespace-nowrap">
          {t.messages && t.messages.length > 0 
            ? t.messages[t.messages.length - 1].timestamp.split(',')[1] || t.messages[t.messages.length - 1].timestamp
            : ''}
        </span>
      </div>
    </div>
  );
});

export default function InboxTab({ threads, onSelectThread, searchQuery, currentEmail, onNavigateToEscalations, onRefresh }: InboxTabProps) {
  
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return threads.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = t.senderName.toLowerCase().includes(q) ||
        t.senderEmail.toLowerCase().includes(q) ||
        t.topic.toLowerCase().includes(q);
        
      const matchCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchSentiment = filterSentiment === 'all' || t.sentiment === filterSentiment;
      let matchStatus = true;
      if (filterStatus === 'open') {
        matchStatus = t.status !== 'Replied' && t.status !== 'Escalated' && t.status !== 'Closed';
      } else if (filterStatus === 'replied') {
        matchStatus = t.status === 'Replied';
      } else if (filterStatus === 'escalated') {
        matchStatus = t.status === 'Escalated';
      }

      return matchSearch && matchCategory && matchSentiment && matchStatus;
    });
  }, [threads, searchQuery, filterCategory, filterSentiment, filterStatus]);

  // Real KPI values from the loaded threads.
  const draftsReady = threads.filter((t) => t.draftStatus === 'Draft ready' || t.draftStatus === 'Draft prepared').length;
  const escalated = threads.filter((t) => t.status === 'Escalated');
  const awaiting = threads.filter((t) => t.status !== 'Replied' && t.status !== 'Closed').length;
  const draftPct = threads.length ? Math.round((draftsReady / threads.length) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 p-6 lg:p-8 overflow-y-auto gap-8 bg-transparent">
      
      {/* Email List Card */}
      <div className="bg-m3-surface rounded-[24px] shadow-sm flex flex-col shrink-0 border border-slate-200/50 overflow-hidden mb-8">
        
        {/* List Header Actions */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-4">
            <RefreshCw 
              onClick={() => {
                if (onRefresh) {
                  onRefresh();
                  setIsRefreshing(true);
                  setTimeout(() => setIsRefreshing(false), 1000);
                }
              }} 
              className={`w-4 h-4 cursor-pointer transition-all ${isRefreshing ? 'animate-spin text-m3-primary' : 'hover:text-slate-800'}`} 
            />
            
            <div className="flex items-center gap-2 ml-4">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-m3-primary/30 text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[position:right_10px_center] bg-no-repeat">
                <option value="all">Status: All</option>
                <option value="open">Open</option>
                <option value="replied">Replied</option>
                <option value="escalated">Escalated</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-m3-primary/30 text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[position:right_10px_center] bg-no-repeat">
                <option value="all">Category: All</option>
                <option value="Legal">Legal</option>
                <option value="Product Issue">Product Issue</option>
                <option value="Delivery">Delivery</option>
                <option value="Return/Refund">Return/Refund</option>
                <option value="Billing">Billing</option>
                <option value="General">General</option>
                <option value="Feedback">Feedback</option>
                <option value="Spam">Spam</option>
              </select>
              <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 outline-none focus:ring-2 focus:ring-m3-primary/30 text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[position:right_10px_center] bg-no-repeat">
                <option value="all">Sentiment: All</option>
                <option value="Angry">Angry</option>
                <option value="Frustrated">Frustrated</option>
                <option value="Neutral">Neutral</option>
                <option value="Happy">Happy</option>
                <option value="Sad">Sad</option>
              </select>
            </div>
            
            <MoreVertical className="w-4 h-4 cursor-pointer hover:text-slate-800 transition-colors ml-2" />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>{filtered.length} {filtered.length === 1 ? 'email' : 'emails'}</span>
          </div>
        </div>

        {/* List Items */}
        <div className="flex flex-col py-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No emails match your search.</div>
          ) : (
            filtered.map((t) => (
              <ThreadRow key={t.id} t={t} onSelectThread={onSelectThread} />
            ))
          )}
        </div>
      </div>

      {/* Bottom KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        
        {/* Card 1: Awaiting reply (real) */}
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 rounded-[24px] shadow-sm p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium mb-4">
            <Gauge className="w-4 h-4 text-blue-500" /> Awaiting reply
          </div>
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-slate-900">{awaiting}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Open emails still needing a response.</p>
          </div>
        </div>

        {/* Card 2: AI draft coverage (real) */}
        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100/50 rounded-[24px] shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <Bot className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-200 opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-slate-600 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4 text-green-600" /> AI draft coverage
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-slate-900">{draftPct}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{draftsReady} of {threads.length} have a draft ready.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Triage Alert (real) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-[24px] shadow-lg p-6 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3">
            <AlertTriangle className="w-4 h-4" /> Triage Alert
          </div>
          <div>
            <p className="text-sm text-slate-200 leading-snug mb-4">
              {escalated.length > 0
                ? `${escalated.length} email${escalated.length === 1 ? '' : 's'} flagged for human review.`
                : 'No escalations right now — the queue is clear.'}
            </p>
            {escalated.length > 0 ? (
              <button onClick={() => {
                if (onNavigateToEscalations) onNavigateToEscalations();
                else onSelectThread(escalated[0]);
              }} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-2 rounded-lg transition-colors cursor-pointer">
                Review now
              </button>
            ) : (
              <button disabled className="w-full bg-slate-800/80 border border-slate-700 text-slate-400 text-sm font-bold py-2 rounded-lg cursor-not-allowed">
                Queue Clear
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
