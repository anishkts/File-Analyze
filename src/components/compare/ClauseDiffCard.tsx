'use client';

import React, { useState } from 'react';
import { ClauseDiffItem } from '@/lib/comparison/types';
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, PlusCircle, MinusCircle } from 'lucide-react';

interface ClauseDiffCardProps {
  diff: ClauseDiffItem;
}

export function ClauseDiffCard({ diff }: ClauseDiffCardProps) {
  const [expanded, setExpanded] = useState<boolean>(diff.status !== 'unchanged');

  const getStatusBadge = () => {
    switch (diff.status) {
      case 'modified':
        return (
          <span className="flex items-center space-x-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <AlertCircle className="w-3 h-3" />
            <span>Modified</span>
          </span>
        );
      case 'added':
        return (
          <span className="flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <PlusCircle className="w-3 h-3" />
            <span>Added</span>
          </span>
        );
      case 'deleted':
        return (
          <span className="flex items-center space-x-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <MinusCircle className="w-3 h-3" />
            <span>Deleted</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
            <CheckCircle className="w-3 h-3" />
            <span>Unchanged</span>
          </span>
        );
    }
  };

  const getSignificanceBadge = () => {
    if (!diff.significance) return null;
    const { level } = diff.significance;

    switch (level) {
      case 'high':
        return (
          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            High Significance
          </span>
        );
      case 'medium':
        return (
          <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Medium Significance
          </span>
        );
      default:
        return (
          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px]">
            Low / Stylistic
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-slate-700 transition">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-850/50 transition"
      >
        <div className="flex items-center space-x-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-semibold text-blue-400">
                {diff.sectionNumber}
              </span>
              <span className="text-sm font-semibold text-slate-200">{diff.title}</span>
            </div>
            {diff.significance && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                {diff.significance.summary}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getSignificanceBadge()}
          {getStatusBadge()}
        </div>
      </div>

      {/* Expanded Diff Details */}
      {expanded && (
        <div className="p-4 pt-0 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
          {diff.significance && (
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-300">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Substantive Legal Analysis:
              </span>
              {diff.significance.summary}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Version A */}
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Original Version (A)
              </span>
              <div className="flex-1 p-3 bg-slate-900/70 border border-rose-500/20 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans">
                {diff.contentA || <span className="text-slate-500 italic">Not present in Version A</span>}
              </div>
            </div>

            {/* Version B */}
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Subsequent Version (B)
              </span>
              <div className="flex-1 p-3 bg-slate-900/70 border border-emerald-500/20 rounded-lg text-xs text-slate-300 whitespace-pre-wrap font-sans">
                {diff.contentB || <span className="text-slate-500 italic">Deleted in Version B</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
