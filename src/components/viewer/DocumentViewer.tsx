'use client';

import React, { useEffect, useState } from 'react';
import { HighlightTarget, DocumentViewerProps } from './types';
import { PDFViewer } from './PDFViewer';
import { DOCXViewer } from './DOCXViewer';
import { FileSearch, Loader2 } from 'lucide-react';

export function DocumentViewer({
  documentId,
  activeHighlight,
  onClearHighlight,
}: DocumentViewerProps) {
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setDocData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/documents/${documentId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load document metadata');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setDocData(data.document);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  if (!documentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 text-center text-slate-500">
        <FileSearch className="w-12 h-12 mb-3 stroke-[1.5] text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-400">No Document Selected</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select or upload a contract from the library to view its text and highlighted citations.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs text-slate-400">Loading document...</p>
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 text-center text-rose-400">
        <p className="text-sm font-medium">{error || 'Unable to open document'}</p>
      </div>
    );
  }

  if (docData.fileType === 'pdf') {
    return (
      <PDFViewer
        documentId={docData.id}
        filename={docData.filename}
        activeHighlight={activeHighlight}
      />
    );
  }

  return (
    <DOCXViewer
      documentId={docData.id}
      filename={docData.filename}
      htmlContent={docData.htmlContent}
      rawText={docData.extractedText}
      activeHighlight={activeHighlight}
    />
  );
}
