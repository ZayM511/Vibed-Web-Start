/**
 * Unit Tests for Reported Company Detector
 *
 * Tests the community-reported spam/ghost job company detection feature
 */

import { reportedCompanyDetector, ReportedCompanyDetector } from '../reportedCompany';
import { REPORTED_COMPANIES, REPORTED_COMPANY_MAP } from '../../../data/reportedCompanies';

describe('ReportedCompanyDetector', () => {
  describe('data integrity', () => {
    it('should have 100+ companies in the list', () => {
      expect(REPORTED_COMPANIES.length).toBeGreaterThanOrEqual(100);
    });

    it('should have all companies with required fields', () => {
      for (const company of REPORTED_COMPANIES) {
        expect(company.name).toBeTruthy();
        expect(company.normalized).toBeTruthy();
        expect(['spam', 'ghost', 'scam']).toContain(company.category);
        expect(company.lastUpdated).toBeTruthy();
      }
    });

    it('should have map with more entries than companies (due to aliases)', () => {
      expect(REPORTED_COMPANY_MAP.size).toBeGreaterThan(REPORTED_COMPANIES.length);
    });
  });

  describe('exact matching', () => {
    it('should detect Accenture exactly', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Accenture' });
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe('exact');
      expect(result.company?.name).toBe('Accenture');
    });

    it('should detect CVS Health with alias', () => {
      const result = reportedCompanyDetector.analyze({ company: 'CVS Health' });
      expect(result.detected).toBe(true);
      expect(result.company?.name).toBe('CVS');
    });

    it('should detect regardless of case', () => {
      const result = reportedCompanyDetector.analyze({ company: 'ACCENTURE' });
      expect(result.detected).toBe(true);
      expect(result.company?.name).toBe('Accenture');
    });

    it('should detect with extra whitespace', () => {
      const result = reportedCompanyDetector.analyze({ company: '  Accenture  ' });
      expect(result.detected).toBe(true);
    });
  });

  describe('suffix handling', () => {
    it('should detect company with Inc suffix', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Accenture Inc' });
      expect(result.detected).toBe(true);
    });

    it('should detect company with LLC suffix', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Accenture LLC' });
      expect(result.detected).toBe(true);
    });

    it('should detect company with Corporation suffix', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Accenture Corporation' });
      expect(result.detected).toBe(true);
    });
  });

  describe('alias matching', () => {
    it('should detect JP Morgan via alias jpmorgan', () => {
      const result = reportedCompanyDetector.analyze({ company: 'JPMorgan' });
      expect(result.detected).toBe(true);
      expect(result.company?.name).toBe('JP Morgan Chase');
    });

    it('should detect Chase via alias', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Chase Bank' });
      expect(result.detected).toBe(true);
      expect(result.company?.name).toBe('JP Morgan Chase');
    });

    it('should detect Bank of America via alias bofa', () => {
      const result = reportedCompanyDetector.analyze({ company: 'BofA' });
      expect(result.detected).toBe(true);
      expect(result.company?.name).toBe('Bank of America');
    });

    it('should detect SoCal Edison via alias SCE', () => {
      const result = reportedCompanyDetector.analyze({ company: 'SCE' });
      expect(result.detected).toBe(true);
      expect(result.company?.name).toBe('SoCal Edison');
    });
  });

  describe('partial matching', () => {
    it('should detect partial match with company name in job company', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Accenture Federal Services' });
      expect(result.detected).toBe(true);
      expect(result.matchType).toBe('partial');
      expect(result.confidence).toBe(0.85);
    });

    it('should detect NBC Universal with space', () => {
      const result = reportedCompanyDetector.analyze({ company: 'NBC Universal Media' });
      expect(result.detected).toBe(true);
    });

    it('should not false positive on short substrings', () => {
      // "EY" is in the list but shouldn't match "MONKEY" (< 3 chars)
      const result = reportedCompanyDetector.analyze({ company: 'Monkey Business' });
      expect(result.detected).toBe(false);
    });
  });

  describe('special characters', () => {
    it('should handle 1-800-Pack-Rat with dashes', () => {
      const result = reportedCompanyDetector.analyze({ company: '1-800-Pack-Rat' });
      expect(result.detected).toBe(true);
    });

    it('should handle 1 800 Pack Rat with spaces', () => {
      const result = reportedCompanyDetector.analyze({ company: '1 800 Pack Rat' });
      expect(result.detected).toBe(true);
    });

    it('should handle Files.com with period', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Files.com' });
      expect(result.detected).toBe(true);
    });

    it('should handle Aha! with exclamation', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Aha!' });
      expect(result.detected).toBe(true);
    });
  });

  describe('category classification', () => {
    it('should classify Dice as spam', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Dice' });
      expect(result.detected).toBe(true);
      expect(result.company?.category).toBe('spam');
    });

    it('should classify HireMeFast LLC as scam', () => {
      const result = reportedCompanyDetector.analyze({ company: 'HireMeFast LLC' });
      expect(result.detected).toBe(true);
      expect(result.company?.category).toBe('scam');
    });

    it('should classify Accenture as ghost', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Accenture' });
      expect(result.detected).toBe(true);
      expect(result.company?.category).toBe('ghost');
    });
  });

  describe('non-matches', () => {
    it('should not detect legitimate companies', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Apple Inc' });
      expect(result.detected).toBe(false);
      expect(result.matchType).toBe('none');
    });

    it('should not detect with empty company', () => {
      const result = reportedCompanyDetector.analyze({ company: '' });
      expect(result.detected).toBe(false);
    });

    it('should not detect with whitespace only', () => {
      const result = reportedCompanyDetector.analyze({ company: '   ' });
      expect(result.detected).toBe(false);
    });

    it('should not detect random strings', () => {
      const result = reportedCompanyDetector.analyze({ company: 'RandomTechStartup2025' });
      expect(result.detected).toBe(false);
    });
  });

  describe('message generation', () => {
    it('should generate appropriate message for spam', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Dice' });
      expect(result.message).toContain('spam job listings');
    });

    it('should generate appropriate message for ghost', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Accenture' });
      expect(result.message).toContain('ghost jobs');
    });

    it('should generate appropriate message for scam', () => {
      const result = reportedCompanyDetector.analyze({ company: 'Swooped' });
      expect(result.message).toContain('scam');
    });
  });

  describe('quickCheck method', () => {
    it('should quickly identify known companies', () => {
      expect(reportedCompanyDetector.quickCheck('Accenture')).toBe(true);
    });

    it('should quickly reject unknown companies', () => {
      expect(reportedCompanyDetector.quickCheck('Apple Inc')).toBe(false);
    });
  });

  describe('getStats method', () => {
    it('should return valid statistics', () => {
      const stats = reportedCompanyDetector.getStats();
      expect(stats.totalCompanies).toBeGreaterThanOrEqual(100);
      expect(stats.totalAliases).toBeGreaterThan(0);
      expect(stats.categories.spam).toBeGreaterThan(0);
      expect(stats.categories.ghost).toBeGreaterThan(0);
      expect(stats.categories.scam).toBeGreaterThan(0);
    });
  });

  describe('comprehensive company list coverage', () => {
    const sampleCompanies = [
      'AbbVie', 'Accenture', 'Atlassian', 'Bank of America', 'Cardinal Health',
      'CVS', 'DoorDash', 'EY', 'Fanatics', 'GoodRX', 'HubSpot', 'Kforce',
      'Leidos', 'Mozilla', 'OneTrust', 'Robert Half', 'TekSystems', 'Unisys'
    ];

    test.each(sampleCompanies)('should detect %s', (company) => {
      const result = reportedCompanyDetector.analyze({ company });
      expect(result.detected).toBe(true);
    });
  });
});
