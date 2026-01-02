import React, { useState, useEffect } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { FiltersTab } from './tabs/FiltersTab';
import { KeywordsTab } from './tabs/KeywordsTab';
import { BlocklistTab } from './tabs/BlocklistTab';
import { StatsTab } from './tabs/StatsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { AuthButton } from './components/AuthButton';
import { usePro } from '@/hooks/usePro';

type Tab = 'filters' | 'keywords' | 'blocklist' | 'stats' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('filters');
  const [platform, setPlatform] = useState<string | null>(null);
  const [filterCount, setFilterCount] = useState(0);
  const { isPro } = usePro();

  useEffect(() => {
    // Get current platform from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (response) => {
          if (response?.stats) {
            setFilterCount(response.stats.totalFiltered || 0);
          }
        });
      }
      const url = tabs[0]?.url || '';
      if (url.includes('linkedin.com')) setPlatform('LinkedIn');
      else if (url.includes('indeed.com')) setPlatform('Indeed');
      else setPlatform(null);
    });
  }, []);

  return (
    <div className="w-[360px] min-h-[480px] bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="text-white font-semibold">JobFiltr</span>
            {isPro && (
              <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                PRO
              </span>
            )}
          </div>
          <AuthButton />
        </div>
        <div className="mt-2 flex items-center justify-between text-blue-100 text-xs">
          <span>{platform ? `Active on ${platform}` : 'Not on job site'}</span>
          <span>{filterCount > 0 ? `${filterCount} jobs filtered` : ''}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'filters' && <FiltersTab />}
        {activeTab === 'keywords' && <KeywordsTab />}
        {activeTab === 'blocklist' && <BlocklistTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
