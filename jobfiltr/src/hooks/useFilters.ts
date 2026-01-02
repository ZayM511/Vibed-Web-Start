// Filters hook with Zustand store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterSettings } from '../types';

interface FiltersState extends FilterSettings {
  setHideGhostJobs: (value: boolean) => void;
  setHideStaffingFirms: (value: boolean) => void;
  setVerifyTrueRemote: (value: boolean) => void;
  setGhostJobDaysThreshold: (value: 30 | 60 | 90) => void;
  setDatePosted: (value: '24h' | 'week' | 'month' | 'any') => void;
  addIncludeKeyword: (keyword: string) => void;
  removeIncludeKeyword: (keyword: string) => void;
  setIncludeKeywordsMatchMode: (mode: 'any' | 'all') => void;
  addExcludeKeyword: (keyword: string) => void;
  removeExcludeKeyword: (keyword: string) => void;
  addExcludeCompany: (company: string) => void;
  removeExcludeCompany: (company: string) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterSettings = {
  hideGhostJobs: true,
  hideStaffingFirms: false,
  verifyTrueRemote: false,
  ghostJobDaysThreshold: 30,
  datePosted: 'any',
  includeKeywords: [],
  includeKeywordsMatchMode: 'any',
  excludeKeywords: [],
  excludeCompanies: [],
};

export const useFilters = create<FiltersState>()(
  persist(
    (set) => ({
      ...defaultFilters,

      setHideGhostJobs: (value) => set({ hideGhostJobs: value }),
      setHideStaffingFirms: (value) => set({ hideStaffingFirms: value }),
      setVerifyTrueRemote: (value) => set({ verifyTrueRemote: value }),
      setGhostJobDaysThreshold: (value) => set({ ghostJobDaysThreshold: value }),
      setDatePosted: (value) => set({ datePosted: value }),

      addIncludeKeyword: (keyword) =>
        set((state) => ({
          includeKeywords: state.includeKeywords.includes(keyword)
            ? state.includeKeywords
            : [...state.includeKeywords, keyword],
        })),
      removeIncludeKeyword: (keyword) =>
        set((state) => ({
          includeKeywords: state.includeKeywords.filter((k) => k !== keyword),
        })),
      setIncludeKeywordsMatchMode: (mode) => set({ includeKeywordsMatchMode: mode }),

      addExcludeKeyword: (keyword) =>
        set((state) => ({
          excludeKeywords: state.excludeKeywords.includes(keyword)
            ? state.excludeKeywords
            : [...state.excludeKeywords, keyword],
        })),
      removeExcludeKeyword: (keyword) =>
        set((state) => ({
          excludeKeywords: state.excludeKeywords.filter((k) => k !== keyword),
        })),

      addExcludeCompany: (company) =>
        set((state) => ({
          excludeCompanies: state.excludeCompanies.includes(company)
            ? state.excludeCompanies
            : [...state.excludeCompanies, company],
        })),
      removeExcludeCompany: (company) =>
        set((state) => ({
          excludeCompanies: state.excludeCompanies.filter((c) => c !== company),
        })),

      resetFilters: () => set(defaultFilters),
    }),
    {
      name: 'jobfiltr-filters',
    }
  )
);
