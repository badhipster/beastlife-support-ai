import React, { useState, useEffect } from 'react';
import { KBChunk } from '../types';
import { Search, Sparkles, RefreshCw, FileText, Database } from 'lucide-react';

interface KbStats {
  totalChunks: number;
  sections: { category: string; count: number }[];
}

export default function KnowledgeBaseTab() {
  const [stats, setStats] = useState<KbStats>({ totalChunks: 0, sections: [] });
  const [ragQuery, setRagQuery] = useState<string>('My whey protein powder arrived lumpy and clumping inside.');
  const [results, setResults] = useState<KBChunk[]>([]);
  const [isRetrieving, setIsRetrieving] = useState<boolean>(false);

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
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] p-6 gap-6 bg-[#F8FAFC] overflow-y-auto">
      {/* LEFT: real KB structure */}
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Knowledge Base</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Ingested from the BeastLife Knowledge Base, embedded for retrieval</p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
            {stats.totalChunks} chunks
          </span>
        </div>

        {/* Real category breakdown of the embedded index */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Indexed sections</h4>
          {stats.sections.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading sections…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {stats.sections.map((sec) => (
                <div
                  key={sec.category}
                  className="p-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all flex flex-col justify-between h-24"
                >
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-bold text-slate-800 leading-tight pr-2">{sec.category}</h5>
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

        {/* Honest source card (replaces the non-functional uploader) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <Database className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-700">How this index is built</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              The KB PDF is chunked per Q&amp;A pair, product, and policy section, embedded with
              <span className="font-semibold text-slate-600"> gemini-embedding-001</span>, and stored in Postgres (pgvector).
              Retrieval is real cosine similarity, the same path the draft co-pilot uses. Upload of new
              articles is a later phase.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: real semantic retrieval playground */}
      <div className="space-y-6">
        <div className="bg-[#1E293B] border border-slate-700 text-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Verification Zone
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400 fill-current animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight leading-tight">Semantic RAG Playground</h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            Type a customer concern and see the actual pgvector chunks the system would retrieve, with real
            cosine similarity scores computed server-side.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sandbox searcher</h4>

          <div className="relative">
            <input
              type="text"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runRAGSearch()}
              className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. My mass gainer smells sour, is it spoiled?"
            />
            <button
              onClick={runRAGSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600 cursor-pointer"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          </div>

          <button
            onClick={runRAGSearch}
            className="w-full py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            disabled={isRetrieving}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRetrieving ? 'animate-spin' : ''}`} />
            {isRetrieving ? 'Calculating embeddings…' : 'Evaluate semantic retrieval'}
          </button>

          <div className="space-y-4 pt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top retrieved chunks</p>

            {isRetrieving ? (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse mx-auto" />
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
                      className="border border-slate-200 rounded-xl p-3 bg-white shadow-sm space-y-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="text-[8px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                            {chunk.sourceId}
                          </span>
                          <h6 className="text-[11px] font-bold text-slate-800 leading-tight mt-1">{chunk.title}</h6>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded leading-none">
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
  );
}
