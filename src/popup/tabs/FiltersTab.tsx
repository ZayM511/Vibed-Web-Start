import React, { useState, useEffect } from 'react';
import { hybridStorage } from '@/src/storage/hybridStorage';
import { FilterToggle } from '../components/FilterToggle';
import { cn } from '@/lib/utils';

export function FiltersTab() {
  const [settings, setSettings] = useState({
    hideGhostJobs: true,
    hideStaffingFirms: true,
    verifyTrueRemote: false,
    ghostJobDaysThreshold: 30 as 30 | 60 | 90,
    datePosted: 'any' as 'any' | 'day' | 'week' | 'month'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hybridStorage.getSettings().then(s => {
      setSettings({
        hideGhostJobs: s.hideGhostJobs,
        hideStaffingFirms: s.hideStaffingFirms,
        verifyTrueRemote: s.verifyTrueRemote,
        ghostJobDaysThreshold: s.ghostJobDaysThreshold,
        datePosted: s.datePosted
      });
      setLoading(false);
    });
  }, []);

  const updateSetting = async <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await hybridStorage.updateSettings({ [key]: value });

    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED' });
      }
    });
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <FilterToggle
          icon="👻"
          label="Hide Ghost Jobs"
          description="Filter jobs posted 30+ days ago"
          checked={settings.hideGhostJobs}
          onChange={v => updateSetting('hideGhostJobs', v)}
        />
        <FilterToggle
          icon="🏢"
          label="Hide Staffing Agencies"
          description="Block known staffing firms"
          checked={settings.hideStaffingFirms}
          onChange={v => updateSetting('hideStaffingFirms', v)}
        />
        <FilterToggle
          icon="🏠"
          label="Verify True Remote"
          description="Flag hybrid bait-and-switch"
          checked={settings.verifyTrueRemote}
          onChange={v => updateSetting('verifyTrueRemote', v)}
        />
      </div>

      {/* Ghost Job Threshold */}
      <div className="pt-3 border-t">
        <label className="text-xs font-medium text-gray-700 block mb-2">
          Ghost Job Threshold
        </label>
        <div className="flex gap-2">
          {([30, 60, 90] as const).map(days => (
            <button
              key={days}
              onClick={() => updateSetting('ghostJobDaysThreshold', days)}
              className={cn(
                'flex-1 py-1.5 text-xs rounded transition-colors',
                settings.ghostJobDaysThreshold === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Date Posted Filter */}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-2">
          Date Posted
        </label>
        <select
          value={settings.datePosted}
          onChange={e => updateSetting('datePosted', e.target.value as 'any' | 'day' | 'week' | 'month')}
          className="w-full p-2 text-xs border rounded-lg bg-white"
        >
          <option value="any">Any time</option>
          <option value="day">Past 24 hours</option>
          <option value="week">Past week</option>
          <option value="month">Past month</option>
        </select>
      </div>
    </div>
  );
}
