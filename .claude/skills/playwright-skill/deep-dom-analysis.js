// Deep DOM analysis to find hidden age data in LinkedIn cards
const { chromium } = require('playwright');

(async () => {
  console.log('=== Deep DOM Analysis ===\n');
  console.log('Connecting to existing Chrome on port 9222...\n');

  try {
    // Try to connect to existing Chrome
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome!\n');

    const contexts = browser.contexts();
    let page = null;

    for (const context of contexts) {
      for (const p of context.pages()) {
        if (p.url().includes('linkedin.com/jobs')) {
          page = p;
          break;
        }
      }
      if (page) break;
    }

    if (!page) {
      console.log('No LinkedIn jobs page found');
      await browser.close();
      return;
    }

    console.log('Found LinkedIn page:', page.url(), '\n');

    // Deep analysis of first few job cards
    const analysis = await page.evaluate(() => {
      const results = [];

      // Find job cards
      const cards = document.querySelectorAll('.scaffold-layout__list-item, li:has(a[href*="/jobs/view/"])');
      const uniqueCards = [...new Set(cards)].slice(0, 5);

      uniqueCards.forEach((card, i) => {
        const cardData = {
          index: i,
          // Get all data attributes
          dataAttributes: {},
          // Get all text content that might contain dates
          potentialDateTexts: [],
          // Check for hidden elements
          hiddenElements: [],
          // Check for time-related classes
          timeClasses: [],
          // Check embedded JSON/scripts
          embeddedData: null,
          // Full HTML structure (abbreviated)
          structure: ''
        };

        // Collect all data-* attributes
        const allElements = card.querySelectorAll('*');
        allElements.forEach(el => {
          for (const attr of el.attributes || []) {
            if (attr.name.startsWith('data-')) {
              const key = `${el.tagName}.${attr.name}`;
              cardData.dataAttributes[key] = attr.value.substring(0, 100);
            }
          }
        });

        // Look for hidden elements with time info
        allElements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            const text = el.textContent?.trim();
            if (text && text.length < 100) {
              cardData.hiddenElements.push({
                tag: el.tagName,
                class: el.className?.substring(0, 50),
                text: text.substring(0, 80)
              });
            }
          }
        });

        // Look for time-related class names
        allElements.forEach(el => {
          const className = el.className || '';
          if (/time|date|posted|ago|when/i.test(className)) {
            cardData.timeClasses.push({
              tag: el.tagName,
              class: className.substring(0, 80),
              text: el.textContent?.trim()?.substring(0, 50)
            });
          }
        });

        // Check for embedded JSON in script tags or data attributes
        const scripts = card.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]');
        scripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent);
            cardData.embeddedData = JSON.stringify(data).substring(0, 200);
          } catch (e) {}
        });

        // Look for date patterns in any attribute values
        allElements.forEach(el => {
          for (const attr of el.attributes || []) {
            if (/\d{4}-\d{2}-\d{2}|posted|date|time/i.test(attr.value)) {
              cardData.potentialDateTexts.push({
                attr: attr.name,
                value: attr.value.substring(0, 100)
              });
            }
          }
        });

        // Get job ID from URL
        const jobLink = card.querySelector('a[href*="/jobs/view/"]');
        if (jobLink) {
          const match = jobLink.href.match(/\/jobs\/view\/(\d+)/);
          cardData.jobId = match ? match[1] : null;
        }

        // Check card's parent for data
        const parentLi = card.closest('li');
        if (parentLi) {
          cardData.parentData = {
            'data-occludable-job-id': parentLi.dataset.occludableJobId,
            'data-job-id': parentLi.dataset.jobId,
            allDataAttrs: Object.keys(parentLi.dataset).join(', ')
          };
        }

        results.push(cardData);
      });

      return results;
    });

    console.log('=== Deep Analysis Results ===\n');

    analysis.forEach(card => {
      console.log(`\n--- Card ${card.index} (Job ID: ${card.jobId}) ---`);

      if (card.parentData) {
        console.log('Parent data attrs:', JSON.stringify(card.parentData));
      }

      if (Object.keys(card.dataAttributes).length > 0) {
        console.log('\nData attributes with potential info:');
        for (const [key, value] of Object.entries(card.dataAttributes)) {
          if (/job|id|time|date|post/i.test(key) || /\d{4}/.test(value)) {
            console.log(`  ${key}: ${value}`);
          }
        }
      }

      if (card.timeClasses.length > 0) {
        console.log('\nTime-related classes:');
        card.timeClasses.forEach(tc => {
          console.log(`  ${tc.tag}.${tc.class}: "${tc.text}"`);
        });
      }

      if (card.hiddenElements.length > 0) {
        console.log('\nHidden elements with content:');
        card.hiddenElements.slice(0, 5).forEach(he => {
          console.log(`  ${he.tag}.${he.class}: "${he.text}"`);
        });
      }

      if (card.potentialDateTexts.length > 0) {
        console.log('\nPotential date values:');
        card.potentialDateTexts.forEach(pd => {
          console.log(`  [${pd.attr}]: ${pd.value}`);
        });
      }

      if (card.embeddedData) {
        console.log('\nEmbedded JSON:', card.embeddedData);
      }
    });

    console.log('\n\n=== Analysis Complete ===\n');
    await browser.close();

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nChrome is not running with remote debugging.');
      console.log('Please use the previous script or launch Chrome manually with --remote-debugging-port=9222');
    }
  }
})();
