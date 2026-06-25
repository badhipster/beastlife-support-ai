import React, { useState, useEffect } from 'react';
import { EmailThread, Message } from '../types';
import { ArrowLeft, Sparkles, AlertTriangle, Printer, Trash2, Mail, CheckCircle2, UserCheck, FileText, RefreshCw, MessageSquare, Download, Bot, BookOpen } from 'lucide-react';

interface DetailViewProps {
  thread: EmailThread;
  onBack: () => void;
  onUpdateThread: (updatedThread: EmailThread) => void;
  onClaim: (threadId: string) => void;
  currentEmail: string;
}

export default function DetailView({ thread, onBack, onUpdateThread, onClaim, currentEmail }: DetailViewProps) {
  const [draftText, setDraftText] = useState<string>('');
  const [draftKbRefs, setDraftKbRefs] = useState<{ id: string; sourceId: string; title: string; relevanceScore: number }[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    // Load the real pre-generated draft for this thread (empty if none yet).
    setDraftText('');
    setDraftKbRefs([]);
    setIsEditing(false);
    fetch(`/api/emails/${thread.id}/draft`)
      .then((r) => r.json())
      .then((d) => {
        if (d.draft) {
          setDraftText(d.draft.body || '');
          setDraftKbRefs(d.draft.kbRefs || []);
        }
      })
      .catch(() => {});
  }, [thread]);

  const regenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: thread.topic,
          message: thread.messages[thread.messages.length - 1]?.content || '',
          senderName: thread.senderName,
          category: thread.category,
          sentiment: thread.sentiment,
          threadId: thread.id,
        }),
      });
      const d = await res.json();
      // /api/generate-draft returns draft as a string, with kbRefs alongside.
      setDraftText(d.draft || '');
      setDraftKbRefs(d.kbRefs || []);
    } catch (err) {
      console.error('Failed to generate draft:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const initials = thread.senderName.slice(0, 2).toUpperCase();
  const isEscalated = thread.status === 'Escalated' || thread.sentiment === 'Angry'; // Simulate "Urgent" condition

  return (
    <div className="flex-1 flex h-full bg-white overflow-hidden">
      
      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="hover:text-slate-800 transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <Download className="w-5 h-5 cursor-pointer hover:text-slate-800 transition-colors" />
              <AlertTriangle className="w-5 h-5 cursor-pointer hover:text-slate-800 transition-colors" />
              <Trash2 className="w-5 h-5 cursor-pointer hover:text-slate-800 transition-colors" />
              <div className="w-px h-5 bg-slate-200 mx-1"></div>
              <Mail className="w-5 h-5 cursor-pointer hover:text-slate-800 transition-colors" />
              <CheckCircle2 className="w-5 h-5 cursor-pointer hover:text-slate-800 transition-colors" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            {thread.assignedTo === currentEmail ? (
              <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-semibold flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Yours</span>
            ) : (
              <button onClick={() => onClaim(thread.id)} className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold flex items-center gap-1 cursor-pointer"><UserCheck className="w-3.5 h-3.5" /> Assign to me</button>
            )}
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{thread.category}</span>
          </div>
        </div>

        {/* Thread Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          
          {/* Subject & Badges */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-3">{thread.topic}</h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded uppercase tracking-wider">Inbox</span>
                {isEscalated && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded uppercase tracking-wider flex items-center gap-1">
                    ! Urgent
                  </span>
                )}
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <Printer className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="space-y-6">
            {thread.messages.map((msg, idx) => {
              const isCustomer = msg.isCustomer;
              return (
                <div key={msg.id} className="flex gap-4">
                  {isCustomer ? (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                      {initials}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                      AI
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-900">{isCustomer ? thread.senderName : 'Support Agent'}</span>
                        {isCustomer && <span className="text-xs text-slate-500">&lt;{thread.senderEmail}&gt;</span>}
                      </div>
                      <span className="text-xs text-slate-500">{msg.timestamp}</span>
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-4 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Draft Section */}
            {draftText && (
              <div className="pt-6">
                <div className="flex items-center gap-2 text-green-600 text-sm italic mb-4 ml-12">
                  <Bot className="w-4 h-4" />
                  {draftKbRefs.length > 0
                    ? `AI drafted a reply grounded in: ${draftKbRefs[0].title}${draftKbRefs.length > 1 ? ` (+${draftKbRefs.length - 1} more)` : ''}`
                    : 'AI drafted a reply for your review.'}
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">Support Bot (Draft)</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded uppercase tracking-wider">
                        {isEditing ? 'Editing' : 'Suggested Response'}
                      </span>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        className="w-full h-40 bg-white border-2 border-green-200 rounded-2xl rounded-tl-sm p-4 text-slate-700 text-sm leading-relaxed shadow-sm focus:outline-none focus:ring-1 focus:ring-green-500 font-sans"
                      />
                    ) : (
                      <div className="bg-white border-2 border-green-100 rounded-2xl rounded-tl-sm p-4 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                        {draftText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Fixed Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center gap-3 shrink-0">
          <button onClick={async () => { 
            try {
              await fetch(`/api/emails/${thread.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: draftText })
              });
              onUpdateThread({ ...thread, status: 'Replied' }); 
              onBack(); 
            } catch (err) {
              console.error('Failed to send:', err);
              alert('Failed to send email.');
            }
          }} className="flex-1 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <Mail className="w-4 h-4 fill-current" /> Approve & Send
          </button>
          <button onClick={() => setIsEditing((v) => !v)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <FileText className="w-4 h-4" /> {isEditing ? 'Done editing' : 'Edit Draft'}
          </button>
          <button onClick={() => { onUpdateThread({ ...thread, status: 'Escalated' }); onBack(); }} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer border border-red-100">
            <AlertTriangle className="w-4 h-4" /> Escalate
          </button>
        </div>
      </div>

      {/* AI Assistant Right Sidebar */}
      <div className="w-[320px] bg-white flex flex-col shrink-0">
        
        {/* Header */}
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Sparkles className="w-5 h-5 text-teal-600 fill-current" /> AI Assistant
          </div>
          <span className="px-2 py-1 text-[9px] font-bold bg-slate-100 text-slate-600 rounded uppercase tracking-wider">
            Gemini 2.5 Flash
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
          
          {/* AI Brief (real) */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5" /> AI Brief
            </h4>
            <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
              {thread.brief || 'No summary yet — run AI triage to generate one.'}
            </div>
          </div>

          {/* Suggested Reply (real draft) */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5" /> Suggested Reply
            </h4>
            <div className="border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed bg-white whitespace-pre-wrap">
              {draftText || 'No draft yet. Use Re-generate to draft a KB-grounded reply.'}
            </div>
          </div>

          {/* Sources Used (real) */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <BookOpen className="w-3.5 h-3.5" /> Sources Used
            </h4>
            <div className="space-y-2">
              {draftKbRefs.length > 0 ? (
                draftKbRefs.map((ref) => (
                  <div key={ref.id} className="w-full flex items-center justify-between gap-2 text-sm text-blue-600 bg-blue-50/50 border border-blue-200 rounded-lg px-3 py-2 text-left">
                    <span className="flex items-center gap-2 min-w-0"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">{ref.title}</span></span>
                    <span className="text-[10px] font-mono text-blue-400 shrink-0">{Math.round(ref.relevanceScore * 100)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No sources yet — generate a draft to see the KB passages it used.</p>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-slate-500">
          <button onClick={regenerate} disabled={isGenerating} className="flex items-center gap-2 text-xs font-bold hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} /> {isGenerating ? 'Generating…' : draftText ? 'Re-generate' : 'Generate draft'}
          </button>
        </div>

      </div>

    </div>
  );
}
