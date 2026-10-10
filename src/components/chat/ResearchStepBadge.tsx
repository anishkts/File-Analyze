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
    <div className="my-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 overflow-hidden max-w-full">
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
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-2 overflow-hidden">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-2.5 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs overflow-hidden max-w-full"
            >
              <div className="mt-0.5 flex-shrink-0">{getToolIcon(step.toolName)}</div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-slate-800 font-semibold truncate">{step.toolName}</span>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">Round {step.round || idx + 1}</span>
                </div>
                <p className="text-slate-600 mt-0.5 break-words whitespace-normal leading-relaxed">{step.statusText}</p>
                {step.args && Object.keys(step.args).length > 0 && (
                  <pre className="text-[10px] text-slate-600 font-mono mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-200/80 max-w-full overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(step.args, null, 2)}
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
