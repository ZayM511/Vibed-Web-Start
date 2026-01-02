import React from 'react';
import { cn } from '@/lib/utils';

type Tab = 'filters' | 'keywords' | 'blocklist' | 'stats' | 'settings';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'filters', label: 'Filters', icon: '🔍' },
  { id: 'keywords', label: 'Keywords', icon: '🏷️' },
  { id: 'blocklist', label: 'Blocklist', icon: '🚫' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

export function TabNavigation({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex border-b bg-gray-50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <span className="block">{tab.icon}</span>
          <span className="block mt-0.5">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
