/**
 * Platform-Specific Ghost Detection
 *
 * Detection logic tailored for specific job platforms:
 * - LinkedIn
 * - Indeed
 * - Google Jobs
 * - Glassdoor
 */

// Platform adapters
export { LinkedInAdapter, linkedInAdapter } from './linkedin-adapter.js';
export { IndeedAdapter, indeedAdapter } from './indeed-adapter.js';

// Main content script entry point
// Note: ghost-detection-content.js is the main entry point and handles
// initialization and detection flow
