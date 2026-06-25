import React, { useState } from 'react';
import { EmailThread, Sentiment } from '../types';
import { AlertTriangle, Square, Star, RefreshCw, MoreVertical, Gauge, Bot, Sparkles } from 'lucide-react';

interface InboxTabProps {
  threads: EmailThread[];
  onSelectThread: (thread: EmailThread) => void;
  searchQuery: string;
  currentEmail?: string;
}

export default function InboxTab({ threads, onSelectThread, searchQuery, currentEmail }: InboxTabProps) {
  
  const filtered = threads.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.senderName.toLowerCase().includes(q) ||
      t.senderEmail.toLowerCase().includes(q) ||
      t.topic.toLowerCase().includes(q)
    );
  });

  // Real KPI values from the loaded threads.
  const draftsReady = threads.filter((t) => t.draftStatus === 'Draft ready' || t.draftStatus === 'Draft prepared').length;
  const escalated = threads.filter((t) => t.status === 'Escalated');
  const awaiting = threads.filter((t) => t.status !== 'Replied' && t.status !== 'Closed').length;
  const draftPct = threads.length ? Math.round((draftsReady / threads.length) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 p-6 overflow-y-auto gap-6">
      
      {/* Email List Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shrink-0">
        
        {/* List Header Actions */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-4">
            <Square className="w-4 h-4 cursor-pointer hover:text-slate-800 transition-colors" />
            <RefreshCw className="w-4 h-4 cursor-pointer hover:text-slate-800 transition-colors" />
            <MoreVertical className="w-4 h-4 cursor-pointer hover:text-slate-800 transition-colors" />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>{filtered.length} {filtered.length === 1 ? 'email' : 'emails'}</span>
          </div>
        </div>

        {/* List Items */}
        <div className="flex flex-col">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No emails match your search.</div>
          ) : (
            filtered.map((thread) => {
              const needsAttention = thread.status !== 'Replied' && thread.status !== 'Closed';
              const isEscalated = thread.status === 'Escalated';

              return (
                <div
                  key={thread.id}
                  onClick={() => onSelectThread(thread)}
                  className={`group flex items-center px-4 py-3 cursor-pointer border-b border-slate-100 transition-all ${
                    isEscalated
                      ? 'bg-rose-50/40 border-l-4 border-l-rose-400'
                      : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Left Controls */}
                  <div className="flex items-center gap-4 shrink-0 mr-4 text-slate-300">
                    <Square className="w-4 h-4 hover:text-slate-500" />
                    <Star className="w-4 h-4 hover:text-yellow-400" />
                  </div>

                  {/* Sender */}
                  <div className="w-48 shrink-0 truncate">
                    <span className={`text-sm truncate ${needsAttention ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                      {thread.senderName}
                    </span>
                  </div>

                  {/* Subject & Pill */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className={`text-sm truncate ${needsAttention ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                      {thread.topic}
                    </span>
                    {thread.category && (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wide shrink-0">
                        {thread.category}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="w-24 text-right shrink-0">
                    <span className={`text-xs ${needsAttention ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                      {thread.waitingTime}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        
        {/* Card 1: Awaiting reply (real) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
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
        <div className="bg-[#F8FAFC] rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between relative overflow-hidden">
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
        <div className="bg-[#111827] rounded-xl shadow-sm p-5 flex flex-col justify-between text-white">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3">
            <AlertTriangle className="w-4 h-4" /> Triage Alert
          </div>
          <div>
            <p className="text-sm text-slate-200 leading-snug mb-4">
              {escalated.length > 0
                ? `${escalated.length} email${escalated.length === 1 ? '' : 's'} flagged for human review.`
                : 'No escalations right now — the queue is clear.'}
            </p>
            {escalated.length > 0 && (
              <button onClick={() => onSelectThread(escalated[0])} className="w-full bg-green-700 hover:bg-green-600 text-white text-sm font-bold py-2 rounded-lg transition-colors cursor-pointer">
                Review now
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
