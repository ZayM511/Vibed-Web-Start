import React from 'react';
import { cn } from '@/lib/utils';

interface FilterToggleProps {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function FilterToggle({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled = false
}: FilterToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        checked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          <div className="text-[10px] text-gray-500">{description}</div>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-300',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}
