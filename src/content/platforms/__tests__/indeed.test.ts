import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndeedAdapter } from '../indeed';
import {
  createIndeedJobCard,
  createIndeedDetailView,
  createJobListContainer,
  mockIndeedJobsPage,
  mockLocation,
  cleanupDOM,
} from '@/src/test/dom-mocks';

describe('IndeedAdapter', () => {
  let adapter: IndeedAdapter;

  beforeEach(() => {
    adapter = new IndeedAdapter();
    cleanupDOM();
    mockIndeedJobsPage();
  });

  afterEach(() => {
    adapter.stopObserving();
    cleanupDOM();
  });

  describe('Platform Detection', () => {
    it('should detect Indeed jobs page', () => {
      expect(IndeedAdapter.isIndeedJobsPage()).toBe(true);
    });

    it('should detect Indeed viewjob page', () => {
      mockLocation('www.indeed.com', '/viewjob', '?jk=abc123');
      expect(IndeedAdapter.isIndeedJobsPage()).toBe(true);
    });

    it('should detect Indeed with jk parameter', () => {
      mockLocation('www.indeed.com', '/jobs', '?q=engineer&jk=abc123');
      expect(IndeedAdapter.isIndeedJobsPage()).toBe(true);
    });

    it('should detect Indeed country subdomains', () => {
      const subdomains = ['uk.indeed.com', 'ca.indeed.com', 'de.indeed.com', 'in.indeed.com'];
      subdomains.forEach(hostname => {
        mockLocation(hostname, '/jobs');
        expect(IndeedAdapter.isIndeedJobsPage()).toBe(true);
      });
    });

    it('should NOT detect non-Indeed pages', () => {
      mockLocation('www.linkedin.com', '/jobs');
      expect(IndeedAdapter.isIndeedJobsPage()).toBe(false);
    });

    it('should NOT detect Indeed non-jobs pages', () => {
      mockLocation('www.indeed.com', '/');
      expect(IndeedAdapter.isIndeedJobsPage()).toBe(false);
    });
  });

  describe('Job Card Detection', () => {
    it('should find all job cards on page', () => {
      const jobs = [
        { title: 'Developer', company: 'Corp A', location: 'Boston' },
        { title: 'Analyst', company: 'Corp B', location: 'Chicago' },
      ];
      const container = createJobListContainer('indeed', jobs);
      document.body.appendChild(container);

      const cards = adapter.getJobCards();
      expect(cards.length).toBe(2);
    });

    it('should handle empty job list', () => {
      const container = createJobListContainer('indeed', []);
      document.body.appendChild(container);

      const cards = adapter.getJobCards();
      expect(cards.length).toBe(0);
    });

    it('should skip already processed cards', () => {
      const jobs = [
        { title: 'Developer', company: 'Corp', location: 'NYC' },
      ];
      const container = createJobListContainer('indeed', jobs);
      document.body.appendChild(container);

      // Mark card as processed
      const card = container.querySelector('.job_seen_beacon');
      card?.setAttribute('data-jobfiltr-processed', 'true');

      const cards = adapter.getJobCards();
      expect(cards.length).toBe(0);
    });
  });

  describe('Data Extraction', () => {
    it('should extract job title', () => {
      const card = createIndeedJobCard({
        title: 'Full Stack Developer',
        company: 'StartupXYZ',
        location: 'Austin, TX',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.title).toBe('Full Stack Developer');
    });

    it('should extract company name', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'BigCorp Inc',
        location: 'NYC',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.company).toBe('BigCorp Inc');
    });

    it('should extract location', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'San Francisco, CA',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.location).toBe('San Francisco, CA');
    });

    it('should extract posted date', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
        posted: 'Just posted',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.postedDate).toBe('Just posted');
    });

    it('should set platform to indeed', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.id).toContain('indeed_');
    });

    it('should get job ID from data-jk attribute', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
        id: 'abc123xyz',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.id).toBe('indeed_abc123xyz');
    });

    it('should detect remote from location', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'Remote',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.isRemote).toBe(true);
    });

    it('should detect remote from title', () => {
      const card = createIndeedJobCard({
        title: 'Remote Software Engineer',
        company: 'Company',
        location: 'NYC',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.isRemote).toBe(true);
    });

    it('should extract richer data from detail view', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
      });
      document.body.appendChild(card);

      const detail = createIndeedDetailView({
        title: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        location: 'San Francisco, CA',
        description: 'Detailed job description.',
        salary: '$120,000 - $150,000 a year',
      });
      document.body.appendChild(detail);

      const data = adapter.extractJobData(card);
      expect(data?.title).toBe('Senior Software Engineer');
      expect(data?.company).toBe('TechCorp Inc.');
    });

    it('should return null for cards without title', () => {
      const card = document.createElement('div');
      card.className = 'job_seen_beacon';
      card.setAttribute('data-jk', 'test123');
      card.innerHTML = '<div>Empty card</div>';
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data).toBeNull();
    });

    it('should return null for cards without company', () => {
      const card = document.createElement('div');
      card.className = 'job_seen_beacon';
      card.setAttribute('data-jk', 'test123');
      card.innerHTML = `
        <h2 class="jobTitle"><a href="#">Title Only</a></h2>
      `;
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data).toBeNull();
    });
  });

  describe('Job Card Hiding', () => {
    it('should hide job card by data-jk', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
        id: '12345',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      if (data) {
        adapter.hideJob(data);
      }

      const cardElement = document.querySelector('[data-jk="12345"]') as HTMLElement;
      expect(cardElement?.style.display).toBe('none');
      expect(cardElement?.getAttribute('data-jobfiltr-hidden')).toBe('true');
    });

    it('should handle hiding job without valid ID', () => {
      const job = {
        id: undefined,
        title: 'Test',
        company: 'Test',
        location: 'Test',
        description: '',
      };
      // Should not throw
      expect(() => adapter.hideJob(job as any)).not.toThrow();
    });
  });

  describe('Visual Indicators', () => {
    it('should apply visual indicator to job card', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
        id: '12345',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      if (data) {
        adapter.applyVisualIndicator(data, [{
          detected: true,
          confidence: 0.8,
          category: 'staffing',
          message: 'Staffing agency detected',
          evidence: ['Known agency'],
        }]);
      }

      const indicator = document.querySelector('.jobfiltr-indicator');
      expect(indicator).not.toBeNull();
      expect(indicator?.textContent).toContain('Staffing agency');
    });

    it('should not duplicate indicators', () => {
      const card = createIndeedJobCard({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
        id: '12345',
      });
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      if (data) {
        // Apply twice
        adapter.applyVisualIndicator(data, [{
          detected: true,
          confidence: 0.8,
          category: 'ghost_job',
          message: 'Test',
          evidence: [],
        }]);
        adapter.applyVisualIndicator(data, [{
          detected: true,
          confidence: 0.8,
          category: 'ghost_job',
          message: 'Test 2',
          evidence: [],
        }]);
      }

      const indicators = document.querySelectorAll('.jobfiltr-indicator');
      expect(indicators.length).toBe(1);
    });
  });

  describe('Mutation Observer', () => {
    it('should set up mutation observer', () => {
      const callback = vi.fn();
      const container = createJobListContainer('indeed', []);
      document.body.appendChild(container);

      adapter.observeNewJobs(callback);

      // Observer should be set up without throwing
      expect(() => adapter.stopObserving()).not.toThrow();
    });

    it('should stop observing when called', () => {
      const callback = vi.fn();
      adapter.observeNewJobs(callback);
      adapter.stopObserving();

      // Should not throw when stopping multiple times
      expect(() => adapter.stopObserving()).not.toThrow();
    });
  });

  describe('Score UI Injection', () => {
    it('should inject score UI when target exists', () => {
      const detail = createIndeedDetailView({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
      });
      document.body.appendChild(detail);

      const onClick = vi.fn();
      adapter.injectScoreUI(0.65, 'medium_risk', onClick);

      const scoreUI = document.querySelector('.jobfiltr-ghost-score');
      expect(scoreUI).not.toBeNull();
      expect(scoreUI?.textContent).toContain('65');
    });

    it('should replace existing score UI', () => {
      const detail = createIndeedDetailView({
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
      });
      document.body.appendChild(detail);

      adapter.injectScoreUI(0.5, 'medium_risk', vi.fn());
      adapter.injectScoreUI(0.9, 'likely_ghost', vi.fn());

      const scoreUIs = document.querySelectorAll('.jobfiltr-ghost-score');
      expect(scoreUIs.length).toBe(1);
      expect(scoreUIs[0]?.textContent).toContain('90');
    });

    it('should not inject if target not found', () => {
      // No detail view in DOM
      adapter.injectScoreUI(0.75, 'high_risk', vi.fn());

      const scoreUI = document.querySelector('.jobfiltr-ghost-score');
      expect(scoreUI).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed job cards gracefully', () => {
      const malformedCard = document.createElement('div');
      malformedCard.className = 'job_seen_beacon';
      malformedCard.setAttribute('data-jk', 'malformed');
      malformedCard.innerHTML = '<script>alert("xss")</script>';
      document.body.appendChild(malformedCard);

      const data = adapter.extractJobData(malformedCard);
      expect(data).toBeNull();
    });

    it('should generate ID when data-jk is missing', () => {
      const card = document.createElement('div');
      card.className = 'job_seen_beacon';
      card.innerHTML = `
        <h2 class="jobTitle"><a href="#">Engineer</a></h2>
        <span class="companyName">Company</span>
        <div class="companyLocation">NYC</div>
      `;
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data?.id).toMatch(/^indeed_/);
    });

    it('should handle missing DOM elements', () => {
      const card = document.createElement('div');
      card.className = 'job_seen_beacon';
      card.setAttribute('data-jk', 'empty');
      document.body.appendChild(card);

      const data = adapter.extractJobData(card);
      expect(data).toBeNull();
    });
  });
});
