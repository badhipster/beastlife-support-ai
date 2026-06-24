import React, { useState } from 'react';
import { INITIAL_KB_SECTIONS, KB_CHUNKS } from '../data/mockData';
import { KBSection, KBChunk } from '../types';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  FolderPlus, 
  FileCode, 
  RefreshCw, 
  Upload, 
  PlusCircle, 
  CheckCircle,
  FileText
} from 'lucide-react';

export default function KnowledgeBaseTab() {
  const [sections, setSections] = useState<KBSection[]>(INITIAL_KB_SECTIONS);
  const [chunks, setChunks] = useState<KBChunk[]>(KB_CHUNKS);
  
  // RAG Interactive Tester State
  const [ragQuery, setRagQuery] = useState<string>('My whey protein powder arrived lumpy and clumping inside.');
  const [testedChunks, setTestedChunks] = useState<KBChunk[]>(KB_CHUNKS.slice(0, 2));
  const [isRetrieving, setIsRetrieving] = useState<boolean>(false);
  
  // Custom Article Adder State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Protein Q&A / Mixability');
  const [newBody, setNewBody] = useState<string>('');
  const [isFileDropped, setIsFileDropped] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  // Invoke the server RAG resolver
  const runRAGSearch = async () => {
    if (!ragQuery.trim()) return;
    setIsRetrieving(true);
    try {
      const response = await fetch('/api/retrieve-kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery })
      });
      const data = await response.json();
      if (response.ok) {
        setTestedChunks(data.chunks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetrieving(false);
    }
  };

  // Drag and Drop simulated document upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDropped(true);
    setNewTitle('Imported_QC_Doc_Raw.txt');
    setNewBody('"...Batch verification reports of our micellar casein isolate. Casein peptide bounds have a thicker micellar matrix, meaning they naturally coagulate under higher heat pressure compared to cross-filtered whey protein. Standard moisture indexes must be maintained under 4.0%..."');
    setTimeout(() => {
      setIsFileDropped(false);
      setUploadSuccess(true);
    }, 1200);
  };

  const handleFileUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewTitle(file.name);
      setNewBody(`"...Raw documentation imported from user local file: ${file.name}. This document covers safety guidelines, customer support resolution flowcharts, and QC protocols..."`);
      setUploadSuccess(true);
    }
  };

  // Submit new article to search pool
  const handleSubmitArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    const newSecId = `KB-SEC-${Date.now()}`;
    const newChunkId = `chunk-${Date.now()}`;

    // Update chunks pool
    const addedChunk: KBChunk = {
      id: newChunkId,
      sourceId: `BL-USER-ADD`,
      title: newTitle,
      relevanceScore: 0.95,
      category: newCategory,
      text: newBody
    };

    setChunks([addedChunk, ...chunks]);
    
    // Reset uploader
    setNewTitle('');
    setNewBody('');
    setUploadSuccess(false);
    alert('Documentation added onto retrieval index pools! You can now verify or search for it.');
  };

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] p-6 gap-6 bg-[#F8FAFC] overflow-y-auto">
      
      {/* LEFT SECTION: KB STRUCTURAL DIRECTORIES */}
      <div className="space-y-6">
        
        {/* Header Block */}
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Knowledge Base Repositories</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Categorized guidelines and official brand document indexes</p>
          </div>
          <button className="px-3 py-1.5 bg-slate-900 border border-slate-900 text-white hover:bg-[#1E293B] text-xs font-bold rounded-lg flex items-center gap-1">
            <PlusCircle className="w-3.5 h-3.5" />
            Add Section
          </button>
        </div>

        {/* Categories Directories Lists */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Folder directories</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {sections.map((sec) => (
              <div 
                key={sec.id}
                className="p-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all flex flex-col justify-between h-28"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sec.category}</span>
                    <h5 className="text-xs font-bold text-slate-800">{sec.title}</h5>
                  </div>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex justify-between items-baseline pt-2 text-[10px] text-slate-500 font-semibold border-t border-slate-100">
                  <span>{sec.articlesCount} items</span>
                  <span>Updated {sec.updatedTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drag and Drop Document Upload Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dynamic ingestion loader</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Upload local nutrition guideline files directly to integrate standard RAG searches</p>
          </div>

          <form onSubmit={handleSubmitArticle} className="space-y-4.5">
            {/* Drop Zone */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                isFileDropped 
                  ? 'border-emerald-500 bg-emerald-50/50' 
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50'
              }`}
            >
              <Upload className={`w-8 h-8 ${isFileDropped ? 'text-emerald-500' : 'text-slate-400'}`} />
              <label className="text-xs font-bold text-slate-700 mt-2 block hover:underline">
                Drag & drop files or click to browser files
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUploadInput} 
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-1">Accepts standard text files (.txt, .pdf, .docx, up-to 5MB)</p>
            </div>

            {uploadSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Inbound document loaded: &ldquo;{newTitle}&rdquo;. Ready for indexing check.
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Document title</span>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none" 
                    placeholder="e.g. Soy Iso-Whey QC parameters"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Category cluster</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Protein Q&A / Mixability">Protein Q&A / Mixability</option>
                    <option value="Product Quality / Standards">Product Quality / Standards</option>
                    <option value="Logistics / Courier">Logistics / Courier</option>
                    <option value="Legal / Policy">Legal / Policy</option>
                  </select>
                </div>
              </div>

              {/* Text Area */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Paragraph Segment Content</span>
                <textarea 
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="w-full h-24 p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-sans" 
                  placeholder="Insert core paragraph, quotes, or reference guidelines..."
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow shadow-emerald-900/10 active:scale-95 cursor-pointer"
              >
                Incorporate Article into Vector Store
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT SECTION: SEMANTIC RAG RETRIEVAL LAB */}
      <div className="space-y-6">
        {/* Core RAG Playground Header */}
        <div className="bg-[#1E293B] border border-slate-700 text-slate-200 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Verification Zone
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400 fill-current animate-pulse" />
          </div>

          <h3 className="text-sm font-bold text-white tracking-tight leading-tight">Semantic RAG Playground</h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            Verify how incoming customer issues align with active knowledge indexes dynamically. Type custom client concerns below and observe actual cluster query results calculated server-side.
          </p>
        </div>

        {/* Semantic Query Testing Console */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sandbox searcher</h4>
          
          <div className="relative">
            <input 
              type="text" 
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. My mass gainer protein smells sour fat lipid oxidation..."
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
            {isRetrieving ? 'Calculating embeddings...' : 'Evaluate Semantic Vector retrieval'}
          </button>

          {/* Retrieval hits */}
          <div className="space-y-4 pt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indexed Search Hits</p>
            
            {isRetrieving ? (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse mx-auto" />
                <p className="text-xs mt-2">Computing cosine similarities on server...</p>
              </div>
            ) : testedChunks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Initialize query to verify distance.</p>
            ) : (
              <div className="space-y-3.5">
                {testedChunks.map((chunk) => {
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
                      
                      <p className="text-xs text-slate-600 leading-relaxed italic bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                        {chunk.text}
                      </p>

                      <div className="text-[9px] text-slate-400 flex justify-between">
                        <span className="italic">{chunk.category}</span>
                        <span className="font-semibold text-slate-500">Distance score: {(1 - chunk.relevanceScore).toFixed(4)}</span>
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
