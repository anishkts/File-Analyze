'use client';

import React from 'react';
import { MessageItem, ChatQuote } from './types';
import { ResearchStepBadge } from './ResearchStepBadge';
import { VerifiedQuoteBadge } from './VerifiedQuoteBadge';
import { User, Sparkles } from 'lucide-react';

interface ChatMessageProps {
  message: MessageItem;
  onQuoteClick: (quote: ChatQuote) => void;
}

export function ChatMessage({ message, onQuoteClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full space-x-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`flex flex-col max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/10'
            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
        }`}
      >
        {/* Agentic research steps */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ResearchStepBadge steps={message.toolCalls} />
        )}

        {/* Content text */}
        <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
          {message.content}
        </div>

        {/* Verified Quotes */}
        {!isUser && message.quotes && message.quotes.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Verified Citations:
            </span>
            {message.quotes.map((quote, idx) => (
              <VerifiedQuoteBadge
                key={idx}
                quote={quote}
                onClick={() => onQuoteClick(quote)}
              />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <User className="w-4 h-4 text-slate-300" />
        </div>
      )}
    </div>
  );
}
