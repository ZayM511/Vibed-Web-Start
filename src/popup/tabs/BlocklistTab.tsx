import React, { useState, useEffect } from 'react';
import { usePro } from '@/hooks/usePro';
import { hybridStorage } from '@/src/storage/hybridStorage';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { cn } from '@/lib/utils';

interface BlocklistEntry {
  companyName: string;
  companyNameNormalized: string;
  category: string;
  source: 'community' | 'user';
  verified: boolean;
  submittedCount?: number;
}

export function BlocklistTab() {
  const { isPro } = usePro();
  const [communityBlocklist, setCommunityBlocklist] = useState<BlocklistEntry[]>([]);
  const [userBlocklist, setUserBlocklist] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'community' | 'personal'>('community');

  const userBlocklistLimit = isPro ? Infinity : 1;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [community, user] = await Promise.all([
          hybridStorage.getCommunityBlocklist(),
          hybridStorage.getExcludeCompanies()
        ]);
        setCommunityBlocklist(community);
        setUserBlocklist(user);
      } catch (e) {
        console.error('Failed to load blocklist:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddCompany = async () => {
    if (!companyInput.trim()) return;
    try {
      await hybridStorage.addExcludeCompany(companyInput.trim());
      const updated = await hybridStorage.getExcludeCompanies();
      setUserBlocklist(updated);
      setCompanyInput('');
      setError(null);

      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED' });
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add company');
    }
  };

  const handleRemoveCompany = async (company: string) => {
    try {
      await hybridStorage.removeExcludeCompany(company);
      const updated = await hybridStorage.getExcludeCompanies();
      setUserBlocklist(updated);

      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED' });
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove company');
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveView('community')}
          className={cn(
            'flex-1 py-1.5 text-xs font-medium rounded transition-colors',
            activeView === 'community'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Community ({communityBlocklist.length})
        </button>
        <button
          onClick={() => setActiveView('personal')}
          className={cn(
            'flex-1 py-1.5 text-xs font-medium rounded transition-colors',
            activeView === 'personal'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Personal ({userBlocklist.length})
        </button>
      </div>

      {activeView === 'community' ? (
        /* Community Blocklist */
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500">
            Verified companies flagged by the community
          </p>
          <div className="max-h-[280px] overflow-y-auto space-y-1.5">
            {communityBlocklist.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-xs">
                No community entries yet
              </div>
            ) : (
              communityBlocklist.map(entry => (
                <div
                  key={entry.companyNameNormalized}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-900">
                        {entry.companyName}
                      </span>
                      {entry.verified && (
                        <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded">
                          Verified
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">{entry.category}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {entry.submittedCount || 0} reports
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Personal Blocklist */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Your blocked companies</span>
            {!isPro && (
              <span className="text-[10px] text-gray-500">
                {userBlocklist.length}/{userBlocklistLimit}
              </span>
            )}
          </div>

          {/* Add Company Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={companyInput}
              onChange={e => setCompanyInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddCompany()}
              placeholder="Company name..."
              className="flex-1 px-2 py-1.5 text-xs border rounded-lg"
              disabled={!isPro && userBlocklist.length >= userBlocklistLimit}
            />
            <button
              onClick={handleAddCompany}
              disabled={!companyInput.trim()}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg disabled:opacity-50"
            >
              Block
            </button>
          </div>

          {/* User Blocklist */}
          <div className="space-y-1.5">
            {userBlocklist.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-xs">
                No companies blocked yet
              </div>
            ) : (
              userBlocklist.map(company => (
                <div
                  key={company}
                  className="flex items-center justify-between p-2 bg-red-50 rounded-lg"
                >
                  <span className="text-xs text-red-900">{company}</span>
                  <button
                    onClick={() => handleRemoveCompany(company)}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {!isPro && userBlocklist.length >= userBlocklistLimit && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-[10px] text-amber-700 mb-2">
                Free tier: 1 company block
              </p>
              <UpgradePrompt
                feature="blocklist"
                message="Block unlimited companies with Pro"
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
