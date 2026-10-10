'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
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
            ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
        }`}
      >
        {/* Agentic research steps */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ResearchStepBadge steps={message.toolCalls} />
        )}

        {/* Content text */}
        {isUser ? (
          <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
            {message.content}
          </div>
        ) : (
          <div className="text-xs sm:text-sm leading-relaxed font-sans text-slate-800 break-words">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 mt-2 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => (
                  <h3 className="text-xs font-bold text-slate-900 mt-1.5 mb-0.5 uppercase tracking-wide">
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-blue-500 pl-2.5 py-0.5 my-1.5 text-slate-600 italic bg-blue-50/40 rounded-r">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px] border border-slate-200">
                    {children}
                  </code>
                ),
                hr: () => <hr className="my-2 border-slate-200" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Verified Quotes */}
        {!isUser && message.quotes && message.quotes.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
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
        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 shadow-xs">
          <User className="w-4 h-4 text-slate-700" />
        </div>
      )}
    </div>
  );
}
