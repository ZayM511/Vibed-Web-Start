import React from 'react';
import type { AnalysisResult } from '@/src/features/jobAnalysis';
import { cn } from '@/lib/utils';

interface Props {
  result: AnalysisResult;
  onClose: () => void;
}

export function JobAnalysisCard({ result, onClose }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecommendationBg = (rec: string) => {
    if (rec === 'apply') return 'bg-green-100 text-green-800 border-green-200';
    if (rec === 'caution') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-lg">Job Analysis</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Overall Score */}
          <div className="text-center">
            <div className={cn('text-4xl font-bold', getScoreColor(result.overallScore))}>
              {result.overallScore}
            </div>
            <div className="text-sm text-gray-500">Overall Score</div>
            <div className={cn(
              'inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border',
              getRecommendationBg(result.recommendation)
            )}>
              {result.recommendation === 'apply'
                ? '✓ Recommended'
                : result.recommendation === 'caution'
                  ? '⚠ Proceed with Caution'
                  : '✗ Not Recommended'}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className={cn('text-2xl font-semibold', getScoreColor(result.atsScore))}>
                {result.atsScore}
              </div>
              <div className="text-xs text-gray-500">ATS Score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className={cn('text-2xl font-semibold', getScoreColor(result.legitimacyScore))}>
                {result.legitimacyScore}
              </div>
              <div className="text-xs text-gray-500">Legitimacy</div>
            </div>
          </div>

          {/* Red Flags */}
          {result.redFlags.length > 0 && (
            <div>
              <h4 className="font-medium text-red-600 text-sm mb-2">
                ⚠ Red Flags ({result.redFlags.length})
              </h4>
              <ul className="space-y-1">
                {result.redFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Positive Indicators */}
          {result.positiveIndicators.length > 0 && (
            <div>
              <h4 className="font-medium text-green-600 text-sm mb-2">
                ✓ Positive Signs ({result.positiveIndicators.length})
              </h4>
              <ul className="space-y-1">
                {result.positiveIndicators.map((ind, i) => (
                  <li key={i} className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                    {ind}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keyword Matches */}
          <div>
            <h4 className="font-medium text-gray-700 text-sm mb-2">Keyword Analysis</h4>
            <div className="flex flex-wrap gap-1">
              {result.keywordMatches.map(cat => (
                <span
                  key={cat.category}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                >
                  {cat.category}: {cat.count}
                </span>
              ))}
            </div>
          </div>

          {/* Usage Remaining */}
          <div className="text-center text-xs text-gray-500 pt-2 border-t">
            {result.usageRemaining === 'unlimited'
              ? '★ Unlimited analyses (Pro)'
              : `${result.usageRemaining} analyses remaining this month`}
          </div>
        </div>
      </div>
    </div>
  );
}
