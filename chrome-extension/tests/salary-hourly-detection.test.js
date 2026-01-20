/**
 * Test file for salary and hourly rate detection patterns
 * Tests that jobs with hourly rates are correctly detected when "hide jobs without salary info" is checked
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

// Test cases
describe('Salary and Hourly Rate Detection', () => {
  describe('Hourly rate formats (should ALL be detected)', () => {
    const hourlyFormats = [
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

    hourlyFormats.forEach(format => {
      test(`should detect: "${format}"`, () => {
        expect(hasSalaryOrHourlyPattern(format.toLowerCase())).toBe(true);
      });
    });
  });

  describe('Annual salary formats (should be detected)', () => {
    const salaryFormats = [
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

    salaryFormats.forEach(format => {
      test(`should detect: "${format}"`, () => {
        expect(hasSalaryOrHourlyPattern(format.toLowerCase())).toBe(true);
      });
    });
  });

  describe('No salary info (should NOT be detected)', () => {
    const noSalaryFormats = [
      'Software Engineer',
      'Full-time position',
      'Great benefits',
      'Competitive compensation', // Note: this mentions "compensation" but no actual amount
      'Remote work available',
      'Entry level',
    ];

    noSalaryFormats.forEach(format => {
      test(`should NOT detect salary in: "${format}"`, () => {
        expect(hasSalaryOrHourlyPattern(format.toLowerCase())).toBe(false);
      });
    });
  });
});

// Run tests directly (no Jest required)
if (true) {
  console.log('Running salary/hourly detection tests...\n');

  const hourlyTestCases = [
    '$20/hr',
    '$20/hour',
    '$18.50/hr',
    '$20 an hour',
    '$20 per hour',
    '$18 - $22 an hour',
    '$18-$22/hr',
    '$20 hourly',
    'Estimated $18-$22 an hour',
    '$15.00 - $18.00 per hour',
  ];

  console.log('Hourly rate tests:');
  hourlyTestCases.forEach(testCase => {
    const result = hasSalaryOrHourlyPattern(testCase.toLowerCase());
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}: "${testCase}"`);
  });

  const noSalaryCases = [
    'Software Engineer',
    'Full-time position',
    'Great benefits',
  ];

  console.log('\nNo salary info tests (should return false):');
  noSalaryCases.forEach(testCase => {
    const result = hasSalaryOrHourlyPattern(testCase.toLowerCase());
    const status = !result ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}: "${testCase}"`);
  });
}
