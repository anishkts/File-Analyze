'use client';

import React, { useState } from 'react';
import { ResearchStep } from './types';
import { Search, ListTree, BookOpen, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';

interface ResearchStepBadgeProps {
  steps: ResearchStep[];
}

export function ResearchStepBadge({ steps }: ResearchStepBadgeProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  if (!steps || steps.length === 0) return null;

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'search_document':
        return <Search className="w-3.5 h-3.5 text-blue-400" />;
      case 'list_clauses':
        return <ListTree className="w-3.5 h-3.5 text-indigo-400" />;
      case 'get_section':
        return <BookOpen className="w-3.5 h-3.5 text-emerald-400" />;
      case 'check_coverage':
        return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Search className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="my-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full font-medium hover:text-slate-900 transition"
      >
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-slate-800 font-medium">
            Agentic Research Process ({steps.length} {steps.length === 1 ? 'step' : 'steps'})
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-2 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 shadow-xs"
            >
              <div className="mt-0.5">{getToolIcon(step.toolName)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-800 font-semibold">{step.toolName}</span>
                  <span className="text-[10px] text-slate-500">Round {step.round || idx + 1}</span>
                </div>
                <p className="text-slate-600 mt-0.5">{step.statusText}</p>
                {step.args && (
                  <pre className="text-[10px] text-slate-500 font-mono mt-1 overflow-x-auto">
                    {JSON.stringify(step.args)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
