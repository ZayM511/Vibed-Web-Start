import React, { useState } from 'react';
import { usePro } from '@/hooks/usePro';
import { useFilters } from '@/hooks/useFilters';
import { KeywordChip } from '../components/KeywordChip';
import { ProBadge } from '../components/ProBadge';
import { UpgradePrompt } from '../components/UpgradePrompt';

export function KeywordsTab() {
  const { isPro } = usePro();
  const {
    includeKeywords,
    excludeKeywords,
    includeMatchMode,
    addIncludeKeyword,
    removeIncludeKeyword,
    addExcludeKeyword,
    removeExcludeKeyword,
    setIncludeMatchMode,
    excludeKeywordLimit
  } = useFilters();

  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddInclude = async () => {
    if (!includeInput.trim()) return;
    try {
      await addIncludeKeyword(includeInput.trim());
      setIncludeInput('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const handleAddExclude = async () => {
    if (!excludeInput.trim()) return;
    try {
      await addExcludeKeyword(excludeInput.trim());
      setExcludeInput('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* INCLUDE KEYWORDS (Pro) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">Include Keywords</span>
            <ProBadge />
          </div>
          {isPro && (
            <div className="flex gap-1 text-[10px]">
              <button
                onClick={() => setIncludeMatchMode('any')}
                className={
                  includeMatchMode === 'any'
                    ? 'bg-emerald-600 text-white px-2 py-0.5 rounded'
                    : 'bg-gray-100 px-2 py-0.5 rounded'
                }
              >
                Any
              </button>
              <button
                onClick={() => setIncludeMatchMode('all')}
                className={
                  includeMatchMode === 'all'
                    ? 'bg-emerald-600 text-white px-2 py-0.5 rounded'
                    : 'bg-gray-100 px-2 py-0.5 rounded'
                }
              >
                All
              </button>
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-500">Only show jobs containing these terms</p>

        {isPro ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={includeInput}
                onChange={e => setIncludeInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddInclude()}
                placeholder="Add keyword..."
                className="flex-1 px-2 py-1.5 text-xs border rounded-lg"
              />
              <button
                onClick={handleAddInclude}
                disabled={!includeInput.trim()}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {includeKeywords.map(kw => (
                <KeywordChip
                  key={kw}
                  keyword={kw}
                  type="include"
                  onRemove={() => removeIncludeKeyword(kw)}
                />
              ))}
              {includeKeywords.length === 0 && (
                <span className="text-[10px] text-gray-400 italic">No keywords</span>
              )}
            </div>
          </>
        ) : (
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <p className="text-[10px] text-emerald-700 mb-2">
              Example: &quot;visa sponsorship&quot;, &quot;React&quot;, &quot;senior&quot;
            </p>
            <UpgradePrompt
              feature="include_keywords"
              message="Never miss jobs with must-have terms"
            />
          </div>
        )}
      </div>

      {/* EXCLUDE KEYWORDS */}
      <div className="space-y-2 pt-3 border-t">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-gray-900">Exclude Keywords</span>
          {!isPro && (
            <span className="text-[10px] text-gray-500">
              {excludeKeywords.length}/{excludeKeywordLimit}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500">Hide jobs containing these terms</p>

        <div className="flex gap-2">
          <input
            type="text"
            value={excludeInput}
            onChange={e => setExcludeInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddExclude()}
            placeholder="Add keyword..."
            className="flex-1 px-2 py-1.5 text-xs border rounded-lg"
            disabled={!isPro && excludeKeywords.length >= excludeKeywordLimit}
          />
          <button
            onClick={handleAddExclude}
            disabled={!excludeInput.trim()}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {excludeKeywords.map(kw => (
            <KeywordChip
              key={kw}
              keyword={kw}
              type="exclude"
              onRemove={() => removeExcludeKeyword(kw)}
            />
          ))}
          {excludeKeywords.length === 0 && (
            <span className="text-[10px] text-gray-400 italic">No keywords</span>
          )}
        </div>

        {!isPro && excludeKeywords.length >= excludeKeywordLimit && (
          <p className="text-[10px] text-amber-600">
            Upgrade to Pro for unlimited exclude keywords
          </p>
        )}
      </div>

      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
