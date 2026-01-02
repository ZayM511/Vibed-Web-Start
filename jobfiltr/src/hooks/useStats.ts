// Statistics hook
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Stats {
  totalJobsScanned: number;
  ghostJobsHidden: number;
  staffingFirmsHidden: number;
  keywordFiltersApplied: number;
  companiesBlocked: number;
  sessionStartTime: number;
}

interface StatsState extends Stats {
  incrementJobsScanned: (count?: number) => void;
  incrementGhostJobsHidden: (count?: number) => void;
  incrementStaffingFirmsHidden: (count?: number) => void;
  incrementKeywordFilters: (count?: number) => void;
  incrementCompaniesBlocked: (count?: number) => void;
  resetSessionStats: () => void;
  resetAllStats: () => void;
}

const defaultStats: Stats = {
  totalJobsScanned: 0,
  ghostJobsHidden: 0,
  staffingFirmsHidden: 0,
  keywordFiltersApplied: 0,
  companiesBlocked: 0,
  sessionStartTime: Date.now(),
};

export const useStats = create<StatsState>()(
  persist(
    (set) => ({
      ...defaultStats,

      incrementJobsScanned: (count = 1) =>
        set((state) => ({ totalJobsScanned: state.totalJobsScanned + count })),
      incrementGhostJobsHidden: (count = 1) =>
        set((state) => ({ ghostJobsHidden: state.ghostJobsHidden + count })),
      incrementStaffingFirmsHidden: (count = 1) =>
        set((state) => ({ staffingFirmsHidden: state.staffingFirmsHidden + count })),
      incrementKeywordFilters: (count = 1) =>
        set((state) => ({ keywordFiltersApplied: state.keywordFiltersApplied + count })),
      incrementCompaniesBlocked: (count = 1) =>
        set((state) => ({ companiesBlocked: state.companiesBlocked + count })),

      resetSessionStats: () =>
        set({
          sessionStartTime: Date.now(),
        }),

      resetAllStats: () => set(defaultStats),
    }),
    {
      name: 'jobfiltr-stats',
    }
  )
);
