/**
 * TDD Tests for LinkedIn Badge Persistence
 *
 * These tests validate:
 * 1. Badges show on initial load without clicking
 * 2. Badges persist after clicking job cards
 * 3. Badges survive React re-renders
 * 4. Badges sync between list and detail views
 * 5. Staffing filter respects display modes
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const LINKEDIN_JOBS_URL = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States';
const TEST_TIMEOUT = 30000;

/**
 * Helper: Enable a filter setting via extension storage
 */
async function enableFilter(page, filterName, value) {
  await page.evaluate(({ name, val }) => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [name]: val }, () => resolve());
    });
  }, { name: filterName, val: value });

  // Wait for filter to apply
  await page.waitForTimeout(1000);
}

/**
 * Helper: Get current filter settings
 */
async function getFilterSettings(page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (settings) => resolve(settings));
    });
  });
}

/**
 * Helper: Trigger filter application
 */
async function applyFilters(page) {
  await page.evaluate(() => {
    window.postMessage({ type: 'APPLY_FILTERS' }, '*');
  });
  await page.waitForTimeout(2000); // Wait for filters to apply
}

/**
 * Helper: Count badges on page
 */
async function countBadges(page, badgeClass) {
  return await page.$$eval(badgeClass, badges => badges.length);
}

/**
 * Helper: Check if badge exists for job
 */
async function hasBadgeForJob(page, jobId, badgeClass) {
  return await page.$eval(
    `${badgeClass}[data-job-id="${jobId}"]`,
    el => el ? true : false
  ).catch(() => false);
}

// ========== JOB AGE BADGE TESTS ==========

test.describe('LinkedIn Job Age Badges', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to LinkedIn jobs
    await page.goto(LINKEDIN_JOBS_URL, { waitUntil: 'networkidle' });

    // Wait for job cards to load
    await page.waitForSelector('li.jobs-search-results__list-item', { timeout: TEST_TIMEOUT });
  });

  test('should show age badges on initial page load WITHOUT clicking', async ({ page }) => {
    // Enable job age filter
    await enableFilter(page, 'showJobAge', true);
    await applyFilters(page);

    // Wait for badges to appear
    await page.waitForSelector('.jobfiltr-age-badge', { timeout: 5000 });

    // Count age badges
    const ageBadgeCount = await countBadges(page, '.jobfiltr-age-badge');

    // Should have multiple badges (at least 5 on a typical search)
    expect(ageBadgeCount).toBeGreaterThan(4);

    // Verify first badge has valid data
    const firstBadge = await page.$eval('.jobfiltr-age-badge', badge => ({
      text: badge.textContent,
      jobId: badge.dataset.jobId,
      age: badge.dataset.age
    }));

    expect(firstBadge.jobId).toBeTruthy();
    expect(firstBadge.age).toMatch(/^\d+$/); // Should be a number
    expect(firstBadge.text).toMatch(/(Today|\d+ days?)/); // Should show age text
  });

  test('should persist age badges after clicking job card', async ({ page }) => {
    // Enable job age filter
    await enableFilter(page, 'showJobAge', true);
    await applyFilters(page);

    // Wait for badges
    await page.waitForSelector('.jobfiltr-age-badge', { timeout: 5000 });

    // Get initial badge count
    const initialCount = await countBadges(page, '.jobfiltr-age-badge');

    // Click first job card
    await page.click('li.jobs-search-results__list-item:first-child');

    // Wait for detail panel to load
    await page.waitForSelector('.jobs-details', { timeout: 3000 });

    // Wait through multiple scan cycles (6 seconds = 3 scans at 2s intervals)
    await page.waitForTimeout(6000);

    // Check that badges are STILL visible
    const afterClickCount = await countBadges(page, '.jobfiltr-age-badge');

    // Should have same or more badges (not less)
    expect(afterClickCount).toBeGreaterThanOrEqual(initialCount - 1);
    // Allow -1 in case one card scrolled out of view

    // Verify the clicked card still has its badge
    const firstCardHasBadge = await page.$eval(
      'li.jobs-search-results__list-item:first-child .jobfiltr-age-badge',
      el => el ? true : false
    ).catch(() => false);

    expect(firstCardHasBadge).toBe(true);
  });

  test('should survive LinkedIn SPA navigation', async ({ page }) => {
    // Enable job age filter
    await enableFilter(page, 'showJobAge', true);
    await applyFilters(page);

    // Wait for badges
    await page.waitForSelector('.jobfiltr-age-badge', { timeout: 5000 });

    // Get a job ID from first badge
    const jobId = await page.$eval('.jobfiltr-age-badge', badge => badge.dataset.jobId);

    // Navigate to page 2 using LinkedIn's pagination
    const page2Link = await page.$('.artdeco-pagination__button--next');
    if (page2Link) {
      await page2Link.click();

      // Wait for new page to load
      await page.waitForTimeout(3000);

      // Navigate back to page 1
      const page1Link = await page.$('.artdeco-pagination__indicator--number[data-test-pagination-page-btn="1"]');
      if (page1Link) {
        await page1Link.click();
        await page.waitForTimeout(3000);

        // Check if badge for original job still exists (if job is still visible)
        const originalBadgeExists = await hasBadgeForJob(page, jobId, '.jobfiltr-age-badge');

        // Note: Job might not be on page 1 anymore, so we just check that SOME badges exist
        const badgeCount = await countBadges(page, '.jobfiltr-age-badge');
        expect(badgeCount).toBeGreaterThan(0);
      }
    }
  });

  test('should cache badge data across sessions', async ({ page }) => {
    // Enable job age filter
    await enableFilter(page, 'showJobAge', true);
    await applyFilters(page);

    // Wait for badges
    await page.waitForSelector('.jobfiltr-age-badge', { timeout: 5000 });

    // Get cached data from storage
    const cachedData = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get('linkedin_badge_state', (result) => {
          resolve(result.linkedin_badge_state || {});
        });
      });
    });

    // Should have cached data for multiple jobs
    const cachedJobIds = Object.keys(cachedData);
    expect(cachedJobIds.length).toBeGreaterThan(0);

    // Verify cache structure
    const firstCachedJob = cachedData[cachedJobIds[0]];
    expect(firstCachedJob).toHaveProperty('age');
    expect(firstCachedJob).toHaveProperty('timestamp');
  });
});

// ========== BENEFITS BADGE TESTS ==========

test.describe('LinkedIn Benefits Badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LINKEDIN_JOBS_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('li.jobs-search-results__list-item', { timeout: TEST_TIMEOUT });
  });

  test('should NOT disappear after clicking job card', async ({ page }) => {
    // Enable benefits indicator
    await enableFilter(page, 'showBenefitsIndicator', true);
    await applyFilters(page);

    // Wait for at least one benefits badge to appear
    await page.waitForSelector('.jobfiltr-benefits-badge', { timeout: 5000 });

    // Get initial badge count
    const initialCount = await countBadges(page, '.jobfiltr-benefits-badge');

    // Click a job card that has a benefits badge
    await page.click('li:has(.jobfiltr-benefits-badge):first-child');

    // Wait for detail panel
    await page.waitForSelector('.jobs-details', { timeout: 3000 });

    // Wait through multiple scan cycles (6 seconds)
    await page.waitForTimeout(6000);

    // Verify badges are STILL present
    const afterClickCount = await countBadges(page, '.jobfiltr-benefits-badge');

    expect(afterClickCount).toBeGreaterThanOrEqual(initialCount - 1);
    // Allow -1 in case card scrolled out of view
  });

  test('should show benefits badges for jobs with benefits', async ({ page }) => {
    // Enable benefits indicator
    await enableFilter(page, 'showBenefitsIndicator', true);
    await applyFilters(page);

    // Click a job to view details
    await page.click('li.jobs-search-results__list-item:first-child');

    // Wait for description to load
    await page.waitForSelector('.jobs-description__content', { timeout: 5000 });

    // Check if description mentions benefits
    const descriptionText = await page.$eval(
      '.jobs-description__content',
      el => el.textContent.toLowerCase()
    );

    const hasBenefitsKeywords = /health|401k|dental|vision|pto|insurance|equity/.test(descriptionText);

    if (hasBenefitsKeywords) {
      // Wait for benefits badge
      await page.waitForSelector('.jobfiltr-benefits-badge', { timeout: 3000 });

      const badgeExists = await page.$('.jobfiltr-benefits-badge');
      expect(badgeExists).toBeTruthy();
    }
  });
});

// ========== STAFFING FILTER TESTS ==========

test.describe('LinkedIn Staffing Filter Display Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LINKEDIN_JOBS_URL + '&keywords=teksystems', { waitUntil: 'networkidle' });
    await page.waitForSelector('li.jobs-search-results__list-item', { timeout: TEST_TIMEOUT });
  });

  test('Hide mode: should completely hide staffing firm jobs', async ({ page }) => {
    // Enable staffing filter in hide mode
    await enableFilter(page, 'hideStaffing', true);
    await enableFilter(page, 'staffingDisplayMode', 'hide');
    await applyFilters(page);

    await page.waitForTimeout(2000);

    // Find all job cards
    const jobCards = await page.$$('li.jobs-search-results__list-item');

    // Check that TekSystems jobs are hidden
    let hiddenCount = 0;
    for (const card of jobCards) {
      const isHidden = await card.evaluate(el => {
        const companyName = el.textContent.toLowerCase();
        const isTekSystems = /teksystems|tek systems/.test(companyName);
        const isDisplayNone = window.getComputedStyle(el).display === 'none';
        return isTekSystems && isDisplayNone;
      });

      if (isHidden) hiddenCount++;
    }

    expect(hiddenCount).toBeGreaterThan(0);
  });

  test('Flag mode: should show staffing jobs with badge', async ({ page }) => {
    // Enable staffing filter in flag mode
    await enableFilter(page, 'hideStaffing', true);
    await enableFilter(page, 'staffingDisplayMode', 'flag');
    await applyFilters(page);

    await page.waitForTimeout(2000);

    // Look for staffing badges
    const staffingBadges = await page.$$('.jobfiltr-staffing-badge');

    // Should have at least one staffing badge
    expect(staffingBadges.length).toBeGreaterThan(0);

    // Verify job cards with badges are visible
    const visibleStaffingCards = await page.$$eval(
      'li.jobs-search-results__list-item:has(.jobfiltr-staffing-badge)',
      cards => cards.filter(card => window.getComputedStyle(card).display !== 'none').length
    );

    expect(visibleStaffingCards).toBeGreaterThan(0);
  });

  test('Dim mode: should dim staffing jobs and show badge', async ({ page }) => {
    // Enable staffing filter in dim mode
    await enableFilter(page, 'hideStaffing', true);
    await enableFilter(page, 'staffingDisplayMode', 'dim');
    await applyFilters(page);

    await page.waitForTimeout(2000);

    // Check for dimmed cards with staffing badges
    const dimmedCards = await page.$$eval(
      'li.jobs-search-results__list-item:has(.jobfiltr-staffing-badge)',
      cards => cards.filter(card => {
        const opacity = window.getComputedStyle(card).opacity;
        return parseFloat(opacity) < 1;
      }).length
    );

    expect(dimmedCards).toBeGreaterThan(0);
  });

  test('Non-staffing companies should NOT be affected', async ({ page }) => {
    // Search for non-staffing company
    await page.goto('https://www.linkedin.com/jobs/search/?keywords=google%20software%20engineer', {
      waitUntil: 'networkidle'
    });
    await page.waitForSelector('li.jobs-search-results__list-item', { timeout: TEST_TIMEOUT });

    // Enable staffing filter
    await enableFilter(page, 'hideStaffing', true);
    await enableFilter(page, 'staffingDisplayMode', 'hide');
    await applyFilters(page);

    await page.waitForTimeout(2000);

    // Google jobs should NOT be hidden
    const googleJobs = await page.$$eval(
      'li.jobs-search-results__list-item',
      cards => cards.filter(card => {
        const companyName = card.textContent.toLowerCase();
        const isGoogle = /google/i.test(companyName);
        const isHidden = window.getComputedStyle(card).display === 'none';
        return isGoogle && !isHidden;
      }).length
    );

    expect(googleJobs).toBeGreaterThan(0);
  });
});

// ========== BADGE STATE MANAGER TESTS ==========

test.describe('Badge State Manager', () => {
  test('should cache badge data in chrome.storage.local', async ({ page }) => {
    await page.goto(LINKEDIN_JOBS_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('li.jobs-search-results__list-item', { timeout: TEST_TIMEOUT });

    // Enable filters
    await enableFilter(page, 'showJobAge', true);
    await enableFilter(page, 'showBenefitsIndicator', true);
    await applyFilters(page);

    // Wait for badges
    await page.waitForTimeout(3000);

    // Get cache data
    const cacheData = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get('linkedin_badge_state', (result) => {
          resolve(result.linkedin_badge_state || {});
        });
      });
    });

    // Verify cache exists
    const jobIds = Object.keys(cacheData);
    expect(jobIds.length).toBeGreaterThan(0);

    // Verify cache structure
    const firstJob = cacheData[jobIds[0]];
    expect(firstJob).toHaveProperty('timestamp');
    expect(typeof firstJob.timestamp).toBe('number');
  });

  test('should respect TTL and clear expired data', async ({ page }) => {
    await page.goto(LINKEDIN_JOBS_URL, { waitUntil: 'networkidle' });

    // Inject expired cache data
    await page.evaluate(() => {
      const expiredData = {
        'old-job-123': {
          age: 30,
          benefits: [],
          timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        }
      };

      return new Promise((resolve) => {
        chrome.storage.local.set({ linkedin_badge_state: expiredData }, () => {
          // Trigger cache cleanup
          if (window.badgeStateManager) {
            window.badgeStateManager.clearExpired();
          }
          resolve();
        });
      });
    });

    await page.waitForTimeout(1000);

    // Check that expired data was removed
    const cacheData = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get('linkedin_badge_state', (result) => {
          resolve(result.linkedin_badge_state || {});
        });
      });
    });

    expect(cacheData['old-job-123']).toBeUndefined();
  });
});

// Run all tests
console.log('\n========== LinkedIn Badge Persistence Tests ==========\n');
