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
    { id: 'all', label: 'All Changes', count: counts.all, color: 'text-slate-700' },
    { id: 'high', label: 'High Significance', count: counts.high, color: 'text-rose-600' },
    { id: 'medium', label: 'Medium Significance', count: counts.medium, color: 'text-amber-600' },
    { id: 'low', label: 'Low / Stylistic', count: counts.low, color: 'text-blue-600' },
  ];

  return (
    <div className="flex items-center space-x-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl">
      {options.map((opt) => {
        const isActive = currentFilter === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span className={opt.color}>{opt.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-600'
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
