import React, { useState } from 'react';
import { EmailThread, Sentiment } from '../types';
import { Sparkles, CircleDot, AlertTriangle } from 'lucide-react';

interface InboxTabProps {
  threads: EmailThread[];
  onSelectThread: (thread: EmailThread) => void;
  searchQuery: string;
  currentEmail?: string;
}

export default function InboxTab({ threads, onSelectThread, searchQuery, currentEmail }: InboxTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const categories = ['All', 'Product Issue', 'Billing', 'Legal', 'Return/Refund', 'Delivery', 'General', 'Feedback', 'Spam'];
  const sentiments = ['All', 'Frustrated', 'Angry', 'Neutral', 'Sad', 'Happy'];
  const statuses = ['All', 'Open', 'Escalated', 'Replied', 'In Queue', 'Closed'];

  const filtered = threads.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.senderName.toLowerCase().includes(q) ||
      t.senderEmail.toLowerCase().includes(q) ||
      t.topic.toLowerCase().includes(q) ||
      (t.brief || '').toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSentiment = selectedSentiment === 'All' || t.sentiment === selectedSentiment;
    const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesSentiment && matchesStatus;
  });

  const sentimentChip = (sentiment: Sentiment) => {
    switch (sentiment) {
      case 'Angry': return 'bg-red-50 text-red-700';
      case 'Frustrated': return 'bg-orange-50 text-orange-700';
      case 'Sad': return 'bg-blue-50 text-blue-700';
      case 'Happy': return 'bg-green-50 text-green-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const avatarBg = (name: string) => {
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const colors = ['bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700'];
    return colors[hash % colors.length];
  };

  const select = (value: string, set: (v: string) => void, opts: string[], label: string) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-slate-400">{label}:</span>
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 bg-white">
      {/* Slim filter bar */}
      <div className="px-5 py-2.5 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white">
        {select(selectedCategory, setSelectedCategory, categories, 'Category')}
        {select(selectedSentiment, setSelectedSentiment, sentiments, 'Sentiment')}
        {select(selectedStatus, setSelectedStatus, statuses, 'Status')}
        <span className="ml-auto text-[11px] text-slate-400">{filtered.length} {filtered.length === 1 ? 'email' : 'emails'}</span>
      </div>

      {/* Gmail-style list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <p className="text-sm font-medium">No emails here.</p>
            <p className="text-xs mt-1">New mail to the connected inbox appears within ~60s.</p>
          </div>
        ) : (
          filtered.map((thread) => {
            const needsAttention = thread.status !== 'Replied' && thread.status !== 'Closed';
            const isEscalated = thread.status === 'Escalated';
            const draftReady = thread.draftStatus === 'Draft ready' || thread.draftStatus === 'Draft prepared';
            const initials = thread.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            const mine = currentEmail && thread.assignedTo === currentEmail;
            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={`group flex items-center gap-3 pr-5 py-2.5 cursor-pointer border-b border-slate-100 transition-colors ${
                  isEscalated ? 'bg-rose-50/40 border-l-2 border-l-rose-400 pl-[18px]' : 'hover:bg-slate-50 pl-5'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${avatarBg(thread.senderName)}`}>
                  {initials}
                </div>

                {/* Sender */}
                <div className="w-40 shrink-0 truncate flex items-center">
                  <span className={`text-xs truncate ${needsAttention ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                    {thread.senderName}
                  </span>
                  {mine && <span className="ml-1.5 text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded uppercase">You</span>}
                </div>

                {/* Subject + snippet */}
                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span className={`text-xs truncate ${needsAttention ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{thread.topic}</span>
                  <span className="text-xs text-slate-400 truncate hidden lg:inline">— {thread.brief}</span>
                </div>

                {/* Labels */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isEscalated && (
                    <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded uppercase tracking-tight flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> Escalated
                    </span>
                  )}
                  <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded hidden sm:inline">{thread.category}</span>
                  {thread.sentiment !== 'Neutral' && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight hidden md:flex items-center gap-0.5 ${sentimentChip(thread.sentiment)}`}>
                      <CircleDot className="w-2 h-2 fill-current" /> {thread.sentiment}
                    </span>
                  )}
                  {draftReady && (
                    <span className="text-emerald-600" title="Draft ready">
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 w-16 text-right shrink-0">{thread.waitingTime}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
