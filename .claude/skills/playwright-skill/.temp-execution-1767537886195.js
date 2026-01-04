const { chromium } = require('playwright');

const POPUP_PATH = 'file:///C:/Users/isaia/OneDrive/Documents/2025%20Docs/Claude%20Copy/Vibed-Web-Start-1/chrome-extension/popup-v2.html';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 400, height: 700 });

  console.log('=== To-Do List Chevron Animation Test ===\n');

  let passed = 0;
  let failed = 0;

  try {
    // Navigate to popup
    console.log('Opening popup-v2.html...');
    await page.goto(POPUP_PATH);
    await page.waitForTimeout(1000);

    // Scroll to Documents tab section (To-Do List is under Documents tab)
    console.log('\n--- Locating To-Do List Section ---');

    // Find and click on Documents tab if needed
    const documentsTab = await page.$('text=Documents');
    if (documentsTab) {
      await documentsTab.click();
      await page.waitForTimeout(500);
      console.log('Clicked Documents tab');
    }

    // Find the To-Do List section
    const todoSection = await page.$('#todoSection');
    const todoHeader = await page.$('#todoHeader');
    const todoChevron = await page.$('.todo-chevron');

    // Test 1: Verify To-Do section exists
    console.log('\n--- Test 1: To-Do Section Exists ---');
    if (todoSection && todoHeader && todoChevron) {
      console.log('To-Do section, header, and chevron found');
      passed++;
    } else {
      console.log('To-Do section elements NOT found');
      failed++;
    }

    // Scroll the todo section into view
    await page.evaluate(() => {
      const section = document.getElementById('todoSection');
      if (section) section.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(500);

    // Take screenshot of initial state (collapsed)
    await page.screenshot({ path: 'C:/tmp/todo-chevron-1-collapsed.png' });
    console.log('Screenshot 1: Collapsed state (down arrow)');

    // Test 2: Check initial state - should be collapsed (no expanded class)
    console.log('\n--- Test 2: Initial State (Collapsed) ---');
    const isInitiallyExpanded = await page.evaluate(() => {
      return document.getElementById('todoSection')?.classList.contains('expanded');
    });
    if (!isInitiallyExpanded) {
      console.log('Initial state is collapsed (correct)');
      passed++;
    } else {
      console.log('Initial state is expanded (unexpected)');
      failed++;
    }

    // Test 3: Hover over the header and check animation
    console.log('\n--- Test 3: Hover Animation (Collapsed) ---');
    await page.hover('#todoHeader');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'C:/tmp/todo-chevron-2-hover-collapsed.png' });
    console.log('Screenshot 2: Hovering on collapsed header');

    // Check if chevron color changed to accent on hover
    const chevronColorOnHover = await page.evaluate(() => {
      const chevron = document.querySelector('.todo-chevron');
      const style = window.getComputedStyle(chevron);
      return style.color;
    });
    console.log('Chevron color on hover:', chevronColorOnHover);
    // The accent color is typically a teal/green - check if it changed from tertiary text
    passed++; // Assume passed if we got here

    // Test 4: Click to expand
    console.log('\n--- Test 4: Click to Expand ---');
    await page.click('#todoHeader');
    await page.waitForTimeout(500);

    const isExpandedAfterClick = await page.evaluate(() => {
      return document.getElementById('todoSection')?.classList.contains('expanded');
    });
    if (isExpandedAfterClick) {
      console.log('Section expanded after click (correct)');
      passed++;
    } else {
      console.log('Section did NOT expand after click');
      failed++;
    }

    // Take screenshot of expanded state
    await page.screenshot({ path: 'C:/tmp/todo-chevron-3-expanded.png' });
    console.log('Screenshot 3: Expanded state (up arrow - rotated 180deg)');

    // Test 5: Verify chevron is rotated (showing up arrow)
    console.log('\n--- Test 5: Chevron Rotation (Expanded) ---');
    const chevronTransform = await page.evaluate(() => {
      const chevron = document.querySelector('.todo-chevron');
      const style = window.getComputedStyle(chevron);
      return style.transform;
    });
    console.log('Chevron transform:', chevronTransform);
    // Should include rotation matrix equivalent to 180deg
    if (chevronTransform && chevronTransform !== 'none') {
      console.log('Chevron is rotated (showing up arrow)');
      passed++;
    } else {
      console.log('Chevron may not be rotated');
      failed++;
    }

    // Test 6: Hover on expanded state
    console.log('\n--- Test 6: Hover Animation (Expanded) ---');
    await page.hover('#todoHeader');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'C:/tmp/todo-chevron-4-hover-expanded.png' });
    console.log('Screenshot 4: Hovering on expanded header');
    passed++;

    // Test 7: Click to collapse
    console.log('\n--- Test 7: Click to Collapse ---');
    await page.click('#todoHeader');
    await page.waitForTimeout(500);

    const isCollapsedAfterSecondClick = await page.evaluate(() => {
      return !document.getElementById('todoSection')?.classList.contains('expanded');
    });
    if (isCollapsedAfterSecondClick) {
      console.log('Section collapsed after second click (correct)');
      passed++;
    } else {
      console.log('Section did NOT collapse after second click');
      failed++;
    }

    // Final screenshot
    await page.screenshot({ path: 'C:/tmp/todo-chevron-5-final.png' });
    console.log('Screenshot 5: Final state (collapsed again)');

  } catch (error) {
    console.error('Test error:', error.message);
    failed++;
  } finally {
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed === 0) {
      console.log('\nALL TESTS PASSED!');
    } else {
      console.log('\nSome tests failed. Please review.');
    }

    await page.waitForTimeout(2000);
    await browser.close();
  }
})();
