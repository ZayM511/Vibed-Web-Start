import React, { useState } from 'react';
import { usePro } from '@/hooks/usePro';
import { hybridStorage } from '@/src/storage/hybridStorage';
import { cn } from '@/lib/utils';

export function SettingsTab() {
  const { isPro, tier, expiresAt, refreshStatus } = usePro();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSyncFromCloud = async () => {
    setSyncing(true);
    setSyncStatus('idle');
    try {
      await hybridStorage.syncFromCloud();
      setSyncStatus('success');

      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED' });
        }
      });
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    await hybridStorage.clearCache();
    await refreshStatus();
    alert('Cache cleared!');
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: 'https://jobfiltr.com/dashboard' });
  };

  const handleUpgrade = () => {
    chrome.tabs.create({ url: 'https://jobfiltr.com/pricing' });
  };

  const handleSupport = () => {
    chrome.tabs.create({ url: 'https://jobfiltr.com/support' });
  };

  return (
    <div className="space-y-4">
      {/* Account Status */}
      <div className={cn(
        'rounded-lg p-3 border',
        isPro ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-900">Account Status</span>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-medium',
            isPro ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-700'
          )}>
            {tier.toUpperCase()}
          </span>
        </div>
        {isPro && expiresAt && (
          <p className="text-[10px] text-gray-500">
            Renews: {new Date(expiresAt).toLocaleDateString()}
          </p>
        )}
        {!isPro && (
          <button
            onClick={handleUpgrade}
            className="mt-2 w-full py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      {/* Sync Options */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700">Data Sync</h4>
        <button
          onClick={handleSyncFromCloud}
          disabled={syncing}
          className={cn(
            'w-full py-2 text-xs font-medium rounded-lg border transition-colors',
            syncing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
          )}
        >
          {syncing ? 'Syncing...' : 'Sync from Cloud'}
        </button>
        {syncStatus === 'success' && (
          <p className="text-[10px] text-green-600">Settings synced successfully!</p>
        )}
        {syncStatus === 'error' && (
          <p className="text-[10px] text-red-600">Sync failed. Please try again.</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2 pt-3 border-t">
        <h4 className="text-xs font-medium text-gray-700">Quick Actions</h4>
        <div className="space-y-1.5">
          <button
            onClick={handleOpenDashboard}
            className="w-full py-2 text-xs text-left px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <span>📊</span>
            <span>Open Dashboard</span>
          </button>
          <button
            onClick={handleClearCache}
            className="w-full py-2 text-xs text-left px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Clear Cache</span>
          </button>
          <button
            onClick={handleSupport}
            className="w-full py-2 text-xs text-left px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <span>❓</span>
            <span>Help & Support</span>
          </button>
        </div>
      </div>

      {/* Extension Info */}
      <div className="pt-3 border-t text-center">
        <p className="text-[10px] text-gray-400">JobFiltr Extension v1.0.0</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Made with ❤️ for job seekers
        </p>
      </div>
    </div>
  );
}
