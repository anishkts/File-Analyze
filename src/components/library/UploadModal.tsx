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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Upload Legal Contract</h3>
            <p className="text-xs text-slate-500">PDF (.pdf) or Word (.docx) documents accepted</p>
          </div>
        </div>

        {/* Drag and Drop Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            file
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />

          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          {file ? (
            <div>
              <p className="text-xs font-semibold text-slate-800">{file.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-slate-700">
                Click to browse or drag and drop contract
              </p>
              <p className="text-[11px] text-slate-400 mt-1">PDF and DOCX up to 150+ pages</p>
            </div>
          )}
        </div>

        {/* Status / Error display */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {stage !== 'idle' && stage !== 'error' && (
          <div className="mt-4 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex items-center space-x-2 text-xs text-blue-700 font-medium">
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
            className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
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
