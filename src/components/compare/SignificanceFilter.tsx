'use client';

import React from 'react';
import { SignificanceLevel } from '@/lib/comparison/types';

interface SignificanceFilterProps {
  currentFilter: 'all' | SignificanceLevel;
  onChange: (filter: 'all' | SignificanceLevel) => void;
  counts: {
    all: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function SignificanceFilter({
  currentFilter,
  onChange,
  counts,
}: SignificanceFilterProps) {
  const options: Array<{ id: 'all' | SignificanceLevel; label: string; count: number; color: string }> = [
    { id: 'all', label: 'All Changes', count: counts.all, color: 'text-slate-300' },
    { id: 'high', label: 'High Significance', count: counts.high, color: 'text-rose-400' },
    { id: 'medium', label: 'Medium Significance', count: counts.medium, color: 'text-amber-400' },
    { id: 'low', label: 'Low / Stylistic', count: counts.low, color: 'text-blue-400' },
  ];

  return (
    <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
      {options.map((opt) => {
        const isActive = currentFilter === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isActive
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <span className={opt.color}>{opt.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-slate-700 text-white' : 'bg-slate-800/80 text-slate-400'
              }`}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
