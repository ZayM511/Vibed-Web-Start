/**
 * JobFiltr Website Content Script
 *
 * This script runs on jobfiltr.app pages to indicate that the extension is installed.
 * The website checks for this flag to show Sign In/Sign Up buttons to extension users
 * even when waitlist mode is active.
 */

// Set flag indicating the JobFiltr extension is installed
try {
  localStorage.setItem('jobfiltr_extension_installed', 'true');
  console.log('[JobFiltr] Extension detected - website features unlocked');
} catch (e) {
  // localStorage might be blocked in some contexts
  console.warn('[JobFiltr] Could not set extension flag:', e);
}
