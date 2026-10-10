'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatPaneProps, MessageItem, ChatQuote, ResearchStep } from './types';
import { ChatMessage } from './ChatMessage';
import { Send, Square, Sparkles, MessageSquare, AlertCircle, FileText } from 'lucide-react';

export function ChatPane({ selectedDocumentIds, documents, onQuoteClick }: ChatPaneProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStatus]);

  // Handle Stop Generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setCurrentStatus(null);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isStreaming || selectedDocumentIds.length === 0) return;

    setInput('');
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setCurrentStatus('Initializing agentic research...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantMsgId = `asst-${Date.now()}`;
    const partialSteps: ResearchStep[] = [];
    let partialContent = '';

    // Create placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        quotes: [],
      },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          documentIds: selectedDocumentIds,
          message: query,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No readable stream returned');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);

            if (data.type === 'session') {
              setSessionId(data.sessionId);
            } else if (data.type === 'status') {
              setCurrentStatus(data.status);
            } else if (data.type === 'step') {
              partialSteps.push(data.step);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, toolCalls: [...partialSteps] }
                    : m
                )
              );
            } else if (data.type === 'token') {
              partialContent += data.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: partialContent }
                    : m
                )
              );
            } else if (data.type === 'quotes') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, quotes: data.quotes }
                    : m
                )
              );
            }
          } catch (jsonErr) {
            console.error('Failed to parse SSE payload:', jsonErr);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation aborted by user');
      } else {
        console.error('Chat error:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    m.content ||
                    `Error during research: ${err.message || 'Unable to complete response'}`,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setCurrentStatus(null);
      abortControllerRef.current = null;
    }
  };

  const selectedDocsInfo = documents.filter((d) => selectedDocumentIds.includes(d.id));

  // Build document-aware context info & suggestions
  const contextInfo = React.useMemo(() => {
    if (selectedDocsInfo.length === 0) {
      return {
        title: 'Select a Contract to Begin',
        subtitle: 'Pick one or more contracts from the library to enable verified AI research.',
        badge: null,
        suggestions: [
          'What are the key liability caps across uploaded contracts?',
          'Which contract has the strictest indemnification clause?',
          'Summarize the primary obligations in these agreements.',
          'What are the standard termination notice periods?',
        ],
      };
    }

    if (selectedDocsInfo.length > 1) {
      const names = selectedDocsInfo.map((d) => d.filename);
      const namesPreview =
        names.length <= 2 ? names.join(' & ') : `${names[0]}, ${names[1]} +${names.length - 2} more`;

      return {
        title: `Cross-Document Analysis (${selectedDocsInfo.length} Contracts)`,
        subtitle: `Querying across ${namesPreview}. Ask comparative questions or contrast clauses across these agreements.`,
        badge: `${selectedDocsInfo.length} Contracts Active`,
        suggestions: [
          'Compare the limitation of liability caps between both contracts',
          'Which contract has more favorable termination terms?',
          'Are there conflicting governing law or jurisdiction clauses?',
          'Compare the indemnification obligations across both contracts',
        ],
      };
    }

    const doc = selectedDocsInfo[0];
    const lowerName = doc.filename.toLowerCase();

    // NDA / Confidentiality detection
    if (lowerName.includes('nda') || lowerName.includes('confidential') || lowerName.includes('disclosure')) {
      return {
        title: `Ask About ${doc.filename}`,
        subtitle: 'Every answer is researched directly from this NDA and verified with exact citations.',
        badge: doc.filename,
        suggestions: [
          'What is the duration of the confidentiality obligations?',
          'What constitutes Confidential Information in this agreement?',
          'What are the standard exclusions from confidentiality?',
          'What are the return or destruction requirements upon termination?',
        ],
      };
    }

    // Employment / Consulting / Contractor detection
    if (
      lowerName.includes('employ') ||
      lowerName.includes('consult') ||
      lowerName.includes('contractor') ||
      lowerName.includes('offer') ||
      lowerName.includes('severance')
    ) {
      return {
        title: `Ask About ${doc.filename}`,
        subtitle: 'Every answer is researched directly from this employment/services agreement and verified with exact citations.',
        badge: doc.filename,
        suggestions: [
          'What are the termination conditions and notice periods?',
          'Is there a non-compete or non-solicitation clause?',
          'What are the compensation and payment terms?',
          'Who owns the intellectual property and work product created?',
        ],
      };
    }

    // SaaS / Software / Vendor / License detection
    if (
      lowerName.includes('saas') ||
      lowerName.includes('software') ||
      lowerName.includes('license') ||
      lowerName.includes('cloud') ||
      lowerName.includes('vendor') ||
      lowerName.includes('subscription')
    ) {
      return {
        title: `Ask About ${doc.filename}`,
        subtitle: 'Every answer is researched directly from this software agreement and verified with exact citations.',
        badge: doc.filename,
        suggestions: [
          'What is the limitation of liability cap and exclusions?',
          'What are the service level commitments and warranties?',
          'What data security and privacy obligations exist?',
          'What are the renewal and price increase terms?',
        ],
      };
    }

    // Lease / Real Estate
    if (lowerName.includes('lease') || lowerName.includes('rent') || lowerName.includes('tenant')) {
      return {
        title: `Ask About ${doc.filename}`,
        subtitle: 'Every answer is researched directly from this lease agreement and verified with exact citations.',
        badge: doc.filename,
        suggestions: [
          'What is the term duration and renewal notice period?',
          'What are the maintenance and repair obligations?',
          'What are the deposit and default remedies?',
          'What are the subleasing and assignment restrictions?',
        ],
      };
    }

    // General Commercial Contract
    return {
      title: `Ask About ${doc.filename}`,
      subtitle: 'Every answer will be researched using autonomous agent tools and verified with exact quotes from the source text.',
      badge: doc.filename,
      suggestions: [
        'What is the limitation of liability cap?',
        'Under what conditions can either party terminate?',
        'What law and jurisdiction governs this agreement?',
        'Is there an indemnification provision?',
      ],
    };
  }, [selectedDocsInfo]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Contract Intelligence Chat
          </h2>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-slate-500">
          <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 font-mono shadow-xs text-slate-600">
            {selectedDocsInfo.length} {selectedDocsInfo.length === 1 ? 'doc' : 'docs'} active
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 relative"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>

            {contextInfo.badge && (
              <div className="mb-2 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600 max-w-xs truncate shadow-2xs">
                <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
                <span className="truncate">{contextInfo.badge}</span>
              </div>
            )}

            <h3 className="text-sm font-semibold text-slate-900 max-w-md">
              {contextInfo.title}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              {contextInfo.subtitle}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
              {contextInfo.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="text-[11px] bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg shadow-xs transition"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} onQuoteClick={onQuoteClick} />
        ))}

        {/* Live Status indicator */}
        {isStreaming && currentStatus && (
          <div className="flex items-center space-x-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg w-fit animate-pulse font-medium">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>{currentStatus}</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={selectedDocumentIds.length === 0}
            placeholder={
              selectedDocumentIds.length === 0
                ? 'Select a document from library to begin...'
                : 'Ask a question (e.g. "What are the liability limits?")...'
            }
            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none pr-24 transition"
          />

          <div className="absolute right-2 flex items-center space-x-1.5">
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium shadow transition"
                title="Stop Generating"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || selectedDocumentIds.length === 0}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white p-2 rounded-lg shadow transition"
                title="Send Question"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
