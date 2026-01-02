"use client";

/**
 * Stub file for useFilters hook.
 * The actual implementation is in src/hooks/useFilters.ts (Chrome extension).
 * This stub exists to prevent type errors but is not used in the Next.js app.
 */

import { useState, useCallback } from 'react';

export function useFilters() {
  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [includeMatchMode, setIncludeMatchModeState] = useState<'any' | 'all'>('any');
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  const addIncludeKeyword = useCallback(async (_keyword: string) => {
    console.warn('useFilters: This is a stub. Use the extension version.');
  }, []);

  const removeIncludeKeyword = useCallback(async (_keyword: string) => {
    console.warn('useFilters: This is a stub. Use the extension version.');
  }, []);

  const addExcludeKeyword = useCallback(async (_keyword: string) => {
    console.warn('useFilters: This is a stub. Use the extension version.');
  }, []);

  const removeExcludeKeyword = useCallback(async (_keyword: string) => {
    console.warn('useFilters: This is a stub. Use the extension version.');
  }, []);

  const setIncludeMatchMode = useCallback(async (_mode: 'any' | 'all') => {
    console.warn('useFilters: This is a stub. Use the extension version.');
  }, []);

  return {
    includeKeywords,
    excludeKeywords,
    includeMatchMode,
    loading,
    error,
    addIncludeKeyword,
    removeIncludeKeyword,
    addExcludeKeyword,
    removeExcludeKeyword,
    setIncludeKeywords,
    setIncludeMatchMode,
    setIncludeMatchModeState,
  };
}
