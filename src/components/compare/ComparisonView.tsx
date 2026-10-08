'use client';

import React, { useState } from 'react';
import { ComparisonReport, SignificanceLevel } from '@/lib/comparison/types';
import { SignificanceFilter } from './SignificanceFilter';
import { ClauseDiffCard } from './ClauseDiffCard';
import { GitCompare, Loader2, FileText, ArrowRight, ShieldAlert } from 'lucide-react';

interface ComparisonViewProps {
  documents: Array<{ id: string; filename: string }>;
}

export function ComparisonView({ documents }: ComparisonViewProps) {
  const [docAId, setDocAId] = useState<string>(documents[0]?.id || '');
  const [docBId, setDocBId] = useState<string>(documents[1]?.id || documents[0]?.id || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [filter, setFilter] = useState<'all' | SignificanceLevel>('all');
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!docAId || !docBId) return;
    if (docAId === docBId) {
      setError('Please select two distinct contracts to compare.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentAId: docAId, documentBId: docBId }),
      });

      if (!response.ok) {
        throw new Error(`Comparison failed: ${response.statusText}`);
      }

      const data: ComparisonReport = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error executing comparison');
    } finally {
      setLoading(false);
    }
  };

  const filteredDiffs = (report?.diffs || []).filter((d) => {
    if (filter === 'all') return true;
    return d.significance?.level === filter;
  });

  const counts = {
    all: report?.diffs.length || 0,
    high: (report?.diffs || []).filter((d) => d.significance?.level === 'high').length,
    medium: (report?.diffs || []).filter((d) => d.significance?.level === 'medium').length,
    low: (report?.diffs || []).filter((d) => d.significance?.level === 'low').length,
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-6 space-y-6">
      {/* Header and Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 mb-1">
            <GitCompare className="w-5 h-5" />
            <h2 className="text-base font-semibold text-slate-100">
              Contract Version Comparison
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Compare two versions of a contract at clause level with substantive AI significance analysis.
          </p>
        </div>

        {/* Contract Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <select
              value={docAId}
              onChange={(e) => setDocAId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none max-w-[160px] truncate"
            >
              <option value="" disabled>Select Version A</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                  {d.filename}
                </option>
              ))}
            </select>

            <ArrowRight className="w-4 h-4 text-slate-500" />

            <select
              value={docBId}
              onChange={(e) => setDocBId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none max-w-[160px] truncate"
            >
              <option value="" disabled>Select Version B</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                  {d.filename}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCompare}
            disabled={loading || !docAId || !docBId}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
            <span>Compare Versions</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Report Summary */}
      {report && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Executive Diff Summary
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {report.summary}
            </p>

            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-850 text-xs">
              <span className="text-slate-400">
                Total clauses: <strong className="text-slate-200">{report.stats.totalClauses}</strong>
              </span>
              <span className="text-amber-400">
                Modified: <strong>{report.stats.modifiedCount}</strong>
              </span>
              <span className="text-emerald-400">
                Added: <strong>{report.stats.addedCount}</strong>
              </span>
              <span className="text-rose-400">
                Deleted: <strong>{report.stats.deletedCount}</strong>
              </span>
              <span className="text-rose-400 font-semibold flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>High significance: {report.stats.highSignificanceCount}</span>
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <SignificanceFilter
              currentFilter={filter}
              onChange={setFilter}
              counts={counts}
            />
            <span className="text-xs text-slate-500">
              Showing {filteredDiffs.length} of {report.diffs.length} clauses
            </span>
          </div>

          {/* Diff Cards List */}
          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
            {filteredDiffs.map((d) => (
              <ClauseDiffCard key={d.id} diff={d} />
            ))}
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 text-center">
          <FileText className="w-12 h-12 mb-3 stroke-[1.5] text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-400">No Comparison Generated Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Select two uploaded contract versions above and click &ldquo;Compare Versions&rdquo; to analyze clause-level differences and their substantive legal impact.
          </p>
        </div>
      )}
    </div>
  );
}
