/**
 * OAuth Configuration Validation Script for JobFiltr Chrome Extension
 *
 * This script validates that the Google OAuth configuration is correctly set up.
 * Run these tests to ensure the "Continue with Google" button will work properly.
 *
 * To test manually:
 * 1. Load the extension in Chrome (chrome://extensions -> Developer mode -> Load unpacked)
 * 2. Open the extension popup
 * 3. Open DevTools (right-click popup -> Inspect)
 * 4. Run these tests in the console
 */

const OAuthTests = {
  results: [],

  log(test, passed, message) {
    const result = { test, passed, message };
    this.results.push(result);
    console.log(`${passed ? '✅' : '❌'} ${test}: ${message}`);
    return passed;
  },

  // Test 1: Check if identity permission is in manifest
  testIdentityPermission() {
    const manifest = chrome.runtime.getManifest();
    const hasIdentity = manifest.permissions?.includes('identity');
    return this.log(
      'Identity Permission',
      hasIdentity,
      hasIdentity ? 'identity permission is present' : 'MISSING: identity permission not found in manifest'
    );
  },

  // Test 2: Check if oauth2 configuration exists
  testOAuth2Config() {
    const manifest = chrome.runtime.getManifest();
    const hasOAuth2 = !!manifest.oauth2;
    return this.log(
      'OAuth2 Config',
      hasOAuth2,
      hasOAuth2 ? 'oauth2 configuration found' : 'MISSING: oauth2 configuration not in manifest'
    );
  },

  // Test 3: Check if client_id is configured (not placeholder)
  testClientId() {
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id;
    const isConfigured = clientId &&
                         clientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' &&
                         clientId.includes('.apps.googleusercontent.com');
    return this.log(
      'Client ID',
      isConfigured,
      isConfigured
        ? `Client ID configured: ${clientId.substring(0, 20)}...`
        : 'NOT CONFIGURED: Please add your Google OAuth client_id to manifest.json'
    );
  },

  // Test 4: Check if scopes are configured
  testScopes() {
    const manifest = chrome.runtime.getManifest();
    const scopes = manifest.oauth2?.scopes;
    const hasRequiredScopes = scopes &&
                              scopes.includes('email') &&
                              scopes.includes('profile');
    return this.log(
      'OAuth Scopes',
      hasRequiredScopes,
      hasRequiredScopes
        ? `Scopes configured: ${scopes.join(', ')}`
        : 'MISSING: Required scopes (email, profile) not configured'
    );
  },

  // Test 5: Check if Google API host permissions are present
  testHostPermissions() {
    const manifest = chrome.runtime.getManifest();
    const hasGoogleApis = manifest.host_permissions?.some(p =>
      p.includes('googleapis.com') || p.includes('accounts.google.com')
    );
    return this.log(
      'Google API Permissions',
      hasGoogleApis,
      hasGoogleApis
        ? 'Google API host permissions configured'
        : 'MISSING: Add https://www.googleapis.com/* and https://accounts.google.com/* to host_permissions'
    );
  },

  // Test 6: Check if chrome.identity API is available
  testIdentityAPI() {
    const hasIdentityAPI = typeof chrome.identity !== 'undefined' &&
                           typeof chrome.identity.launchWebAuthFlow === 'function';
    return this.log(
      'Identity API',
      hasIdentityAPI,
      hasIdentityAPI
        ? 'chrome.identity API is available'
        : 'NOT AVAILABLE: chrome.identity API not accessible'
    );
  },

  // Test 7: Check redirect URL generation
  testRedirectURL() {
    try {
      const redirectUrl = chrome.identity.getRedirectURL();
      const isValid = redirectUrl && redirectUrl.includes('chromiumapp.org');
      return this.log(
        'Redirect URL',
        isValid,
        isValid
          ? `Redirect URL: ${redirectUrl}`
          : 'INVALID: Could not generate valid redirect URL'
      );
    } catch (e) {
      return this.log('Redirect URL', false, `ERROR: ${e.message}`);
    }
  },

  // Test 8: Check Google sign-in button exists
  testGoogleButton() {
    const button = document.getElementById('googleSignInBtn');
    const exists = !!button;
    return this.log(
      'Google Sign-In Button',
      exists,
      exists
        ? 'Google sign-in button found in DOM'
        : 'NOT FOUND: googleSignInBtn element not in DOM'
    );
  },

  // Run all tests
  async runAll() {
    console.log('\n========================================');
    console.log('JobFiltr OAuth Configuration Validation');
    console.log('========================================\n');

    this.results = [];

    this.testIdentityPermission();
    this.testOAuth2Config();
    this.testClientId();
    this.testScopes();
    this.testHostPermissions();
    this.testIdentityAPI();
    this.testRedirectURL();
    this.testGoogleButton();

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    console.log('\n========================================');
    console.log(`Results: ${passed}/${total} tests passed`);
    console.log('========================================\n');

    if (passed === total) {
      console.log('🎉 All tests passed! OAuth is correctly configured.');
      console.log('\nNext steps:');
      console.log('1. Make sure your OAuth client_id is from a valid Google Cloud Console project');
      console.log('2. Add the redirect URL shown above to your Google Cloud Console authorized redirect URIs');
      console.log('3. Test the "Continue with Google" button');
    } else {
      console.log('⚠️ Some tests failed. Please fix the issues above before testing OAuth.');

      const clientIdTest = this.results.find(r => r.test === 'Client ID');
      if (!clientIdTest?.passed) {
        console.log('\n📋 To configure Google OAuth:');
        console.log('1. Go to https://console.cloud.google.com/');
        console.log('2. Create or select a project');
        console.log('3. Go to APIs & Services > Credentials');
        console.log('4. Create an OAuth 2.0 Client ID (type: Chrome Extension)');
        console.log('5. Copy the Client ID and add it to manifest.json oauth2.client_id');
        console.log('6. Add the redirect URI to authorized redirect URIs in Google Cloud Console');
      }
    }

    return { passed, total, results: this.results };
  }
};

// Export for use
if (typeof window !== 'undefined') {
  window.OAuthTests = OAuthTests;
}

// Auto-run if loaded as script
if (typeof document !== 'undefined') {
  console.log('OAuth validation tests loaded. Run OAuthTests.runAll() to validate.');
}
