import React, { useState } from 'react';
import { KPI_DATA } from '../data/mockData';
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  HelpCircle, 
  ChevronDown, 
  Layers, 
  Clock,
  ThumbsUp,
  Flame,
  Laugh,
  Angry,
  Frown,
  Meh
} from 'lucide-react';

export default function AnalyticsTab() {
  const [activeMetricGroup, setActiveMetricGroup] = useState<'volume' | 'sla'>('volume');

  // SVG Chart Mock Data Points
  const weeklyVolume = [
    { day: 'Mon', received: 420, drafted: 340, escalated: 21 },
    { day: 'Tue', received: 580, drafted: 512, escalated: 45 },
    { day: 'Wed', received: 690, drafted: 602, escalated: 34 },
    { day: 'Thu', received: 642, drafted: 554, escalated: 43 },
    { day: 'Fri', received: 720, drafted: 630, escalated: 25 },
    { day: 'Sat', received: 340, drafted: 290, escalated: 15 },
    { day: 'Sun', received: 280, drafted: 240, escalated: 11 }
  ];

  const sentimentShares = [
    { label: 'Happy', count: 1450, percentage: 30, color: 'bg-green-500', stroke: 'stroke-green-500', icon: Laugh },
    { label: 'Neutral', count: 1822, percentage: 38, color: 'bg-slate-400', stroke: 'stroke-slate-400', icon: Meh },
    { label: 'Frustrated', count: 915, percentage: 19, color: 'bg-orange-500', stroke: 'stroke-orange-500', icon: Frown },
    { label: 'Angry', count: 635, percentage: 13, color: 'bg-red-500', stroke: 'stroke-red-500', icon: Angry }
  ];

  const categoryDistribution = [
    { category: 'Product Issue', count: 1540, ratio: 32 },
    { category: 'Billing & Payments', count: 1152, ratio: 24 },
    { category: 'Delivery Logistics', count: 960, ratio: 20 },
    { category: 'General / Advice', count: 576, ratio: 12 },
    { category: 'Legal / Compliance', count: 384, ratio: 8 },
    { category: 'Gourmet Feedback', count: 192, ratio: 4 }
  ];

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC] overflow-y-auto">
      
      {/* 1. TOP CARDS PERFORMANCE ROW */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Received */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            <span>Received Communications</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-0.5 text-[9px] font-semibold">
              <ArrowUpRight className="w-3 h-3" />
              12%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{KPI_DATA.received.value.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">Total email count logged this month</p>
        </div>

        {/* Card 2: Auto Drafted */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            <span>Draft Co-Pilot Ratio</span>
            <span className="text-[#3b49cc] bg-blue-50 px-2 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 text-emerald-600 fill-current" />
              Active
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{KPI_DATA.autoDrafted.percentage}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '84%' }} />
          </div>
          <p className="text-[10px] text-slate-400">4,051 prompts drafted autonomously</p>
        </div>

        {/* Card 3: Escalated */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            <span>Adverse Escalations</span>
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-0.5 text-[9px] font-semibold">
              <ArrowDownRight className="w-3 h-3" />
              2%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{KPI_DATA.escalated.value}</p>
          <p className="text-[10px] text-slate-400">Bypassed standard AI due to rules</p>
        </div>

        {/* Card 4: Solved Ratio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            <span>Overall Resolution Ratio</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[9px] font-semibold">
              Target &gt;90%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{KPI_DATA.solved.percentage}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
          </div>
          <p className="text-[10px] text-slate-400">Satisfactorily closed transactions</p>
        </div>
      </section>

      {/* 2. MAIN SPLIT VISUALS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Volume Trends Curve (custom professional SVG plot) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm lg:col-span-2 flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Email Received & AI-Draft Volume Trend</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Autonomous draft helper ratio over the last 7 calendar days</p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Received</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Co-Pilot Drafted</span>
              </div>
            </div>
          </div>

          {/* Line Chart Grid Canvas drawn in high-fidelity native SVG */}
          <div className="w-full h-64 bg-[#FCFCFE] border border-slate-100 rounded-2xl relative p-4 flex items-end">
            <svg className="w-full h-full absolute inset-0 p-4 overflow-visible" viewBox="0 0 700 220" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="180" x2="700" y2="180" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="120" x2="700" y2="120" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="60" x2="700" y2="60" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="10" x2="700" y2="10" stroke="#F1F5F9" strokeWidth="1" />

              {/* Data curves: Received (Smooth Polyline) */}
              {/* Points mapped: Mon(0, 180), Tue(116, 120), Wed(233, 80), Thu(350, 100), Fri(466, 60), Sat(583, 140), Sun(700, 160) */}
              <path 
                d="M 5 150 Q 115 110, 230 60 T 465 50 T 700 130" 
                fill="none" 
                stroke="#94A3B8" 
                strokeWidth="3.5" 
                strokeLinecap="round"
              />
              <path 
                d="M 5 150 Q 115 110, 230 60 T 465 50 T 700 130" 
                fill="none" 
                stroke="#E2E8F0" 
                strokeWidth="11" 
                strokeLinecap="round"
                opacity="0.2"
              />

              {/* Data curves: Drafted (Emerald curve) */}
              <path 
                d="M 5 160 Q 115 130, 230 70 T 465 65 T 700 140" 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="3.5" 
                strokeLinecap="round"
              />

              {/* Glow Highlights */}
              <circle cx="230" cy="60" r="5" fill="#475569" stroke="#FFF" strokeWidth="2" />
              <circle cx="465" cy="50" r="5" fill="#10B981" stroke="#FFF" strokeWidth="2" />
            </svg>

            {/* Labels overlay bottom */}
            <div className="w-full flex justify-between px-2 font-mono text-[10px] text-slate-400 font-bold">
              {weeklyVolume.map((pt, idx) => (
                <div key={idx} className="text-center w-12 pt-2.5">
                  <p>{pt.day}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Customer Sentiment Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Customer Sentiment Split</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Real-time classification breakdown on incoming communication logs</p>
            </div>
            <p className="bg-orange-50 border border-orange-100 text-[10px] font-bold text-orange-700 px-2 py-0.5 rounded">
              32% Frustrated/Angry
            </p>
          </div>

          {/* Donut Chart visualizer */}
          <div className="flex justify-center py-4">
            <div className="relative w-36 h-36">
              {/* Nested SVG circular plots */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#F1F5F9" strokeWidth="3" />
                
                {/* Segment Happy (30%) - stroke-dasharray = percentage / 100 * (2 * PI * R == 100) */}
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#10B981" strokeWidth="3" 
                  strokeDasharray="30 100" strokeDashoffset="0" />
                
                {/* Segment Neutral (38%) */}
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#94A3B8" strokeWidth="3" 
                  strokeDasharray="38 100" strokeDashoffset="-30" />
                
                {/* Segment Frustrated (19%) */}
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#F97316" strokeWidth="3"  
                  strokeDasharray="19 100" strokeDashoffset="-68" />
                
                {/* Segment Angry (13%) */}
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#EF4444" strokeWidth="3" 
                  strokeDasharray="13 100" strokeDashoffset="-87" />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-800">4,822</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Processed</span>
              </div>
            </div>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-2 gap-2 pb-1">
            {sentimentShares.map((itm, idx) => {
              const IconComp = itm.icon;
              return (
                <div key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className={`w-2 h-2 rounded-full ${itm.color}`} />
                  <IconComp className="w-3.5 h-3.5 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-700 truncate leading-tight">{itm.label}</p>
                    <p className="text-[9px] text-slate-400 leading-none mt-0.5">{itm.count}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800">{itm.percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. LOWER CATEGORY DISTRIBUTION ROW */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Category Tag Frequency Matrix</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Classification weightings parsed over recent communications batches</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryDistribution.map((item, idx) => (
            <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">{item.category}</span>
                <span className="text-[10px] font-mono text-slate-400">{item.count.toLocaleString()} emails</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Horizontal custom bar */}
                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.ratio * 2.5}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-800 shrink-0">{item.ratio}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
