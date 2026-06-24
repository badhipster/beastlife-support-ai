import React, { useState, useEffect } from 'react';
import { EmailThread, Message, KBChunk } from '../types';
import { 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  Tag, 
  Trash2, 
  Send, 
  Users, 
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Search,
  BookOpen,
  Maximize2
} from 'lucide-react';

interface DetailViewProps {
  thread: EmailThread;
  onBack: () => void;
  onUpdateThread: (updatedThread: EmailThread) => void;
}

export default function DetailView({ thread, onBack, onUpdateThread }: DetailViewProps) {
  const [draftText, setDraftText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [kbQuery, setKbQuery] = useState<string>('');
  const [kbChunks, setKbChunks] = useState<KBChunk[]>([]);
  const [isSearchingKb, setIsSearchingKb] = useState<boolean>(false);
  const [isLocalSimulated, setIsLocalSimulated] = useState<boolean>(false);
  const [draftKbRefs, setDraftKbRefs] = useState<{ id: string; sourceId: string; title: string; relevanceScore: number }[]>([]);
  const [draftGrounded, setDraftGrounded] = useState<boolean | null>(null);

  useEffect(() => {
    setDraftText('');
    setDraftKbRefs([]);
    setDraftGrounded(null);
    setKbQuery(thread.topic);
    searchKB(thread.topic);
  }, [thread]);

  // AI draft call using server route
  const generateAIDraft = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: thread.topic,
          message: thread.messages[thread.messages.length - 1]?.content || '',
          senderName: thread.senderName,
          category: thread.category,
          sentiment: thread.sentiment,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setDraftText(data.draft);
        setIsLocalSimulated(!!data.simulated);
        setDraftKbRefs(data.kbRefs || []);
        setDraftGrounded(typeof data.grounded === 'boolean' ? data.grounded : null);
      } else {
        console.error('Error generating draft from server', data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // KB Search call using server route (RAG search)
  const searchKB = async (queryToSearch: string) => {
    setIsSearchingKb(true);
    try {
      const response = await fetch('/api/retrieve-kb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryToSearch }),
      });

      const data = await response.json();
      if (response.ok) {
        setKbChunks(data.chunks || []);
      }
    } catch (err) {
      console.error('Error searching KB:', err);
    } finally {
      setIsSearchingKb(false);
    }
  };

  // Actions
  const handleSendDraft = () => {
    if (!draftText.trim()) return;

    // Create fresh reply message
    const newReply: Message = {
      id: `rep-${Date.now()}`,
      sender: 'BeastLife Support AI',
      content: draftText,
      timestamp: 'Just now',
      isCustomer: false
    };

    const updatedThread: EmailThread = {
      ...thread,
      status: 'Replied',
      draftStatus: 'Sent',
      messages: [...thread.messages, newReply]
    };

    onUpdateThread(updatedThread);
    setDraftText('');
    alert(`Response successfully transmitted to ${thread.senderEmail}!`);
    onBack();
  };

  const handleEscalate = () => {
    const updatedThread: EmailThread = {
      ...thread,
      status: 'Escalated',
      draftStatus: 'Needs action',
      triggerReason: `Manually escalated by supervisor for strict legal/technical oversight.`
    };
    onUpdateThread(updatedThread);
    alert('Case flagged as Escalated. Supervisors have been alerted.');
  };

  const mapSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Angry': return 'text-red-700 bg-red-100 border-red-200';
      case 'Frustrated': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'Sad': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'Happy': return 'text-green-700 bg-green-100 border-green-200';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  const insertChunkToDraft = (chunkText: string) => {
    // Quick insertion wrapper
    setDraftText(prev => `${prev}\n\n[KB Note incorporated]:\n${chunkText}`);
  };

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[2fr_1fr] h-full overflow-hidden bg-[#F8FAFC]">
      
      {/* LEFT SECTION: CONVERSATION WORKSPACE */}
      <div className="flex flex-col h-full border-r border-slate-200 overflow-hidden bg-white">
        
        {/* Workspace Top Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">{thread.senderName}</h3>
                <span className={`px-2 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wider ${mapSentimentColor(thread.sentiment)}`}>
                  {thread.sentiment}
                </span>
                {thread.status === 'Escalated' && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 border border-red-200 rounded text-[9px] font-bold uppercase tracking-wide">
                    Escalated
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{thread.senderEmail} &bull; Order <span className="font-bold">{thread.orderId || 'N/A'}</span></p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button 
              onClick={handleEscalate}
              disabled={thread.status === 'Escalated'}
              className="px-3 py-1.5 border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Escalate Case
            </button>
            <button 
              onClick={generateAIDraft}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-emerald-600 font-bold hover:bg-emerald-500 text-white rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/10 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              {isGenerating ? 'AI preparing...' : 'Generate AI Draft'}
            </button>
          </div>
        </div>

        {/* Dynamic Thread Header Summary Panel */}
        <div className="bg-slate-50/50 border-b border-slate-200 p-4 shrink-0 px-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject & Auto-Summary</p>
          <h4 className="text-xs font-bold text-slate-800 mt-1">{thread.topic}</h4>
          <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            &ldquo;{thread.brief}&rdquo;
          </p>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
          {thread.messages.map((msg) => {
            const isCustomer = msg.isCustomer;
            return (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isCustomer ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isCustomer ? 'bg-[#dae2fd] text-[#131b2e]' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isCustomer ? thread.senderName.slice(0, 2).toUpperCase() : 'AI'}
                </div>

                {/* Message Body Block */}
                <div className={`p-4 rounded-2xl border ${
                  isCustomer 
                    ? 'bg-white border-slate-200 shadow-sm text-slate-700' 
                    : 'bg-emerald-50/50 border-emerald-100 shadow-sm text-emerald-950'
                }`}>
                  <div className="flex justify-between items-baseline gap-4 mb-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                      {isCustomer ? msg.sender : 'BeastLife Support AI'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Area: AI Draft Editor */}
        <div className="border-t border-slate-200 p-5 shrink-0 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-current animate-pulse" />
              Active Draft Area {isLocalSimulated && <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-tight">(Simulated offline)</span>}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setDraftText(''); setDraftKbRefs([]); setDraftGrounded(null); }}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 py-1 px-2 hover:bg-rose-50 rounded-lg Transition-all"
                title="Discard draft"
              >
                Discard
              </button>
            </div>
          </div>

          {/* Grounding indicator: shows what KB sources the draft used, or that it asked to clarify */}
          {draftGrounded !== null && (
            draftGrounded ? (
              <div className="mb-2 flex items-start gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                <BookOpen className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  <span className="font-bold uppercase tracking-tight">Grounded in {draftKbRefs.length} KB source{draftKbRefs.length === 1 ? '' : 's'}:</span>{' '}
                  {draftKbRefs.map((r) => r.title).join(', ')}
                </span>
              </div>
            ) : (
              <div className="mb-2 flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="font-medium">No relevant KB match found. Draft asks the customer to clarify rather than inventing an answer.</span>
              </div>
            )
          )}

          {/* Draft text Area */}
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            className="w-full h-32 border border-slate-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 font-sans"
            placeholder="No draft active. Click 'Generate AI Draft' to consult Gemini or type your own custom response here..."
          />

          {/* Editor buttons */}
          <div className="flex justify-between mt-3">
            <p className="text-[10px] text-slate-400 leading-none self-center">
              *Approve replies automatically logs the response in the thread.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={handleSendDraft}
                disabled={!draftText.trim()}
                className="px-4 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 hover:border-slate-800 transition-all flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Approve & Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: SEMANTIC KNOWLEDGE BASE (RAG INTERACTION SIDEBAR) */}
      <div className="flex flex-col h-full bg-[#FCFDFE] p-5.5 space-y-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 shrink-0">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">RAG Knowledge Base context</h4>
        </div>

        {/* Dynamic Query search block */}
        <div className="shrink-0 space-y-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Structured Search Terms</p>
          <div className="relative">
            <input 
              type="text"
              value={kbQuery}
              onChange={(e) => setKbQuery(e.target.value)}
              className="w-full pl-3 pr-8.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Enter search phrase..."
            />
            <button 
              onClick={() => searchKB(kbQuery)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={() => searchKB(kbQuery)}
            disabled={isSearchingKb}
            className="w-full py-1 bg-white hover:bg-slate-50 transition-all border border-slate-200 text-[10px] font-bold text-emerald-600 rounded-md"
          >
            {isSearchingKb ? 'Evaluating clusters...' : 'Refresh Semantic Search'}
          </button>
        </div>

        {/* KB Hit entries list scrolling */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {isSearchingKb ? (
            <div className="text-center py-20 text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-xs font-medium">Invoking server-side Gemini semantic mapping model...</p>
            </div>
          ) : kbChunks.length === 0 ? (
            <div className="text-center py-24 text-slate-400 text-xs">
              No matching knowledge records in active indexes.
            </div>
          ) : (
            kbChunks.map((chunk) => {
              const relevancePercent = Math.round(chunk.relevanceScore * 100);
              return (
                <div 
                  key={chunk.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-1.5">
                    <div>
                      <span className="text-[8px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                        {chunk.sourceId}
                      </span>
                      <h5 className="text-[11px] font-bold text-slate-800 leading-tight mt-1">{chunk.title}</h5>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded leading-none shrink-0">
                      {relevancePercent}% Rel
                    </span>
                  </div>

                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Matched paragraph chunk</p>
                  <p className="text-xs text-slate-600 leading-relaxed italic bg-amber-50 border border-amber-100 p-2 rounded-lg">
                    {chunk.text}
                  </p>

                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className="text-slate-400 italic truncate pr-2">{chunk.category}</span>
                    <button 
                      onClick={() => insertChunkToDraft(chunk.text)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded font-bold text-slate-700 text-[10px] shrink-0 transition-all flex items-center gap-0.5 cursor-pointer"
                    >
                      Insert Cite
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
