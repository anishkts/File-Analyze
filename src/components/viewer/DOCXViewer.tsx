'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HighlightTarget } from './types';
import { Download, ZoomIn, ZoomOut, FileText } from 'lucide-react';

interface DOCXViewerProps {
  documentId: string;
  filename: string;
  htmlContent?: string | null;
  rawText?: string;
  activeHighlight: HighlightTarget | null;
}

export function DOCXViewer({
  documentId,
  filename,
  htmlContent,
  rawText,
  activeHighlight,
}: DOCXViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(14);

  // Apply highlight into rendered content when activeHighlight updates
  useEffect(() => {
    if (!containerRef.current || !activeHighlight?.quoteText) return;

    const container = containerRef.current;
    // Remove previous marks
    const marks = container.querySelectorAll('mark.citation-mark');
    marks.forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent || ''), m);
        parent.normalize();
      }
    });

    const target = activeHighlight.quoteText.trim();
    if (!target) return;

    // Search and highlight text node
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null;
    let found = false;

    // Tokenized search for robust matching
    const searchWords = target
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent || '';
      const lower = text.toLowerCase();

      // Check if this text node contains the search phrase
      if (searchWords.length > 0 && searchWords.every((w) => lower.includes(w))) {
        const span = document.createElement('mark');
        span.className = 'citation-mark citation-highlight-active text-slate-950 font-semibold';
        span.textContent = text;
        if (currentNode.parentNode) {
          currentNode.parentNode.replaceChild(span, currentNode);
          span.scrollIntoView({ behavior: 'smooth', block: 'center' });
          found = true;
          break;
        }
      }
    }
  }, [activeHighlight]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-700">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
            {filename}
          </span>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-medium">
            DOCX
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Font Resizer */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              className="p-1 hover:bg-white rounded text-slate-700 transition"
              title="Smaller font"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] px-1 font-mono text-slate-600">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              className="p-1 hover:bg-white rounded text-slate-700 transition"
              title="Larger font"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={`/api/documents/${documentId}/file`}
            download={filename}
            className="p-1.5 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition"
            title="Download DOCX"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main DOCX Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-100/60">
        <div
          ref={containerRef}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-slate-800 prose prose-slate prose-headings:text-slate-900 prose-headings:font-bold prose-p:my-3 prose-table:border-collapse prose-td:border prose-td:border-slate-200 prose-td:p-2"
        >
          {htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-slate-800">
              {rawText || 'No text content available.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
