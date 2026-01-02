import React from 'react';
import { cn } from '@/lib/utils';

interface KeywordChipProps {
  keyword: string;
  type: 'include' | 'exclude';
  onRemove: () => void;
}

export function KeywordChip({ keyword, type, onRemove }: KeywordChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
        type === 'include'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-red-100 text-red-700'
      )}
    >
      {keyword}
      <button
        onClick={onRemove}
        className={cn(
          'ml-0.5 hover:opacity-70 transition-opacity',
          type === 'include' ? 'text-emerald-600' : 'text-red-600'
        )}
        aria-label={`Remove ${keyword}`}
      >
        ×
      </button>
    </span>
  );
}
