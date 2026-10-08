'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HighlightTarget } from './types';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  documentId: string;
  filename: string;
  activeHighlight: HighlightTarget | null;
}

export function PDFViewer({ documentId, filename, activeHighlight }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<any>(null);
  const canvasRefs = useRef<{ [page: number]: HTMLCanvasElement | null }>({});
  const pageContainerRefs = useRef<{ [page: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);

      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        // Configure worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const response = await fetch(`/api/documents/${documentId}/file`);
        if (!response.ok) {
          throw new Error(`Failed to load PDF file: ${response.statusText}`);
        }
        const data = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
        const doc = await loadingTask.promise;

        if (!isCancelled) {
          pdfDocRef.current = doc;
          setNumPages(doc.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('PDF render error:', err);
          setError(err.message || 'Error rendering PDF document');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [documentId]);

  // Render active pages on canvas
  useEffect(() => {
    if (!pdfDocRef.current || loading) return;

    async function renderPage(pageNum: number) {
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;

      try {
        const page = await pdfDocRef.current.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (e) {
        console.error(`Page ${pageNum} render error:`, e);
      }
    }

    // Render current page and surrounding pages
    const pagesToRender = [currentPage - 1, currentPage, currentPage + 1].filter(
      (p) => p >= 1 && p <= numPages
    );

    pagesToRender.forEach((p) => renderPage(p));
  }, [currentPage, scale, numPages, loading]);

  // Handle Citation Jump & Highlight
  useEffect(() => {
    if (!activeHighlight) return;

    const targetPage = activeHighlight.pageNumber || 1;
    setCurrentPage(targetPage);

    // Smooth scroll to target page container
    setTimeout(() => {
      const pageEl = pageContainerRefs.current[targetPage];
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
  }, [activeHighlight]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-400 truncate max-w-[200px]">
            {filename}
          </span>
          <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
            PDF
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Pagination */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center space-x-1 bg-slate-800/60 p-0.5 rounded border border-slate-700/50">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] px-1 font-mono">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={`/api/documents/${documentId}/file`}
            download={filename}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main PDF Scrollable Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col items-center space-y-6 bg-slate-950/40 relative"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Rendering PDF pages...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-lg text-xs my-8">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="w-full flex flex-col items-center space-y-6">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
              const isHighlightPage = activeHighlight?.pageNumber === pageNum;

              return (
                <div
                  key={pageNum}
                  ref={(el) => {
                    pageContainerRefs.current[pageNum] = el;
                  }}
                  className={`relative bg-white rounded-lg shadow-2xl transition-all duration-300 ${
                    isHighlightPage ? 'ring-4 ring-amber-400/80' : 'ring-1 ring-slate-800'
                  }`}
                  style={{
                    display: Math.abs(pageNum - currentPage) <= 2 ? 'block' : 'none',
                  }}
                >
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[pageNum] = el;
                    }}
                    className="block rounded-lg"
                  />

                  {/* Highlight Banner on matching page */}
                  {isHighlightPage && (
                    <div className="absolute top-2 left-2 right-2 bg-amber-500/90 text-slate-950 font-semibold px-3 py-1.5 rounded shadow-lg text-xs flex items-center justify-between animate-pulse">
                      <span className="truncate">
                        Citation Match: &ldquo;{activeHighlight.quoteText?.slice(0, 70)}...&rdquo;
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-black/20 px-1.5 py-0.5 rounded">
                        Page {pageNum}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2 right-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur">
                    Page {pageNum} of {numPages}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
