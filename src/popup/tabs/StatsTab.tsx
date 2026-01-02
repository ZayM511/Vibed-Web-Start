import React, { useState, useEffect } from 'react';
import { usePro } from '@/hooks/usePro';

interface Stats {
  totalScanned: number;
  totalFiltered: number;
  ghostJobsFiltered: number;
  staffingFiltered: number;
  remoteIssuesFiltered: number;
  includeKeywordMisses: number;
  excludeKeywordMatches: number;
  companiesBlocked: number;
}

export function StatsTab() {
  const { isPro, getRemainingAnalyses } = usePro();
  const [stats, setStats] = useState<Stats | null>(null);
  const [analysesRemaining, setAnalysesRemaining] = useState<number | 'unlimited'>(30);

  useEffect(() => {
    // Get stats from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (response) => {
          if (response?.stats) {
            setStats(response.stats);
          }
        });
      }
    });

    // Get analysis usage
    const fetchAnalyses = async () => {
      const remaining = await getRemainingAnalyses();
      setAnalysesRemaining(isPro ? 'unlimited' : remaining);
    };
    fetchAnalyses();
  }, [isPro, getRemainingAnalyses]);

  const timeSaved = stats ? Math.round((stats.totalFiltered * 30) / 60) : 0; // 30 sec per bad job

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-3">
        <div className="text-2xl font-bold text-blue-700">
          {stats?.totalFiltered || 0}
        </div>
        <div className="text-xs text-blue-600">Jobs filtered today</div>
        <div className="text-[10px] text-blue-500 mt-1">~{timeSaved} min saved</div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700">Filter Breakdown</h4>
        <div className="space-y-1.5">
          {[
            { label: 'Ghost jobs', value: stats?.ghostJobsFiltered || 0, color: 'bg-purple-500' },
            { label: 'Staffing agencies', value: stats?.staffingFiltered || 0, color: 'bg-orange-500' },
            { label: 'Remote issues', value: stats?.remoteIssuesFiltered || 0, color: 'bg-cyan-500' },
            { label: 'Include misses', value: stats?.includeKeywordMisses || 0, color: 'bg-emerald-500' },
            { label: 'Exclude matches', value: stats?.excludeKeywordMatches || 0, color: 'bg-red-500' },
            { label: 'Companies blocked', value: stats?.companiesBlocked || 0, color: 'bg-gray-500' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-600 flex-1">{item.label}</span>
              <span className="text-xs font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Usage */}
      <div className="pt-3 border-t">
        <h4 className="text-xs font-medium text-gray-700 mb-1">Job Analysis</h4>
        <div className="text-xs text-gray-600">
          {analysesRemaining === 'unlimited'
            ? '✨ Unlimited analyses (Pro)'
            : `${analysesRemaining}/30 analyses remaining this month`}
        </div>
        {analysesRemaining !== 'unlimited' && (
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${(Number(analysesRemaining) / 30) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Scanned Jobs */}
      <div className="pt-3 border-t">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Total jobs scanned</span>
          <span className="font-medium">{stats?.totalScanned || 0}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-600">Filter rate</span>
          <span className="font-medium">
            {stats && stats.totalScanned > 0
              ? `${Math.round((stats.totalFiltered / stats.totalScanned) * 100)}%`
              : '0%'}
          </span>
        </div>
      </div>
    </div>
  );
}
