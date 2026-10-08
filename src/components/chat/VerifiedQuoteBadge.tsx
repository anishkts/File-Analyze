'use client';

import React from 'react';
import { ChatQuote } from './types';
import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

interface VerifiedQuoteBadgeProps {
  quote: ChatQuote;
  onClick?: () => void;
}

export function VerifiedQuoteBadge({ quote, onClick }: VerifiedQuoteBadgeProps) {
  if (quote.verified) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        className="group inline-flex flex-col my-1.5 p-2 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500/60 rounded-lg text-xs cursor-pointer transition text-left w-full"
      >
        <div className="flex items-center justify-between text-emerald-400 font-medium mb-1">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-semibold tracking-wide uppercase">
              Verified Quote
            </span>
            {quote.documentName && (
              <span className="text-slate-400 text-[11px] font-normal">
                • {quote.documentName}
              </span>
            )}
            {quote.pageNumber && (
              <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded text-[10px]">
                Page {quote.pageNumber}
              </span>
            )}
          </div>
          <span className="flex items-center text-[10px] text-emerald-400 opacity-80 group-hover:opacity-100 group-hover:underline">
            View in Document <ExternalLink className="w-3 h-3 ml-1" />
          </span>
        </div>
        <p className="text-slate-300 italic text-[11px] line-clamp-2 pl-5 border-l-2 border-emerald-500/40">
          &ldquo;{quote.quote}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col my-1.5 p-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-left w-full">
      <div className="flex items-center space-x-1.5 text-amber-400 font-medium mb-1">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold tracking-wide uppercase">
          Unverified / Paraphrased
        </span>
      </div>
      <p className="text-slate-400 italic text-[11px] line-clamp-2 pl-5 border-l-2 border-amber-500/40">
        &ldquo;{quote.quote}&rdquo;
      </p>
      <span className="text-[10px] text-amber-500/80 mt-1 pl-5">
        Warning: This passage could not be verified in the source text.
      </span>
    </div>
  );
}
