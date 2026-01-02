import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the usePro hook
vi.mock('@/hooks/usePro', () => ({
  usePro: vi.fn(() => ({
    isPro: false,
    tier: 'free',
    isLoading: false,
    expiresAt: null,
    refreshStatus: vi.fn(),
    canUseIncludeKeywords: vi.fn(() => false),
    canUseSavedTemplates: vi.fn(() => false),
    getExcludeKeywordLimit: vi.fn(() => 3),
    getExcludeCompanyLimit: vi.fn(() => 1),
    getRemainingAnalyses: vi.fn(async () => 30),
    incrementAnalysisCount: vi.fn(async () => true),
    FREE_LIMITS: {
      excludeKeywords: 3,
      excludeCompanies: 1,
      monthlyAnalyses: 30,
    },
  })),
}));

// Mock the tab components
vi.mock('../tabs/FiltersTab', () => ({
  FiltersTab: () => <div data-testid="filters-tab">Filters Tab Content</div>,
}));
vi.mock('../tabs/KeywordsTab', () => ({
  KeywordsTab: () => <div data-testid="keywords-tab">Keywords Tab Content</div>,
}));
vi.mock('../tabs/BlocklistTab', () => ({
  BlocklistTab: () => <div data-testid="blocklist-tab">Blocklist Tab Content</div>,
}));
vi.mock('../tabs/StatsTab', () => ({
  StatsTab: () => <div data-testid="stats-tab">Stats Tab Content</div>,
}));
vi.mock('../tabs/SettingsTab', () => ({
  SettingsTab: () => <div data-testid="settings-tab">Settings Tab Content</div>,
}));
vi.mock('../components/AuthButton', () => ({
  AuthButton: () => <button data-testid="auth-button">Sign In</button>,
}));
vi.mock('../components/TabNavigation', () => ({
  TabNavigation: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
    <div data-testid="tab-navigation">
      <button data-testid="tab-filters" onClick={() => onTabChange('filters')}>Filters</button>
      <button data-testid="tab-keywords" onClick={() => onTabChange('keywords')}>Keywords</button>
      <button data-testid="tab-blocklist" onClick={() => onTabChange('blocklist')}>Blocklist</button>
      <button data-testid="tab-stats" onClick={() => onTabChange('stats')}>Stats</button>
      <button data-testid="tab-settings" onClick={() => onTabChange('settings')}>Settings</button>
      <span data-testid="active-tab">{activeTab}</span>
    </div>
  ),
}));

import { usePro } from '@/hooks/usePro';

describe('PopupApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Chrome mock to return LinkedIn by default
    (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation((_, callback) => {
      callback([{ id: 1, url: 'https://www.linkedin.com/jobs/search' }]);
    });
    (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockImplementation((_, __, callback) => {
      if (callback) callback({ stats: { totalFiltered: 5 } });
    });
  });

  describe('Header', () => {
    it('should render JobFiltr branding', () => {
      render(<App />);
      expect(screen.getByText('JobFiltr')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('should render AuthButton', () => {
      render(<App />);
      expect(screen.getByTestId('auth-button')).toBeInTheDocument();
    });

    it('should NOT show PRO badge for free users', () => {
      render(<App />);
      expect(screen.queryByText('PRO')).not.toBeInTheDocument();
    });

    it('should show PRO badge for pro users', () => {
      vi.mocked(usePro).mockReturnValue({
        isPro: true,
        tier: 'pro',
        isLoading: false,
        expiresAt: null,
        refreshStatus: vi.fn(),
        canUseIncludeKeywords: vi.fn(() => true),
        canUseSavedTemplates: vi.fn(() => true),
        getExcludeKeywordLimit: vi.fn(() => Infinity),
        getExcludeCompanyLimit: vi.fn(() => Infinity),
        getRemainingAnalyses: vi.fn(async () => Infinity),
        incrementAnalysisCount: vi.fn(async () => true),
        FREE_LIMITS: { excludeKeywords: 3, excludeCompanies: 1, monthlyAnalyses: 30 },
      });

      render(<App />);
      expect(screen.getByText('PRO')).toBeInTheDocument();
    });
  });

  describe('Platform Detection', () => {
    it('should show LinkedIn platform when on LinkedIn', async () => {
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation((_, callback) => {
        callback([{ id: 1, url: 'https://www.linkedin.com/jobs/search' }]);
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Active on LinkedIn')).toBeInTheDocument();
      });
    });

    it('should show Indeed platform when on Indeed', async () => {
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation((_, callback) => {
        callback([{ id: 1, url: 'https://www.indeed.com/jobs' }]);
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Active on Indeed')).toBeInTheDocument();
      });
    });

    it('should show "Not on job site" for other sites', async () => {
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation((_, callback) => {
        callback([{ id: 1, url: 'https://www.google.com' }]);
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Not on job site')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Count Display', () => {
    it('should show filtered job count when available', async () => {
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockImplementation((_, __, callback) => {
        if (callback) callback({ stats: { totalFiltered: 42 } });
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('42 jobs filtered')).toBeInTheDocument();
      });
    });

    it('should NOT show count text when 0 jobs filtered', async () => {
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockImplementation((_, __, callback) => {
        if (callback) callback({ stats: { totalFiltered: 0 } });
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText(/jobs filtered/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render TabNavigation component', () => {
      render(<App />);
      expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
    });

    it('should show filters tab by default', () => {
      render(<App />);
      expect(screen.getByTestId('filters-tab')).toBeInTheDocument();
      expect(screen.getByTestId('active-tab')).toHaveTextContent('filters');
    });

    it('should switch to keywords tab when clicked', () => {
      render(<App />);

      fireEvent.click(screen.getByTestId('tab-keywords'));

      expect(screen.getByTestId('keywords-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('filters-tab')).not.toBeInTheDocument();
    });

    it('should switch to blocklist tab when clicked', () => {
      render(<App />);

      fireEvent.click(screen.getByTestId('tab-blocklist'));

      expect(screen.getByTestId('blocklist-tab')).toBeInTheDocument();
    });

    it('should switch to stats tab when clicked', () => {
      render(<App />);

      fireEvent.click(screen.getByTestId('tab-stats'));

      expect(screen.getByTestId('stats-tab')).toBeInTheDocument();
    });

    it('should switch to settings tab when clicked', () => {
      render(<App />);

      fireEvent.click(screen.getByTestId('tab-settings'));

      expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
    });
  });

  describe('Tab Content', () => {
    it('should only render one tab at a time', () => {
      render(<App />);

      // Start with filters tab
      expect(screen.getByTestId('filters-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('keywords-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('blocklist-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('stats-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings-tab')).not.toBeInTheDocument();

      // Switch to keywords
      fireEvent.click(screen.getByTestId('tab-keywords'));
      expect(screen.queryByTestId('filters-tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('keywords-tab')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have correct container width', () => {
      const { container } = render(<App />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('w-[360px]');
    });

    it('should have minimum height', () => {
      const { container } = render(<App />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('min-h-[480px]');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tab URL gracefully', async () => {
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation((_, callback) => {
        callback([{ id: 1 }]); // No URL
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Not on job site')).toBeInTheDocument();
      });
    });

    it('should handle missing stats response gracefully', async () => {
      (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockImplementation((_, __, callback) => {
        if (callback) callback(undefined);
      });

      render(<App />);

      // Should not crash and should not show filter count
      await waitFor(() => {
        expect(screen.queryByText(/jobs filtered/)).not.toBeInTheDocument();
      });
    });

    it('should handle empty tabs array', async () => {
      (chrome.tabs.query as ReturnType<typeof vi.fn>).mockImplementation((_, callback) => {
        callback([]);
      });

      // Should not crash
      expect(() => render(<App />)).not.toThrow();
    });
  });
});
