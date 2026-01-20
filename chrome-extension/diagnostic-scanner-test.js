/**
 * Scanner Diagnostic Script
 *
 * Run this in the browser console on an Indeed job page to diagnose scanner issues.
 * This will test all critical components of the scanner functionality.
 */

console.log('='.repeat(80));
console.log('SCANNER DIAGNOSTIC TEST');
console.log('='.repeat(80));

// Test 1: Check if extension is loaded
console.log('\n[TEST 1] Extension Status');
console.log('-'.repeat(40));
const extensionLoaded = typeof window.currentJobData !== 'undefined';
console.log('Extension loaded:', extensionLoaded ? '✓ YES' : '✗ NO');
if (!extensionLoaded) {
  console.error('❌ Extension not loaded! Cannot proceed with tests.');
  console.log('Please ensure the JobFiltr extension is installed and active.');
} else {
  console.log('Current job data:', window.currentJobData);
}

// Test 2: Extract job data from page
console.log('\n[TEST 2] Job Data Extraction');
console.log('-'.repeat(40));

// Find JSON-LD structured data
const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
console.log('JSON-LD scripts found:', jsonLdScripts.length);

let jobPosting = null;
jsonLdScripts.forEach((script, index) => {
  try {
    const data = JSON.parse(script.textContent);
    console.log(`Script ${index + 1}:`, data['@type']);

    if (data['@type'] === 'JobPosting') {
      jobPosting = data;
      console.log('✓ Found JobPosting data');
    }
  } catch (e) {
    console.error(`Error parsing JSON-LD script ${index + 1}:`, e);
  }
});

if (jobPosting) {
  console.log('\nJob Posting Details:');
  console.log('  Title:', jobPosting.title);
  console.log('  Company:', jobPosting.hiringOrganization?.name);
  console.log('  Date Posted (ISO):', jobPosting.datePosted);
  console.log('  Description length:', jobPosting.description?.length || 0);

  // Calculate posting age
  if (jobPosting.datePosted) {
    const postedDateObj = new Date(jobPosting.datePosted);
    const now = new Date();
    const diffMs = now - postedDateObj;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let postedDate;
    if (diffDays === 0) {
      postedDate = 'Posted today';
    } else if (diffDays === 1) {
      postedDate = 'Posted 1 day ago';
    } else {
      postedDate = `Posted ${diffDays} days ago`;
    }

    console.log('  Posting Age:', diffDays, 'days');
    console.log('  Formatted:', postedDate);
  }
} else {
  console.error('❌ No JobPosting data found!');
}

// Test 3: Test parsePostingAge function
console.log('\n[TEST 3] Testing parsePostingAge Function');
console.log('-'.repeat(40));

// Copy the function from popup-v2.js
function parsePostingAge(dateString) {
  if (!dateString) {
    console.log('[Scanner Debug] parsePostingAge: No date string provided');
    return null;
  }

  const normalized = dateString.toLowerCase().trim();
  console.log('[Scanner Debug] parsePostingAge: Input:', dateString, '-> Normalized:', normalized);

  // Handle various formats
  if (/just now|moments? ago|posted today/i.test(normalized)) {
    console.log('[Scanner Debug] parsePostingAge: Matched "just now/today" -> 0 days');
    return 0;
  }

  if (/yesterday/i.test(normalized)) {
    console.log('[Scanner Debug] parsePostingAge: Matched "yesterday" -> 1 day');
    return 1;
  }

  let match;

  // Match "X minutes ago" or "Posted X minutes ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*minutes?\s*ago/i))) {
    console.log('[Scanner Debug] parsePostingAge: Matched minutes ->', match[1], '-> 0 days');
    return 0;
  }

  // Match "X hours ago" or "Posted X hours ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*hours?\s*ago/i))) {
    console.log('[Scanner Debug] parsePostingAge: Matched hours ->', match[1], '-> 0 days');
    return 0;
  }

  // Match "X days ago" or "Posted X days ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*days?\s*ago/i))) {
    const days = parseInt(match[1]);
    console.log('[Scanner Debug] parsePostingAge: Matched days ->', match[1], '-> Days:', days);
    return days;
  }

  // Match "X weeks ago" or "Posted X weeks ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*weeks?\s*ago/i))) {
    const days = parseInt(match[1]) * 7;
    console.log('[Scanner Debug] parsePostingAge: Matched weeks ->', match[1], '-> Days:', days);
    return days;
  }

  // Match "X months ago" or "Posted X months ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*months?\s*ago/i))) {
    const days = parseInt(match[1]) * 30;
    console.log('[Scanner Debug] parsePostingAge: Matched months ->', match[1], '-> Days:', days);
    return days;
  }

  // Match "30+ days ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\+\s*days?\s*ago/i))) {
    const days = parseInt(match[1]);
    console.log('[Scanner Debug] parsePostingAge: Matched days+ ->', match[1], '-> Days:', days);
    return days;
  }

  console.log('[Scanner Debug] parsePostingAge: No pattern matched, returning null');
  return null;
}

// Test with current job data
if (extensionLoaded && window.currentJobData && window.currentJobData.postedDate) {
  const testDate = window.currentJobData.postedDate;
  console.log('Testing with currentJobData.postedDate:', testDate);
  const parsedDays = parsePostingAge(testDate);
  console.log('Result:', parsedDays, 'days');

  if (parsedDays === null) {
    console.error('❌ parsePostingAge returned null! This will cause 0% posting age risk.');
  } else {
    console.log('✓ Successfully parsed posting age');
  }
} else if (jobPosting && jobPosting.datePosted) {
  // Generate the same format the content script would create
  const postedDateObj = new Date(jobPosting.datePosted);
  const now = new Date();
  const diffMs = now - postedDateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let postedDate;
  if (diffDays === 0) {
    postedDate = 'Posted today';
  } else if (diffDays === 1) {
    postedDate = 'Posted 1 day ago';
  } else {
    postedDate = `Posted ${diffDays} days ago`;
  }

  console.log('Testing with generated date:', postedDate);
  const parsedDays = parsePostingAge(postedDate);
  console.log('Result:', parsedDays, 'days');

  if (parsedDays === null) {
    console.error('❌ parsePostingAge returned null! This will cause 0% posting age risk.');
  } else if (parsedDays !== diffDays) {
    console.error(`❌ Mismatch! Expected ${diffDays} days but got ${parsedDays} days`);
  } else {
    console.log('✓ Successfully parsed posting age');
  }
}

// Test 4: Calculate posting age risk
console.log('\n[TEST 4] Posting Age Risk Calculation');
console.log('-'.repeat(40));

function calculatePostingAgeRisk(daysPosted) {
  if (daysPosted === null || daysPosted === undefined) {
    return 0;
  }

  if (daysPosted <= 3) return 0;
  if (daysPosted <= 7) return 5;
  if (daysPosted <= 14) return 15;
  if (daysPosted <= 21) return 30;
  if (daysPosted <= 30) return 45;
  if (daysPosted <= 45) return 60;
  if (daysPosted <= 60) return 75;
  if (daysPosted <= 90) return 85;
  return 95; // > 90 days
}

if (jobPosting && jobPosting.datePosted) {
  const postedDateObj = new Date(jobPosting.datePosted);
  const now = new Date();
  const diffMs = now - postedDateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const risk = calculatePostingAgeRisk(diffDays);
  console.log('Days posted:', diffDays);
  console.log('Expected risk:', risk + '%');

  if (diffDays > 90 && risk !== 95) {
    console.error('❌ Risk calculation incorrect for old job!');
  } else {
    console.log('✓ Risk calculation correct');
  }
}

// Test 5: Check if description is present
console.log('\n[TEST 5] Job Description Check');
console.log('-'.repeat(40));

if (extensionLoaded && window.currentJobData) {
  const description = window.currentJobData.description;
  if (!description || description.length < 50) {
    console.warn('⚠️ WARNING: Job description is empty or too short!');
    console.warn('Description length:', description?.length || 0);
    console.warn('This will cause all content-based scam/spam scores to be 0%');
    console.warn('However, posting age detection should still work.');
  } else {
    console.log('✓ Description looks good, length:', description.length);
  }
}

if (jobPosting && jobPosting.description) {
  console.log('JSON-LD description length:', jobPosting.description.length);
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('DIAGNOSTIC SUMMARY');
console.log('='.repeat(80));

if (!extensionLoaded) {
  console.error('❌ CRITICAL: Extension not loaded');
  console.log('Action needed: Reload the extension or ensure it\'s installed');
} else if (!window.currentJobData || !window.currentJobData.postedDate) {
  console.error('❌ CRITICAL: Job data not extracted by extension');
  console.log('Action needed: Check content script (content-indeed-v3.js) is running');
} else {
  console.log('✓ Extension loaded and job data present');

  const testDate = window.currentJobData.postedDate;
  const parsedDays = parsePostingAge(testDate);

  if (parsedDays === null) {
    console.error('❌ CRITICAL: parsePostingAge failed to parse date');
    console.log('Problematic date string:', testDate);
    console.log('Action needed: Update parsePostingAge function in popup-v2.js');
  } else {
    console.log('✓ Posting age parsing works correctly');

    const risk = calculatePostingAgeRisk(parsedDays);
    console.log('Expected scanner results:');
    console.log('  Posting Age:', parsedDays, 'days');
    console.log('  Posting Age Risk:', risk + '%');

    if (risk === 0) {
      console.warn('⚠️ Job is very fresh (0-3 days), so 0% risk is expected');
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('END OF DIAGNOSTIC TEST');
console.log('='.repeat(80));
