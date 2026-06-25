import React, { useState, useEffect } from 'react';
import { KBChunk } from '../types';
import { Search, Sparkles, RefreshCw, FileText, Database, BookOpen, X, UploadCloud, Tag, Link } from 'lucide-react';

interface KbStats {
  totalChunks: number;
  sections: { category: string; count: number }[];
}

interface FocusedSource {
  sourceId: string;
  title: string;
  category: string;
  text: string;
}

export default function KnowledgeBaseTab({ focusSourceId }: { focusSourceId?: string | null }) {
  const [stats, setStats] = useState<KbStats>({ totalChunks: 0, sections: [] });
  const [ragQuery, setRagQuery] = useState<string>('My whey protein powder arrived lumpy and clumping inside.');
  const [results, setResults] = useState<KBChunk[]>([]);
  const [isRetrieving, setIsRetrieving] = useState<boolean>(false);
  const [focused, setFocused] = useState<FocusedSource | null>(null);

  // Deep-link from a draft's cited source: fetch and pin that passage at the top.
  useEffect(() => {
    if (!focusSourceId) { setFocused(null); return; }
    let cancelled = false;
    fetch(`/api/kb/source/${encodeURIComponent(focusSourceId)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.chunk) setFocused(d.chunk); })
      .catch((err) => console.error('Failed to load KB source:', err));
    return () => { cancelled = true; };
  }, [focusSourceId]);

  // Real KB stats + an initial live retrieval so the panel never shows mock data.
  useEffect(() => {
    fetch('/api/kb/stats')
      .then((r) => r.json())
      .then((d) => setStats({ totalChunks: d.totalChunks || 0, sections: d.sections || [] }))
      .catch((err) => console.error('Failed to load KB stats:', err));
    runRAGSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runRAGSearch = async () => {
    if (!ragQuery.trim()) return;
    setIsRetrieving(true);
    try {
      const response = await fetch('/api/retrieve-kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery }),
      });
      const data = await response.json();
      if (response.ok) setResults(data.chunks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetrieving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F6F8FC] overflow-y-auto">
      {/* Pinned source: opened from a draft's cited sources */}
      {focused && (
        <div className="mx-6 mt-6 bg-white border-2 border-blue-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Opened from a draft</p>
                <h3 className="text-sm font-semibold text-slate-800 truncate">{focused.title}</h3>
              </div>
            </div>
            <button onClick={() => setFocused(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap mt-3 bg-amber-50 border border-amber-100 p-3 rounded-lg">{focused.text}</p>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
            <span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{focused.sourceId}</span>
            <span className="italic">{focused.category}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] p-6 gap-6">
      {/* LEFT: real KB structure */}
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Knowledge Base</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Ingested from the BeastLife Knowledge Base, embedded for retrieval</p>
          </div>
          <span className="text-[11px] font-semibold text-[#1A73E8] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
            {stats.totalChunks} chunks
          </span>
        </div>

        {/* Real category breakdown of the embedded index */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Indexed sections</h4>
          {stats.sections.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading sections…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {stats.sections.map((sec) => (
                <div
                  key={sec.category}
                  className="p-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all flex flex-col justify-between h-24"
                >
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-semibold text-slate-800 leading-tight pr-2">{sec.category}</h5>
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <div className="flex justify-between items-baseline pt-2 text-[10px] text-slate-500 font-semibold border-t border-slate-100">
                    <span>{sec.count} {sec.count === 1 ? 'chunk' : 'chunks'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Knowledge Base Manager */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Knowledge Base Manager</h4>
          </div>
          
          <div className="space-y-4 pt-2">
            {/* Upload Area */}
            <div 
              className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => alert('File upload will process asynchronously.')}
            >
              <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
              <h5 className="text-xs font-semibold text-slate-700">Upload or edit KB articles</h5>
              <p className="text-[10px] text-slate-500 mt-1">Supports PDF, DOCX, and plain text</p>
            </div>

            {/* Tagging */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                Tag before upload
              </label>
              <select className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#1A73E8]">
                <option value="">Select Category...</option>
                <option value="Legal">Legal</option>
                <option value="Product Issue">Product Issue</option>
                <option value="Delivery Issue">Delivery Issue</option>
                <option value="Return/Refund">Return/Refund</option>
                <option value="Billing">Billing</option>
                <option value="General Enquiry">General Enquiry</option>
              </select>
            </div>

            <hr className="border-slate-100" />

            {/* Bulk Import Integrations - Pro Max Redesign */}
            <div className="space-y-3 mt-4">
              <label className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Link className="w-3.5 h-3.5" />
                Continuous Sync Integrations
              </label>
              <p className="text-[10px] text-slate-500 mb-2">Connect your existing workspaces to keep the knowledge base automatically updated.</p>
              
              <div className="space-y-2">
                {/* Integration Card: Notion */}
                <div className="flex items-center justify-between p-3 border border-slate-200 bg-white rounded-lg hover:border-slate-300 transition-colors shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center border border-slate-200">
                      <FileText className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-800">Notion Workspace</h5>
                      <p className="text-[10px] text-slate-500">Not connected</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert('Initiating Notion OAuth flow...')}
                    className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shadow-sm active:scale-95"
                  >
                    Connect
                  </button>
                </div>

                {/* Integration Card: Zendesk */}
                <div className="flex items-center justify-between p-3 border border-slate-200 bg-white rounded-lg hover:border-slate-300 transition-colors shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center border border-slate-200">
                      <Database className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-800">Zendesk Help Center</h5>
                      <p className="text-[10px] text-slate-500">Not connected</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert('Initiating Zendesk OAuth flow...')}
                    className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shadow-sm active:scale-95"
                  >
                    Connect
                  </button>
                </div>
                
                {/* Integration Card: Confluence */}
                <div className="flex items-center justify-between p-3 border border-slate-200 bg-white rounded-lg hover:border-slate-300 transition-colors shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center border border-slate-200">
                      <BookOpen className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-800">Confluence Wiki</h5>
                      <p className="text-[10px] text-slate-500">Not connected</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert('Initiating Confluence OAuth flow...')}
                    className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shadow-sm active:scale-95"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT: real semantic retrieval playground */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 text-slate-700 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#1A73E8] bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Verification Zone
            </span>
            <Sparkles className="w-4 h-4 text-[#1A73E8] fill-current animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight leading-tight">Semantic RAG Playground</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Type a customer concern and see the actual pgvector chunks the system would retrieve, with real
            cosine similarity scores computed server-side.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4.5">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Sandbox searcher</h4>

          <div className="relative">
            <input
              type="text"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runRAGSearch()}
              className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
              placeholder="e.g. My mass gainer smells sour, is it spoiled?"
            />
            <button
              onClick={runRAGSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-[#1A73E8] cursor-pointer"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          </div>

          <button
            onClick={runRAGSearch}
            className="w-full py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            disabled={isRetrieving}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRetrieving ? 'animate-spin' : ''}`} />
            {isRetrieving ? 'Calculating embeddings…' : 'Evaluate semantic retrieval'}
          </button>

          <div className="space-y-4 pt-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Top retrieved chunks</p>

            {isRetrieving ? (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="w-6 h-6 text-[#1A73E8] animate-pulse mx-auto" />
                <p className="text-xs mt-2">Computing cosine similarities on server…</p>
              </div>
            ) : results.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Run a query to see retrieved chunks.</p>
            ) : (
              <div className="space-y-3.5">
                {results.map((chunk) => {
                  const relevancePercent = Math.round(chunk.relevanceScore * 100);
                  return (
                    <div
                      key={chunk.id}
                      className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm space-y-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="text-[8px] font-mono font-semibold bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                            {chunk.sourceId}
                          </span>
                          <h6 className="text-[11px] font-semibold text-slate-800 leading-tight mt-1">{chunk.title}</h6>
                        </div>
                        <span className="text-[10px] font-semibold text-[#1A73E8] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded leading-none">
                          {relevancePercent}%
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed italic bg-amber-50 border border-amber-100 p-2.5 rounded-lg line-clamp-4">
                        {chunk.text}
                      </p>

                      <div className="text-[9px] text-slate-400 flex justify-between">
                        <span className="italic">{chunk.category}</span>
                        <span className="font-semibold text-slate-500">cosine {chunk.relevanceScore.toFixed(4)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
