'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, CheckCircle, Loader2, FileUp } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'extracting' | 'indexing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const lower = selected.name.toLowerCase();

      if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
        setErrorMessage(`Invalid file format: "${selected.name}". Please upload a PDF (.pdf) or Word document (.docx).`);
        setFile(null);
        return;
      }

      setFile(selected);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStage('uploading');
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate extraction stage transition
      setTimeout(() => setStage('extracting'), 600);
      setTimeout(() => setStage('indexing'), 1400);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStage('error');
        setErrorMessage(data.error || 'Failed to process document');
        return;
      }

      setStage('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        setStage('idle');
        setFile(null);
      }, 1000);
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err.message || 'Network upload error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Upload Legal Contract</h3>
            <p className="text-xs text-slate-400">PDF (.pdf) or Word (.docx) documents accepted</p>
          </div>
        </div>

        {/* Drag and Drop Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            file
              ? 'border-blue-500/60 bg-blue-500/5'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />

          <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
          {file ? (
            <div>
              <p className="text-xs font-semibold text-slate-200">{file.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-slate-300">
                Click to browse or drag and drop contract
              </p>
              <p className="text-[11px] text-slate-500 mt-1">PDF and DOCX up to 150+ pages</p>
            </div>
          )}
        </div>

        {/* Status / Error display */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {stage !== 'idle' && stage !== 'error' && (
          <div className="mt-4 p-3 bg-slate-950 border border-slate-850 rounded-xl">
            <div className="flex items-center space-x-2 text-xs text-blue-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {stage === 'uploading' && 'Uploading document buffer...'}
                {stage === 'extracting' && 'Extracting text and checking for scanned pages...'}
                {stage === 'indexing' && 'Indexing clauses and building FTS search index...'}
                {stage === 'success' && 'Processing complete! Ready for analysis.'}
              </span>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="mt-6 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || (stage !== 'idle' && stage !== 'error')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl shadow transition"
          >
            Process Contract
          </button>
        </div>
      </div>
    </div>
  );
}
