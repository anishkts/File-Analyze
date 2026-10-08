'use client';

import React, { useState } from 'react';
import { UploadModal } from './UploadModal';
import { FileText, Trash2, Plus, CheckSquare, Square, Eye, Calendar, Layers } from 'lucide-react';

export interface DocumentItem {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx';
  fileSize: number;
  pageCount: number;
  isScanned?: number;
  createdAt?: string;
}

interface DocumentLibraryProps {
  documents: DocumentItem[];
  selectedDocumentIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenDocument: (id: string) => void;
  onRefresh: () => void;
}

export function DocumentLibrary({
  documents,
  selectedDocumentIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onOpenDocument,
  onRefresh,
}: DocumentLibraryProps) {
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this contract?')) return;

    setDeletingId(id);
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Contract Library</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your uploaded contracts. Select multiple contracts to enable cross-document Q&A.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {documents.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={onSelectAll}
                className="px-2.5 py-1 hover:bg-slate-800 rounded text-slate-300 transition"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearSelection}
                className="px-2.5 py-1 hover:bg-slate-800 rounded text-slate-400 transition"
              >
                Clear
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Contract</span>
          </button>
        </div>
      </div>

      {/* Selected Indicator */}
      {selectedDocumentIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
          <span>
            <strong>{selectedDocumentIds.length}</strong> contract
            {selectedDocumentIds.length > 1 ? 's' : ''} selected for cross-document query
          </span>
          <span className="text-[11px] text-blue-400/80 font-mono">Multi-Doc Mode Active</span>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-2.5">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 text-center">
            <FileText className="w-12 h-12 mb-3 stroke-[1.5] text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-400">Library is Empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Upload PDF or DOCX contracts to begin analyzing clauses and asking verified questions.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = selectedDocumentIds.includes(doc.id);

            return (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc.id)}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-slate-850/90 border-blue-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(doc.id);
                    }}
                    className="text-slate-400 hover:text-blue-400 transition"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-200 truncate">
                        {doc.filename}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.2 rounded border ${
                          doc.fileType === 'pdf'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {doc.fileType}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                      <span>{doc.pageCount} pages</span>
                      <span>•</span>
                      <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      {doc.createdAt && (
                        <>
                          <span>•</span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right action buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDocument(doc.id);
                    }}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs flex items-center space-x-1 transition"
                    title="View Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(doc.id, e)}
                    disabled={deletingId === doc.id}
                    className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg text-xs transition"
                    title="Delete Contract"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
}
