import React, { useState, useEffect } from 'react';
import { EmailThread, Message } from '../types';
import { ArrowLeft, Sparkles, AlertTriangle, Printer, Trash2, Mail, CheckCircle2, UserCheck, FileText, RefreshCw, MessageSquare, Download, Bot, BookOpen, ChevronDown, ExternalLink, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface DetailViewProps {
  thread: EmailThread;
  onBack: () => void;
  onUpdateThread: (updatedThread: EmailThread) => void;
  onClaim: (threadId: string) => void;
  currentEmail: string;
  onViewInKb?: (sourceId: string) => void;
  canOpenKb?: boolean;
}

type SourceState = 'loading' | 'error' | { text: string; category: string };

export default function DetailView({ thread, onBack, onUpdateThread, onClaim, currentEmail, onViewInKb, canOpenKb }: DetailViewProps) {
  const [draftText, setDraftText] = useState<string>('');
  const [draftKbRefs, setDraftKbRefs] = useState<{ id: string; sourceId: string; title: string; relevanceScore: number }[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [sourceCache, setSourceCache] = useState<Record<string, SourceState>>({});
  const [feedbackState, setFeedbackState] = useState<'none' | 'positive' | 'negative' | 'submitted'>('none');
  const [feedbackReason, setFeedbackReason] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Submit Feedback
  const submitFeedback = async (helpful: boolean, reason?: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: thread.id,
          helpful,
          reason,
          draftText
        })
      });
      setFeedbackState('submitted');
      setTimeout(() => setFeedbackState('none'), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle a cited source open/closed, lazily fetching its KB passage on first open.
  const toggleSource = async (sourceId: string) => {
    if (expandedSource === sourceId) { setExpandedSource(null); return; }
    setExpandedSource(sourceId);
    const cached = sourceCache[sourceId];
    if (cached && cached !== 'error') return;
    setSourceCache((c) => ({ ...c, [sourceId]: 'loading' }));
    try {
      const r = await fetch(`/api/kb/source/${encodeURIComponent(sourceId)}`);
      const d = await r.json();
      setSourceCache((c) => ({
        ...c,
        [sourceId]: r.ok && d.chunk ? { text: d.chunk.text, category: d.chunk.category } : 'error',
      }));
    } catch {
      setSourceCache((c) => ({ ...c, [sourceId]: 'error' }));
    }
  };

  useEffect(() => {
    // Load the real pre-generated draft for this thread (empty if none yet).
    setDraftText('');
    setDraftKbRefs([]);
    setIsEditing(false);
    setExpandedSource(null);
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

  const regenerate = () => {
    setIsGenerating(true);
    setDraftText('');
    setDraftKbRefs([]);
    
    try {
      const url = new URL('/api/generate-draft-stream', window.location.origin);
      url.searchParams.append('subject', thread.topic || '');
      url.searchParams.append('message', thread.messages[thread.messages.length - 1]?.content || '');
      url.searchParams.append('senderName', thread.senderName || '');
      url.searchParams.append('category', thread.category || '');
      url.searchParams.append('sentiment', thread.sentiment || '');
      url.searchParams.append('threadId', thread.id || '');

      const eventSource = new EventSource(url.toString());
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('Stream error:', data.error);
          eventSource.close();
          setIsGenerating(false);
          return;
        }
        
        if (data.done) {
          eventSource.close();
          setIsGenerating(false);
          return;
        }
        
        if (data.chunk) {
          setDraftText(prev => prev + data.chunk);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
        setIsGenerating(false);
      };
    } catch (err) {
      console.error('Failed to start stream:', err);
      setIsGenerating(false);
    }
  };

  const initials = thread.senderName.slice(0, 2).toUpperCase();
  const isEscalated = thread.status === 'Escalated' || thread.sentiment === 'Angry'; // Simulate "Urgent" condition

  return (
    <div className="flex-1 flex h-full bg-transparent p-6 gap-6 overflow-hidden relative">
      
      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-m3-surface shadow-sm rounded-[24px] overflow-hidden border border-slate-200/50 z-10">
        
        {/* Toolbar */}
        <div className="px-6 py-4 border-none flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="hover:text-slate-800 transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              {/* Removed non-functional icons per user request */}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            {thread.assignedTo === currentEmail ? (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-semibold flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Yours</span>
                <button onClick={() => onUpdateThread({ ...thread, assignedTo: undefined })} className="px-2.5 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-rose-600 font-semibold transition-colors cursor-pointer text-[11px]">Remove from queue</button>
              </div>
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
            {/* Removed Printer icon per user request */}
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
                    <div className="w-10 h-10 rounded-full bg-m3-primary-container flex items-center justify-center text-sm font-bold text-m3-on-primary-container shrink-0">
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
                    <div className="bg-m3-surface-variant rounded-3xl rounded-tl-[4px] p-4 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Reply composer — always rendered (static) so "Edit Draft" works
                even before a draft exists, not only after one is generated. */}
            <div className="pt-6">
              {draftText && (
                <div className="flex items-center gap-2 text-m3-primary text-sm font-medium mb-4 ml-12">
                  <Sparkles className="w-4 h-4 fill-current" />
                  {draftKbRefs.length > 0
                    ? `AI drafted a reply grounded in: ${draftKbRefs[0].title}${draftKbRefs.length > 1 ? ` (+${draftKbRefs.length - 1} more)` : ''}`
                    : 'AI drafted a reply for your review.'}
                </div>
              )}

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-m3-primary flex items-center justify-center text-m3-on-primary shrink-0">
                  <Sparkles className="w-5 h-5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">Support Bot (Draft)</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-m3-secondary-container text-m3-on-secondary-container rounded uppercase tracking-wider">
                      {isEditing ? 'Editing' : draftText ? 'Suggested Response' : 'No draft yet'}
                    </span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      autoFocus
                      placeholder="Write your reply, or use Generate draft for a KB-grounded reply…"
                      className="w-full h-40 bg-m3-surface-variant border-none rounded-3xl rounded-tl-[4px] p-4 text-slate-800 text-sm leading-relaxed shadow-none focus:outline-none focus:ring-2 focus:ring-m3-primary/30 font-sans placeholder:text-slate-500 resize-y"
                    />
                  ) : draftText ? (
                    <div className="space-y-3">
                      <div className="bg-m3-primary-container text-m3-on-primary-container border-none rounded-3xl rounded-tl-[4px] p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-none">
                        {draftText}
                      </div>
                      
                      {/* AI Feedback Loop */}
                      <div className="flex items-center gap-3 px-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Was this draft helpful?</span>
                        {feedbackState === 'submitted' ? (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Feedback saved</span>
                        ) : feedbackState === 'negative' ? (
                          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1 shadow-sm">
                            <select 
                              className="text-xs text-slate-600 bg-transparent border-none focus:ring-0 outline-none p-1 cursor-pointer"
                              value={feedbackReason}
                              onChange={(e) => setFeedbackReason(e.target.value)}
                            >
                              <option value="" disabled>Select reason...</option>
                              <option value="Hallucination (Factually Incorrect)">Hallucination (Factually Incorrect)</option>
                              <option value="Wrong Tone">Wrong Tone</option>
                              <option value="Outdated Information">Outdated Information</option>
                              <option value="Other">Other</option>
                            </select>
                            <button 
                              disabled={!feedbackReason}
                              onClick={() => submitFeedback(false, feedbackReason)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded cursor-pointer transition-colors disabled:opacity-50"
                            >
                              Submit
                            </button>
                            <button onClick={() => setFeedbackState('none')} className="p-1 hover:bg-slate-100 text-slate-400 rounded-full cursor-pointer"><X className="w-3.5 h-3.5"/></button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => submitFeedback(true)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-green-600 rounded-md transition-colors cursor-pointer" title="Helpful">
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => setFeedbackState('negative')} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer" title="Not Helpful">
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-transparent border-2 border-dashed border-m3-outline rounded-3xl rounded-tl-[4px] p-4 text-slate-500 text-sm leading-relaxed">
                      No draft yet. Click <span className="font-semibold text-slate-700">Edit Draft</span> to write one, or <span className="font-semibold text-slate-700">Generate draft</span> for a KB-grounded reply.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-semibold animate-[fadeSlideIn_0.3s_ease-out] ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Bottom Fixed Action Bar */}
        <div className="px-8 py-5 border-none bg-m3-surface flex items-center gap-4 shrink-0 rounded-b-[32px]">
          <button onClick={async () => { 
            if (isSending) return;
            setIsSending(true);
            try {
              const res = await fetch(`/api/emails/${thread.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: draftText })
              });
              if (!res.ok) throw new Error('Server error');
              showToast('success', '✉️ Email sent successfully!');
              onUpdateThread({ ...thread, status: 'Replied', draftStatus: 'Sent' }); 
              setTimeout(() => onBack(), 1500);
            } catch (err) {
              console.error('Failed to send:', err);
              showToast('error', 'Failed to send email. Please try again.');
            } finally {
              setIsSending(false);
            }
          }} disabled={!draftText.trim() || isSending} className="flex-1 bg-m3-primary hover:bg-[#0842A0] text-m3-on-primary font-medium py-3 rounded-full shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-m3-primary disabled:shadow-none">
            {isSending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
            ) : (
              <><Mail className="w-4 h-4 fill-current" /> Approve & Send</>
            )}
          </button>
          <button onClick={() => setIsEditing((v) => !v)} className="flex-1 bg-m3-surface-variant hover:bg-slate-200 text-slate-800 font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer">
            <FileText className="w-4 h-4" /> {isEditing ? 'Done editing' : 'Edit Draft'}
          </button>
          <button onClick={() => { onUpdateThread({ ...thread, status: 'Escalated' }); onBack(); }} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer border border-transparent">
            <AlertTriangle className="w-4 h-4" /> Escalate
          </button>
        </div>
      </div>

      {/* AI Assistant Right Sidebar */}
      <div className="w-[340px] bg-white flex flex-col shrink-0 shadow-sm rounded-[24px] border border-slate-200/50 overflow-hidden z-10">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#F4F7FC] to-white">
          <div className="flex items-center gap-2 font-medium text-slate-800 tracking-tight">
            <Sparkles className="w-5 h-5 text-[#0B57D0]" /> AI Assistant
          </div>
          <span className="px-2 py-1 text-[9px] font-bold bg-slate-100 text-slate-600 rounded uppercase tracking-wider">
            Gemini 2.5 Flash
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          
          {/* AI Brief (real) — enhanced with metadata chips */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5" /> AI Brief
            </h4>
            <div className="bg-[#F8F9FA] rounded-[20px] p-5 space-y-3 border border-transparent shadow-sm">
              <p className="text-sm text-slate-700 leading-relaxed">
                {thread.brief || 'No summary yet — run AI triage to generate one.'}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {thread.category && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
                    {thread.category}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  thread.sentiment === 'Frustrated' || thread.sentiment === 'Angry'
                    ? 'bg-red-100 text-red-700'
                    : thread.sentiment === 'Happy'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {thread.sentiment}
                </span>
                {thread.intent && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full uppercase tracking-wider">
                    {thread.intent}
                  </span>
                )}
                {thread.status === 'Escalated' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" /> Escalated
                  </span>
                )}
              </div>
              {thread.orderId && (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-600">Order:</span> {thread.orderId}
                </div>
              )}
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
                draftKbRefs.map((ref) => {
                  const open = expandedSource === ref.sourceId;
                  const cached = sourceCache[ref.sourceId];
                  return (
                    <div key={ref.id} className="border border-blue-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSource(ref.sourceId)}
                        className="w-full flex items-center justify-between gap-2 text-sm text-blue-600 bg-blue-50/50 hover:bg-blue-50 px-3 py-2 text-left cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2 min-w-0"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">{ref.title}</span></span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-blue-400">{Math.round(ref.relevanceScore * 100)}%</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {open && (
                        <div className="px-3 py-2.5 bg-white border-t border-blue-100 text-xs text-slate-600 leading-relaxed">
                          {cached === 'loading' || cached === undefined ? (
                            <span className="text-slate-400">Loading passage…</span>
                          ) : cached === 'error' ? (
                            <span className="text-slate-400">Couldn't load this passage.</span>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap">{cached.text}</p>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400">{cached.category}</span>
                                {canOpenKb && onViewInKb && (
                                  <button
                                    onClick={() => onViewInKb(ref.sourceId)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                                  >
                                    View in Knowledge Base <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
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
