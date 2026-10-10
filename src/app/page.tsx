'use client';

import React, { useState, useEffect } from 'react';
import { DocumentLibrary, DocumentItem } from '@/components/library/DocumentLibrary';
import { ChatPane } from '@/components/chat/ChatPane';
import { DocumentViewer } from '@/components/viewer/DocumentViewer';
import { ComparisonView } from '@/components/compare/ComparisonView';
import { HighlightTarget } from '@/components/viewer/types';
import { ChatQuote } from '@/components/chat/types';
import {
  ShieldCheck,
  Scale,
  GitCompare,
  Layers,
  MessageSquare,
  FileText,
  Upload,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'compare' | 'library'>('workspace');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeViewerDocId, setActiveViewerDocId] = useState<string | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<HighlightTarget | null>(null);

  const updateSelectedDocIds = (newIds: string[] | ((prev: string[]) => string[])) => {
    setSelectedDocIds((prev) => {
      const resolved = typeof newIds === 'function' ? newIds(prev) : newIds;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lexquery_selected_doc_ids', JSON.stringify(resolved));
        } catch (e) {}
      }
      return resolved;
    });
  };

  const updateActiveViewerDocId = (newId: string | null | ((prev: string | null) => string | null)) => {
    setActiveViewerDocId((prev) => {
      const resolved = typeof newId === 'function' ? newId(prev) : newId;
      if (typeof window !== 'undefined' && resolved) {
        try {
          localStorage.setItem('lexquery_active_doc_id', resolved);
        } catch (e) {}
      }
      return resolved;
    });
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        setDocuments(docs);

        // Restore saved selections or default
        if (docs.length > 0) {
          const docIdSet = new Set(docs.map((d: any) => d.id));

          let savedSelected: string[] = [];
          let savedActive: string | null = null;
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('lexquery_selected_doc_ids');
              if (raw) savedSelected = JSON.parse(raw);
              savedActive = localStorage.getItem('lexquery_active_doc_id');
            } catch (e) {}
          }

          const validSelected = savedSelected.filter((id) => docIdSet.has(id));

          setSelectedDocIds((prev) => {
            if (prev.length > 0) return prev;
            if (validSelected.length > 0) return validSelected;
            return [docs[0].id];
          });

          setActiveViewerDocId((prev) => {
            if (prev && docIdSet.has(prev)) return prev;
            if (savedActive && docIdSet.has(savedActive)) return savedActive;
            if (validSelected.length > 0) return validSelected[0];
            return docs[0].id;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleToggleSelect = (id: string) => {
    updateSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    updateSelectedDocIds(documents.map((d) => d.id));
  };

  const handleClearSelection = () => {
    updateSelectedDocIds([]);
  };

  const handleOpenDocument = (id: string) => {
    updateActiveViewerDocId(id);
    updateSelectedDocIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveTab('workspace');
  };

  const handleQuoteClick = (quote: ChatQuote) => {
    if (quote.docId) {
      updateActiveViewerDocId(quote.docId);
    }
    setActiveHighlight({
      documentId: quote.docId,
      pageNumber: quote.pageNumber || 1,
      startChar: quote.startChar,
      endChar: quote.endChar,
      quoteText: quote.matchedText || quote.quote,
    });
    setActiveTab('workspace');
  };

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Top Header & Navigation */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 backdrop-blur z-20 flex-shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900">LexQuery</h1>
              <span className="text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-full">
                Verified Quotes Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">AI Legal Contract Intelligence & Citation Engine</p>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'workspace'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Analyze & Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'compare'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Contracts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'library'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Document Library ({documents.length})</span>
          </button>
        </div>

        {/* Active Document Indicator */}
        <div className="flex items-center space-x-2 text-xs">
          {activeViewerDocId && (
            <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 max-w-xs truncate shadow-sm">
              <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="text-slate-700 truncate font-medium">
                {documents.find((d) => d.id === activeViewerDocId)?.filename || 'Active Contract'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex-1 overflow-hidden p-3 sm:p-4">
        {activeTab === 'workspace' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Left Column: Chat Console */}
            <div className="lg:col-span-5 h-full overflow-hidden">
              <ChatPane
                selectedDocumentIds={selectedDocIds}
                documents={documents}
                onQuoteClick={handleQuoteClick}
              />
            </div>

            {/* Right Column: High-Fidelity Document Viewer */}
            <div className="lg:col-span-7 h-full overflow-hidden">
              <DocumentViewer
                documentId={activeViewerDocId}
                activeHighlight={activeHighlight}
                onClearHighlight={() => setActiveHighlight(null)}
              />
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="h-full max-w-6xl mx-auto overflow-hidden">
            <ComparisonView documents={documents} />
          </div>
        )}

        {activeTab === 'library' && (
          <div className="h-full max-w-5xl mx-auto overflow-hidden">
            <DocumentLibrary
              documents={documents}
              selectedDocumentIds={selectedDocIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onOpenDocument={handleOpenDocument}
              onRefresh={fetchDocuments}
            />
          </div>
        )}
      </div>
    </main>
  );
}
