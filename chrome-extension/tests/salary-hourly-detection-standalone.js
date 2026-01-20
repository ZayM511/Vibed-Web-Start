/**
 * Standalone test for salary and hourly rate detection patterns
 * Run with: node salary-hourly-detection-standalone.js
 */

// Simulate the hasSalaryOrHourlyPattern function from content-indeed-v3.js
function hasSalaryOrHourlyPattern(text) {
  if (!text) return false;

  // Explicit hourly rate patterns - these should ALWAYS be detected
  const hourlyPatterns = [
    /\$[\d,.]+\s*(?:\/|-|–|per|an|a)\s*(?:hr|hour)/i,
    /\$[\d,.]+\s*[-–]\s*\$?[\d,.]+\s*(?:\/|-|per|an|a)\s*(?:hr|hour)/i,
    /\$[\d,.]+\s*hourly/i,
    /\$[\d,.]+\s*[-–]\s*\$?[\d,.]+\s*hourly/i,
    /hourly\s*[:.]?\s*\$[\d,.]+/i,
    /(?:estimated|est\.?)\s*\$[\d,.]+\s*[-–]?\s*\$?[\d,.]*\s*(?:\/|-|per|an|a)?\s*(?:hr|hour|hourly)?/i,
  ];

  for (const pattern of hourlyPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // General salary patterns
  const salaryPatterns = [
    /\$[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*\/?\s*(?:yr|year|annually|annual|month|mo|week|wk))/i,
    /\$[\d,]+k\s*[-–]?\s*\$?\d*k?/i,
    /(?:salary|pay|compensation)\s*[:.]?\s*\$[\d,]+/i,
    /\bfrom\s+\$[\d,]+/i,
    /\bup\s+to\s+\$[\d,]+/i,
    /\$[\d,]+\s*[-–]\s*\$[\d,]+\s*(?:a\s+)?year/i,
    /\d+k\s*[-–]\s*\d+k/i,
  ];

  for (const pattern of salaryPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Simple presence check for common salary indicators
  const simpleIndicators = [
    /\$[\d,]+\s*[-–]\s*\$[\d,]+/,
    /\/yr\b/i,
    /\/hr\b/i,
    /per\s+hour/i,
    /an\s+hour/i,
    /a\s+hour/i,
    /per\s+year/i,
    /a\s+year/i,
    /\bhourly\b/i,
    /\bannually\b/i,
  ];

  for (const pattern of simpleIndicators) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

// Test runner
console.log('='.repeat(60));
console.log('Salary/Hourly Rate Detection Pattern Tests');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;

// Hourly rate tests (should all return TRUE)
console.log('HOURLY RATE FORMATS (should be detected):');
const hourlyTestCases = [
  '$20/hr',
  '$20/hour',
  '$18.50/hr',
  '$18.50/hour',
  '$20 an hour',
  '$20 per hour',
  '$18 - $22 an hour',
  '$18-$22/hr',
  '$18 - $22 per hour',
  '$20 hourly',
  '$18-$22 hourly',
  'hourly: $20',
  'hourly $18',
  'Estimated $18-$22 an hour',
  'Est. $20/hr',
  '$15.00 - $18.00 per hour',
  '$22.50 an hour',
  '$17-$21 an hour',
];

hourlyTestCases.forEach(testCase => {
  const result = hasSalaryOrHourlyPattern(testCase.toLowerCase());
  const status = result ? '✅' : '❌';
  if (result) {
    passed++;
  } else {
    failed++;
  }
  console.log(`  ${status} "${testCase}"`);
});

// Annual salary tests (should all return TRUE)
console.log('\nANNUAL SALARY FORMATS (should be detected):');
const salaryTestCases = [
  '$50,000/yr',
  '$50,000 a year',
  '$50,000 - $70,000 a year',
  '$50k-$60k',
  '50k-60k',
  'salary: $50,000',
  'from $50,000',
  'up to $100,000',
  '$80,000/year',
  '$70,000 annually',
];

salaryTestCases.forEach(testCase => {
  const result = hasSalaryOrHourlyPattern(testCase.toLowerCase());
  const status = result ? '✅' : '❌';
  if (result) {
    passed++;
  } else {
    failed++;
  }
  console.log(`  ${status} "${testCase}"`);
});

// No salary tests (should all return FALSE)
console.log('\nNO SALARY INFO (should NOT be detected):');
const noSalaryTestCases = [
  'Software Engineer',
  'Full-time position',
  'Great benefits',
  'Remote work available',
  'Entry level',
  'Join our team',
];

noSalaryTestCases.forEach(testCase => {
  const result = hasSalaryOrHourlyPattern(testCase.toLowerCase());
  const status = !result ? '✅' : '❌';
  if (!result) {
    passed++;
  } else {
    failed++;
  }
  console.log(`  ${status} "${testCase}" → ${result ? 'DETECTED (wrong)' : 'NOT DETECTED (correct)'}`);
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
