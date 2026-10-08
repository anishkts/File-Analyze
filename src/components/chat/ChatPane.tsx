'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatPaneProps, MessageItem, ChatQuote, ResearchStep } from './types';
import { ChatMessage } from './ChatMessage';
import { Send, Square, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

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

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Contract Intelligence Chat
          </h2>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <span className="text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 font-mono">
            {selectedDocsInfo.length} {selectedDocsInfo.length === 1 ? 'doc' : 'docs'} active
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-950/40 relative"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
            <Sparkles className="w-10 h-10 mb-3 text-blue-500/70" />
            <h3 className="text-sm font-semibold text-slate-300">Ask Anything About Your Contracts</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Every answer will be researched using autonomous agent tools and verified with exact
              quotes from the source text.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
              {[
                'What is the limitation of liability cap?',
                'Under what conditions can either party terminate?',
                'What law and jurisdiction governs this agreement?',
                'Is there an indemnification provision?',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="text-[11px] bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg transition"
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
          <div className="flex items-center space-x-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg w-fit animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>{currentStatus}</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800">
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
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 outline-none pr-24 transition"
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
