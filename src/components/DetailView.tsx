import React, { useState, useEffect } from 'react';
import { EmailThread, Message } from '../types';
import { ArrowLeft, Sparkles, Tag, Send, AlertTriangle, BookOpen, UserCheck, CheckCircle2 } from 'lucide-react';

interface DetailViewProps {
  thread: EmailThread;
  onBack: () => void;
  onUpdateThread: (updatedThread: EmailThread) => void;
  onClaim: (threadId: string) => void;
  currentEmail: string;
}

export default function DetailView({ thread, onBack, onUpdateThread, onClaim, currentEmail }: DetailViewProps) {
  const [draftText, setDraftText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLocalSimulated, setIsLocalSimulated] = useState<boolean>(false);
  const [draftKbRefs, setDraftKbRefs] = useState<{ id: string; sourceId: string; title: string; relevanceScore: number }[]>([]);
  const [draftGrounded, setDraftGrounded] = useState<boolean | null>(null);
  const [isTriaging, setIsTriaging] = useState<boolean>(false);
  const [triageNote, setTriageNote] = useState<string>('');

  useEffect(() => {
    setDraftText('');
    setDraftKbRefs([]);
    setDraftGrounded(null);
    setTriageNote('');
    setIsLocalSimulated(false);
    // Load any pre-generated draft so a "draft ready" email opens with the draft in the editor.
    fetch(`/api/emails/${thread.id}/draft`)
      .then((r) => r.json())
      .then((d) => {
        if (d.draft) {
          setDraftText(d.draft.body || '');
          setDraftKbRefs(d.draft.kbRefs || []);
          setDraftGrounded(typeof d.draft.grounded === 'boolean' ? d.draft.grounded : null);
        }
      })
      .catch(() => {});
    if (!thread.category) runTriage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread]);

  const runTriage = async () => {
    setIsTriaging(true);
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: thread.topic,
          message: thread.messages.map((m) => m.content).join('\n'),
          contactCount: thread.contactCount,
          vip: thread.vip,
          hasAttachment: thread.hasAttachment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const escalated = !!data.escalation?.escalated;
        onUpdateThread({
          ...thread,
          category: (data.categories && data.categories[0]) || thread.category,
          sentiment: data.sentiment || thread.sentiment,
          intent: data.intent || thread.intent,
          ...(escalated ? { status: 'Escalated', draftStatus: 'Needs action', triggerReason: data.escalation.summary } : {}),
        });
        const cats = (data.categories || []).join(', ');
        setTriageNote(`${data.simulated ? 'Offline triage' : 'AI triage'}: ${cats} · ${data.sentiment}${data.intent ? ` · ${data.intent}` : ''}${escalated ? ` · Escalated (${data.escalation.summary})` : ''}`);
      }
    } catch (err) {
      console.error('Triage failed:', err);
    } finally {
      setIsTriaging(false);
    }
  };

  const generateAIDraft = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-draft', {
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
      const data = await response.json();
      if (response.ok) {
        setDraftText(data.draft);
        setIsLocalSimulated(!!data.simulated);
        setDraftKbRefs(data.kbRefs || []);
        setDraftGrounded(typeof data.grounded === 'boolean' ? data.grounded : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendDraft = async () => {
    if (!draftText.trim()) return;
    let sent = false;
    try {
      const res = await fetch(`/api/emails/${thread.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draftText }),
      });
      const data = await res.json();
      sent = !!data.sent;
    } catch (err) {
      console.error('Approve/send failed:', err);
    }
    const newReply: Message = { id: `rep-${Date.now()}`, sender: 'BeastLife Support AI', content: draftText, timestamp: 'Just now', isCustomer: false };
    onUpdateThread({ ...thread, status: 'Replied', draftStatus: 'Sent', messages: [...thread.messages, newReply] });
    setDraftText('');
    alert(sent ? `Reply sent to ${thread.senderEmail} in Gmail.` : 'Draft approved and logged. (Live Gmail send applies to connected-inbox threads.)');
    onBack();
  };

  const handleEscalate = () => {
    onUpdateThread({ ...thread, status: 'Escalated', draftStatus: 'Needs action', triggerReason: 'Manually escalated by agent for review.' });
  };

  const sentimentChip = (s: string) => {
    switch (s) {
      case 'Angry': return 'text-red-700 bg-red-50';
      case 'Frustrated': return 'text-orange-700 bg-orange-50';
      case 'Sad': return 'text-blue-700 bg-blue-50';
      case 'Happy': return 'text-green-700 bg-green-50';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const escalationNextAction = (): string => {
    const r = (thread.triggerReason || '').toLowerCase();
    if (r.includes('legal') || r.includes('regulat')) return 'Do not admit liability or offer a settlement. Review and reply personally.';
    if (r.includes('health') || r.includes('adverse')) return 'Advise the customer to stop use and consult a healthcare professional. Give no medical advice.';
    if (r.includes('evidence')) return 'Request a photo or unboxing video before resolving or escalating further.';
    if (r.includes('vip')) return 'VIP / priority account — respond personally and promptly.';
    if (r.includes('angry') || r.includes('repeat') || r.includes('3rd')) return 'Repeat angry contact — de-escalate and reply personally.';
    if (r.includes('attachment')) return 'An attachment needs human review before replying.';
    return 'Flagged for human review — handle per policy before replying.';
  };

  const mine = thread.assignedTo === currentEmail;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 truncate">{thread.senderName}</h3>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${sentimentChip(thread.sentiment)}`}>{thread.sentiment}</span>
              <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-slate-100 text-slate-600 hidden sm:inline">{thread.category}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{thread.senderEmail} · Order {thread.orderId || 'N/A'}</p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {mine ? (
            <span className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Yours</span>
          ) : (
            <button onClick={() => onClaim(thread.id)} className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer">
              <UserCheck className="w-3.5 h-3.5" /> Assign to me
            </button>
          )}
          <button onClick={runTriage} disabled={isTriaging} className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer">
            <Tag className="w-3.5 h-3.5" /> {isTriaging ? 'Triaging…' : 'Re-run triage'}
          </button>
          <button onClick={handleEscalate} disabled={thread.status === 'Escalated'} className="px-3 py-1.5 border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer">
            <AlertTriangle className="w-3.5 h-3.5" /> Escalate
          </button>
          <button onClick={generateAIDraft} disabled={isGenerating} className="px-3 py-1.5 bg-emerald-600 font-bold hover:bg-emerald-500 text-white rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5 fill-current" /> {isGenerating ? 'Generating…' : 'Generate AI Draft'}
          </button>
        </div>
      </div>

      {/* Escalation guidance */}
      {thread.status === 'Escalated' && (
        <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 shrink-0 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold text-rose-700">Escalated{thread.triggerReason ? `: ${thread.triggerReason}` : ''}</p>
            <p className="text-[11px] text-rose-900/80 leading-snug"><span className="font-bold">Next:</span> {escalationNextAction()}</p>
          </div>
        </div>
      )}

      {/* Reading pane */}
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/40">
        <h2 className="text-base font-bold text-slate-800">{thread.topic}</h2>
        {triageNote && (
          <p className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5"><Tag className="w-3 h-3 text-emerald-600 shrink-0" /> {triageNote}</p>
        )}

        <div className="mt-4 space-y-4">
          {thread.messages.map((msg) => {
            const isCustomer = msg.isCustomer;
            return (
              <div key={msg.id} className={`rounded-2xl border p-4 ${isCustomer ? 'bg-white border-slate-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isCustomer ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                      {isCustomer ? thread.senderName.slice(0, 2).toUpperCase() : 'AI'}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{isCustomer ? msg.sender : 'BeastLife Support AI'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply composer */}
      <div className="border-t border-slate-200 p-4 shrink-0 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-current" /> Reply
            {isLocalSimulated && <span className="text-[9px] font-semibold text-slate-400 normal-case tracking-tight">(offline draft)</span>}
          </span>
          {draftText && (
            <button onClick={() => { setDraftText(''); setDraftKbRefs([]); setDraftGrounded(null); }} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 py-1 px-2 hover:bg-rose-50 rounded-lg">Discard</button>
          )}
        </div>

        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          className="w-full h-28 border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 font-sans"
          placeholder="Write a reply, or click 'Generate AI Draft' for a KB-grounded suggestion…"
        />

        {/* Subtle sources / grounding */}
        {draftGrounded === true && draftKbRefs.length > 0 && (
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer text-emerald-700 font-semibold flex items-center gap-1.5 list-none">
              <BookOpen className="w-3 h-3" /> Grounded in {draftKbRefs.length} KB source{draftKbRefs.length === 1 ? '' : 's'}
            </summary>
            <ul className="mt-1.5 pl-4 space-y-1">
              {draftKbRefs.map((r) => (
                <li key={r.id} className="text-slate-500 flex items-center justify-between gap-2">
                  <span className="truncate">{r.title}</span>
                  <span className="font-mono text-slate-400 shrink-0">{Math.round(r.relevanceScore * 100)}%</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {draftGrounded === false && (
          <p className="mt-2 text-[11px] text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0" /> No relevant KB match — the draft asks the customer to clarify rather than inventing an answer.</p>
        )}

        <div className="flex justify-between items-center mt-3">
          <p className="text-[10px] text-slate-400">Nothing sends until you approve. Approving logs the reply in the thread.</p>
          <button
            onClick={handleSendDraft}
            disabled={!draftText.trim()}
            className="px-4 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Approve &amp; Send
          </button>
        </div>
      </div>
    </div>
  );
}
