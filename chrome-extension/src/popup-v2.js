// JobFiltr Chrome Extension - Popup Script
// Handles tab switching, filters, scanner functionality, and panel mode

// ===== THEME MANAGEMENT =====
function initTheme() {
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme) {
      setTheme(result.theme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  chrome.storage.local.set({ theme });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Initialize theme immediately to prevent flash
initTheme();

// Theme toggle button
document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

// ===== AUTHENTICATION =====
let currentUser = null;

// Check auth state on load
async function checkAuthState() {
  try {
    const { authToken, userEmail, userName, authExpiry } = await chrome.storage.local.get(['authToken', 'userEmail', 'userName', 'authExpiry']);

    // Check if token exists and hasn't expired
    if (authToken && authExpiry && Date.now() < authExpiry) {
      currentUser = { email: userEmail, name: userName, token: authToken };
      showAuthenticatedUI();
      return true;
    } else {
      // Clear expired auth
      await chrome.storage.local.remove(['authToken', 'userEmail', 'userName', 'authExpiry']);
      currentUser = null;
      showAuthOverlay();
      return false;
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    showAuthOverlay();
    return false;
  }
}

function showAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  const userMenu = document.getElementById('userMenu');

  if (overlay) overlay.classList.remove('hidden');
  if (userMenu) userMenu.classList.add('hidden');
}

function hideAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function showAuthenticatedUI(showAnimation = false) {
  const userMenu = document.getElementById('userMenu');
  const userGreeting = document.getElementById('userGreeting');
  const userEmail = document.getElementById('userEmail');

  if (userMenu) userMenu.classList.remove('hidden');
  if (currentUser) {
    // Set greeting with name if available
    if (userGreeting) {
      const greetingText = currentUser.name ? `Hi ${currentUser.name}!` : 'Hi there!';
      userGreeting.textContent = greetingText;

      // Auto-adjust font size based on name length
      userGreeting.classList.remove('text-sm', 'text-xs');
      if (greetingText.length > 20) {
        userGreeting.classList.add('text-xs');
      } else if (greetingText.length > 14) {
        userGreeting.classList.add('text-sm');
      }
    }
    // Always show email
    if (userEmail) {
      userEmail.textContent = currentUser.email;
    }
  }

  if (showAnimation) {
    // Show success animation first
    showSuccessAnimation(() => {
      hideAuthOverlay();
      // Trigger notification on content scripts
      triggerJobFiltrActiveNotification();
    });
  } else {
    hideAuthOverlay();
  }
}

// Show success animation overlay
function showSuccessAnimation(callback) {
  const successOverlay = document.getElementById('authSuccessOverlay');
  const authOverlay = document.getElementById('authOverlay');

  if (!successOverlay) {
    if (callback) callback();
    return;
  }

  // Hide auth overlay immediately
  if (authOverlay) authOverlay.classList.add('hidden');

  // Show success overlay
  successOverlay.classList.remove('hidden');

  // After 2 seconds, fade out and transition to main app
  setTimeout(() => {
    successOverlay.classList.add('fade-out');

    // After fade out completes, hide overlay and call callback
    setTimeout(() => {
      successOverlay.classList.add('hidden');
      successOverlay.classList.remove('fade-out');
      if (callback) callback();
    }, 400); // Match CSS transition duration
  }, 2000);
}

// Trigger JobFiltr Active notification on content scripts
async function triggerJobFiltrActiveNotification() {
  try {
    // Get the active tab and send message to show notification
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: 'JobFiltr Is Active'
      }).catch(() => {
        // Tab might not have content script, that's ok
        console.log('JobFiltr: No content script on this tab');
      });
    }
  } catch (error) {
    console.log('JobFiltr: Could not send notification to tab', error);
  }
}

function showAuthError(message, isCreateForm = false) {
  const errorEl = document.getElementById(isCreateForm ? 'createAuthError' : 'authError');
  const errorText = document.getElementById(isCreateForm ? 'createAuthErrorText' : 'authErrorText');

  if (errorEl && errorText) {
    errorText.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function hideAuthError(isCreateForm = false) {
  const errorEl = document.getElementById(isCreateForm ? 'createAuthError' : 'authError');
  if (errorEl) errorEl.classList.add('hidden');
}

// Email/Password Sign In
async function signInWithEmail() {
  const email = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPassword')?.value;

  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAuthError('Please enter a valid email address');
    return;
  }

  hideAuthError();

  const signInBtn = document.getElementById('signInBtn');
  const originalHTML = signInBtn.innerHTML;
  signInBtn.innerHTML = '<span>Signing in...</span>';
  signInBtn.disabled = true;

  try {
    // Call backend API for authentication
    const response = await fetch('https://reminiscent-goldfish-690.convex.cloud/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Sign in failed' }));
      throw new Error(error.message || 'Invalid email or password');
    }

    const data = await response.json();

    // Store auth token with 30-day expiry (or until browser restart for session)
    const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    await chrome.storage.local.set({
      authToken: data.token,
      userEmail: email,
      authExpiry: expiry
    });

    currentUser = { email, token: data.token };
    await resetFiltersToDefault(); // Reset filters on sign-in
    showAuthenticatedUI(true); // Show success animation

  } catch (error) {
    console.error('Sign in error:', error);
    showAuthError(error.message || 'Sign in failed. Please try again.');
  } finally {
    signInBtn.innerHTML = originalHTML;
    signInBtn.disabled = false;
  }
}

// Google OAuth Sign In
async function signInWithGoogle() {
  const googleBtn = document.getElementById('googleSignInBtn');
  const originalHTML = googleBtn.innerHTML;

  try {
    googleBtn.innerHTML = '<span>Connecting...</span>';
    googleBtn.disabled = true;

    // Get OAuth config from manifest
    const manifest = chrome.runtime.getManifest();
    const oauth2Config = manifest.oauth2;

    if (!oauth2Config || !oauth2Config.client_id || oauth2Config.client_id === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      throw new Error('Google OAuth not configured. Please set up OAuth credentials in manifest.json.');
    }

    const clientId = oauth2Config.client_id;
    const scopes = oauth2Config.scopes || ['openid', 'email', 'profile'];

    // Use chrome.identity for Google OAuth
    const redirectUri = chrome.identity.getRedirectURL();
    console.log('JobFiltr: OAuth redirect URI:', redirectUri);

    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('prompt', 'select_account');

    console.log('JobFiltr: Launching OAuth flow...');

    // Launch OAuth flow
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('JobFiltr: OAuth error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error('No response from Google. User may have cancelled.'));
          } else {
            console.log('JobFiltr: OAuth response received');
            resolve(response);
          }
        }
      );
    });

    // Extract token from response URL
    const url = new URL(responseUrl);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (!accessToken) {
      const errorMsg = hashParams.get('error') || 'Failed to get access token';
      throw new Error(errorMsg);
    }

    console.log('JobFiltr: Got access token, fetching user info...');

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    const userInfo = await userInfoResponse.json();
    console.log('JobFiltr: Got user info for:', userInfo.email);

    // Try to exchange Google token for our backend token
    let backendToken = null;
    try {
      const backendResponse = await fetch('https://reminiscent-goldfish-690.convex.cloud/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleToken: accessToken,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        })
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        backendToken = data.token;
      }
    } catch (backendError) {
      console.warn('JobFiltr: Backend auth not available, using Google token directly');
    }

    // Store auth (use Google token if backend not available)
    const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
    await chrome.storage.local.set({
      authToken: backendToken || accessToken,
      userEmail: userInfo.email,
      userName: userInfo.name,
      userPicture: userInfo.picture,
      authExpiry: expiry,
      authProvider: 'google'
    });

    currentUser = { email: userInfo.email, token: backendToken || accessToken };
    await resetFiltersToDefault(); // Reset filters on sign-in
    showAuthenticatedUI(true); // Show success animation

    console.log('JobFiltr: Google sign in successful');

  } catch (error) {
    console.error('JobFiltr: Google sign in error:', error);

    // Provide more specific error messages
    let errorMessage = 'Google sign in failed. ';
    if (error.message.includes('not configured')) {
      errorMessage = error.message;
    } else if (error.message.includes('cancelled') || error.message.includes('closed')) {
      errorMessage = 'Sign in was cancelled.';
    } else if (error.message.includes('access_denied')) {
      errorMessage = 'Access was denied. Please try again.';
    } else if (error.message.includes('popup_closed')) {
      errorMessage = 'Sign in window was closed.';
    } else {
      errorMessage += 'Please try again.';
    }

    showAuthError(errorMessage);
  } finally {
    googleBtn.innerHTML = originalHTML;
    googleBtn.disabled = false;
  }
}

// Create Account
async function createAccount() {
  const name = document.getElementById('createName')?.value.trim();
  const email = document.getElementById('createEmail')?.value.trim();
  const password = document.getElementById('createPassword')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;

  if (!email || !password || !confirmPassword) {
    showAuthError('Please fill in all fields', true);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAuthError('Please enter a valid email address', true);
    return;
  }

  if (password.length < 8) {
    showAuthError('Password must be at least 8 characters', true);
    return;
  }

  if (password !== confirmPassword) {
    showAuthError('Passwords do not match', true);
    return;
  }

  hideAuthError(true);

  const createBtn = document.getElementById('createAccountBtn');
  const originalHTML = createBtn.innerHTML;
  createBtn.innerHTML = '<span>Creating account...</span>';
  createBtn.disabled = true;

  try {
    const response = await fetch('https://reminiscent-goldfish-690.convex.cloud/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Account creation failed' }));
      throw new Error(error.message || 'Failed to create account');
    }

    const data = await response.json();

    const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
    await chrome.storage.local.set({
      authToken: data.token,
      userEmail: email,
      userName: name || '',
      authExpiry: expiry
    });

    currentUser = { email, name, token: data.token };
    await resetFiltersToDefault(); // Reset filters on sign-up
    showAuthenticatedUI(true); // Show success animation

  } catch (error) {
    console.error('Create account error:', error);
    showAuthError(error.message || 'Failed to create account. Please try again.', true);
  } finally {
    createBtn.innerHTML = originalHTML;
    createBtn.disabled = false;
  }
}

// Sign Out
async function signOut() {
  try {
    await chrome.storage.local.remove(['authToken', 'userEmail', 'userName', 'authExpiry']);
    currentUser = null;

    // Clear form fields
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const nameInput = document.getElementById('createName');
    const createEmailInput = document.getElementById('createEmail');
    const createPasswordInput = document.getElementById('createPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (nameInput) nameInput.value = '';
    if (createEmailInput) createEmailInput.value = '';
    if (createPasswordInput) createPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';

    // Close dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    showAuthOverlay();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

// Toggle between sign in and create account forms
function showSignInForm() {
  document.getElementById('signInForm')?.classList.remove('hidden');
  document.getElementById('createAccountForm')?.classList.add('hidden');
  document.querySelector('.auth-divider')?.classList.remove('hidden');
  document.getElementById('googleSignInBtn')?.classList.remove('hidden');
  document.querySelector('#authSwitchToSignUp')?.parentElement?.classList.remove('hidden');
  document.getElementById('authSwitchToSignInFooter').style.display = 'none';
  hideAuthError();
  hideAuthError(true);
}

function showCreateAccountForm() {
  document.getElementById('signInForm')?.classList.add('hidden');
  document.getElementById('createAccountForm')?.classList.remove('hidden');
  document.querySelector('.auth-divider')?.classList.add('hidden');
  document.getElementById('googleSignInBtn')?.classList.add('hidden');
  document.querySelector('#authSwitchToSignUp')?.parentElement?.classList.add('hidden');
  document.getElementById('authSwitchToSignInFooter').style.display = 'block';
  hideAuthError();
  hideAuthError(true);
}

// Auth event listeners
document.getElementById('signInBtn')?.addEventListener('click', signInWithEmail);
document.getElementById('googleSignInBtn')?.addEventListener('click', signInWithGoogle);
document.getElementById('createAccountBtn')?.addEventListener('click', createAccount);
document.getElementById('signOutBtn')?.addEventListener('click', signOut);

document.querySelector('#authSwitchToSignUp button')?.addEventListener('click', showCreateAccountForm);
document.querySelector('#authSwitchToSignIn button')?.addEventListener('click', showSignInForm);

// Password visibility toggle
document.getElementById('togglePassword')?.addEventListener('click', () => {
  const passwordInput = document.getElementById('authPassword');
  const eyeOpen = document.querySelector('.eye-open');
  const eyeClosed = document.querySelector('.eye-closed');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeOpen.classList.add('hidden');
    eyeClosed.classList.remove('hidden');
  } else {
    passwordInput.type = 'password';
    eyeOpen.classList.remove('hidden');
    eyeClosed.classList.add('hidden');
  }
});

// User dropdown toggle
document.getElementById('userBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const userMenu = document.getElementById('userMenu');
  const dropdown = document.getElementById('userDropdown');
  if (userMenu && !userMenu.contains(e.target)) {
    dropdown?.classList.add('hidden');
  }
});

// Enter key support for forms
document.getElementById('authEmail')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('authPassword')?.focus();
});

document.getElementById('authPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') signInWithEmail();
});

document.getElementById('createName')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('createEmail')?.focus();
});

document.getElementById('createEmail')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('createPassword')?.focus();
});

document.getElementById('createPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('confirmPassword')?.focus();
});

document.getElementById('confirmPassword')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') createAccount();
});

// Check auth on load
checkAuthState();

// ===== PANEL MODE DETECTION & MANAGEMENT =====
let isPanelMode = false;
let currentDockSide = null;
let panelWindowId = null;

function detectPanelMode() {
  const urlParams = new URLSearchParams(window.location.search);
  isPanelMode = urlParams.get('mode') === 'panel';
  currentDockSide = urlParams.get('dock') || 'left';

  if (isPanelMode) {
    document.body.classList.add('panel-mode');
    document.body.classList.add(`docked-${currentDockSide}`);
    document.getElementById('unpinBtn').style.display = 'flex';
    initDragHandle();
    initPanelModeListeners(); // Set up tab/window change listeners
  }

  return isPanelMode;
}

// Set up listeners for tab/window changes in panel mode
function initPanelModeListeners() {
  // Listen for tab activation changes
  chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('Tab activated:', activeInfo);
    // Re-detect the site when user switches tabs
    detectCurrentSite();
  });

  // Listen for tab URL changes (navigation)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
      console.log('Tab updated:', tabId, changeInfo);
      // Re-detect when a tab finishes loading or URL changes
      detectCurrentSite();
    }
  });

  // Listen for window focus changes
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      console.log('Window focus changed:', windowId);
      // Small delay to let Chrome update the active tab
      setTimeout(() => {
        detectCurrentSite();
      }, 100);
    }
  });

  // Periodically refresh detection (backup in case listeners miss something)
  setInterval(() => {
    detectCurrentSite();
  }, 3000);
}

// Pin to left side
document.getElementById('pinLeftBtn').addEventListener('click', async () => {
  if (isPanelMode) {
    // Already in panel mode, switch to left dock
    await chrome.runtime.sendMessage({
      action: 'repositionPanel',
      dock: 'left'
    });
    document.body.classList.remove('docked-right');
    document.body.classList.add('docked-left');
    currentDockSide = 'left';
  } else {
    // Open as panel window docked to left
    await chrome.runtime.sendMessage({
      action: 'openPanel',
      dock: 'left'
    });
    window.close(); // Close popup
  }
});

// Pin to right side
document.getElementById('pinRightBtn').addEventListener('click', async () => {
  if (isPanelMode) {
    // Already in panel mode, switch to right dock
    await chrome.runtime.sendMessage({
      action: 'repositionPanel',
      dock: 'right'
    });
    document.body.classList.remove('docked-left');
    document.body.classList.add('docked-right');
    currentDockSide = 'right';
  } else {
    // Open as panel window docked to right
    await chrome.runtime.sendMessage({
      action: 'openPanel',
      dock: 'right'
    });
    window.close(); // Close popup
  }
});

// Unpin button (only visible in panel mode)
document.getElementById('unpinBtn').addEventListener('click', async () => {
  if (isPanelMode) {
    // Close the panel window
    await chrome.runtime.sendMessage({
      action: 'closePanel'
    });
  }
});

// ===== DRAG FUNCTIONALITY =====
let isDragging = false;
let dragStartX = 0;
let windowStartLeft = 0;

function initDragHandle() {
  const dragHandle = document.getElementById('dragHandle');

  dragHandle.addEventListener('mousedown', async (e) => {
    isDragging = true;
    dragStartX = e.screenX;

    // Get current window position
    const windowInfo = await chrome.runtime.sendMessage({ action: 'getWindowInfo' });
    if (windowInfo) {
      windowStartLeft = windowInfo.left;
    }

    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', async (e) => {
    if (!isDragging) return;

    const deltaX = e.screenX - dragStartX;
    const newLeft = windowStartLeft + deltaX;

    // Update window position
    await chrome.runtime.sendMessage({
      action: 'movePanel',
      left: newLeft
    });
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';

      // Update dock state based on final position
      updateDockStateFromPosition();
    }
  });

  // Also make header draggable (dead space)
  const header = document.querySelector('.header');
  header.addEventListener('mousedown', async (e) => {
    // Only drag if clicking on header background, not buttons
    if (e.target.closest('.pin-btn') || e.target.closest('.status-badge') || e.target.closest('.logo-section') || e.target.closest('.theme-toggle')) {
      return;
    }

    isDragging = true;
    dragStartX = e.screenX;

    const windowInfo = await chrome.runtime.sendMessage({ action: 'getWindowInfo' });
    if (windowInfo) {
      windowStartLeft = windowInfo.left;
    }

    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
}

async function updateDockStateFromPosition() {
  const windowInfo = await chrome.runtime.sendMessage({ action: 'getWindowInfo' });
  if (!windowInfo) return;

  // Get display info to find which monitor the panel is on
  const displayInfo = await chrome.runtime.sendMessage({ action: 'getDisplayForPosition', left: windowInfo.left });

  if (!displayInfo) {
    // Fallback to basic screen detection
    const screenWidth = window.screen.availWidth;
    const panelWidth = 380;
    const snapThreshold = 50;

    if (windowInfo.left < snapThreshold) {
      document.body.classList.remove('docked-right');
      document.body.classList.add('docked-left');
      currentDockSide = 'left';
      await chrome.runtime.sendMessage({ action: 'movePanel', left: 0 });
    } else if (windowInfo.left > screenWidth - panelWidth - snapThreshold) {
      document.body.classList.remove('docked-left');
      document.body.classList.add('docked-right');
      currentDockSide = 'right';
      await chrome.runtime.sendMessage({ action: 'movePanel', left: screenWidth - panelWidth });
    } else {
      document.body.classList.remove('docked-left', 'docked-right');
      currentDockSide = 'float';
    }
    return;
  }

  const { workArea } = displayInfo;
  const panelWidth = 380;
  const snapThreshold = 50;

  // Check if near left edge of THIS monitor
  if (windowInfo.left < workArea.left + snapThreshold) {
    document.body.classList.remove('docked-right');
    document.body.classList.add('docked-left');
    currentDockSide = 'left';
    // Snap to left edge of this monitor
    await chrome.runtime.sendMessage({ action: 'snapToEdge', dock: 'left' });
  }
  // Check if near right edge of THIS monitor
  else if (windowInfo.left > workArea.left + workArea.width - panelWidth - snapThreshold) {
    document.body.classList.remove('docked-left');
    document.body.classList.add('docked-right');
    currentDockSide = 'right';
    // Snap to right edge of this monitor
    await chrome.runtime.sendMessage({ action: 'snapToEdge', dock: 'right' });
  }
  // Floating in middle of this monitor
  else {
    document.body.classList.remove('docked-left', 'docked-right');
    currentDockSide = 'float';
  }
}

// ===== TAB SWITCHING =====
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;

    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Initialize tab-specific functionality
    if (tabName === 'filters') {
      initializeFilters();
    } else if (tabName === 'scanner') {
      initializeScanner();
    }
  });
});

// ===== SITE DETECTION =====
let currentSite = null;
let currentTabId = null; // Track the active job site tab ID

async function detectCurrentSite() {
  try {
    let tab;

    if (isPanelMode) {
      // In panel mode, we need to get the active tab from the last focused browser window
      // Ask background script to find it for us
      const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
      if (response && response.tab) {
        tab = response.tab;
      } else {
        // Fallback: query all windows for active tabs
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        // Filter out extension pages
        tab = tabs.find(t => t.url && !t.url.startsWith('chrome-extension://'));
        if (!tab && tabs.length > 0) {
          // Try to find any tab in a normal window
          const allTabs = await chrome.tabs.query({ active: true });
          tab = allTabs.find(t => t.url && !t.url.startsWith('chrome-extension://'));
        }
      }
    } else {
      // Normal popup mode - get active tab in current window
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    }

    if (!tab || !tab.url) {
      currentSite = null;
      updateSiteStatus(null);
      return null;
    }

    const url = tab.url;
    currentTabId = tab.id; // Store the tab ID for sending messages

    let site = null;
    if (url.includes('linkedin.com')) {
      site = 'linkedin';
    } else if (url.includes('indeed.com')) {
      site = 'indeed';
    } else if (url.includes('google.com') && url.includes('jobs')) {
      site = 'google-jobs';
    }

    currentSite = site;
    updateSiteStatus(site);

    // Enable/disable filters based on site
    const filtersContainer = document.getElementById('filtersContainer');
    const applyBtn = document.getElementById('applyFilters');

    if (site) {
      filtersContainer.style.opacity = '1';
      filtersContainer.style.pointerEvents = 'auto';
      applyBtn.disabled = false;
    } else {
      filtersContainer.style.opacity = '0.5';
      filtersContainer.style.pointerEvents = 'none';
      applyBtn.disabled = true;
    }

    return site;
  } catch (error) {
    console.error('Error detecting site:', error);
    return null;
  }
}

function updateSiteStatus(site) {
  const siteStatus = document.querySelector('.site-status');
  const currentSiteText = document.getElementById('currentSite');
  const pageIndicator = document.getElementById('pageIndicator');

  if (site) {
    siteStatus.classList.add('active');
    const siteNames = {
      'linkedin': 'LinkedIn',
      'indeed': 'Indeed',
      'google-jobs': 'Google Jobs'
    };
    currentSiteText.textContent = `Active on ${siteNames[site]}`;

    // Show page indicator for LinkedIn, request current page info
    if (site === 'linkedin') {
      requestPageInfo();
    } else {
      pageIndicator?.classList.add('hidden');
    }
  } else {
    siteStatus.classList.remove('active');
    currentSiteText.textContent = 'Not on a supported job site';
    pageIndicator?.classList.add('hidden');
  }
}

// ===== CONTENT SCRIPT INJECTION =====
// Inject content scripts programmatically when not loaded
async function injectContentScripts(tabId, site) {
  if (!tabId || !site) {
    console.warn('Cannot inject content scripts: missing tabId or site');
    return false;
  }

  try {
    // Determine which scripts to inject based on site
    let scripts = [];
    let cssFiles = ['styles/content.css'];

    if (site === 'linkedin') {
      scripts = ['src/content-linkedin-v3.js', 'src/ghost-detection-bundle.js'];
    } else if (site === 'indeed') {
      scripts = ['src/content-indeed-v3.js', 'src/ghost-detection-bundle.js'];
    } else if (site === 'google-jobs') {
      scripts = ['src/content-google-jobs.js'];
    } else {
      console.warn('Unknown site for content script injection:', site);
      return false;
    }

    console.log(`Injecting content scripts for ${site}:`, scripts);

    // Inject CSS first
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: cssFiles
    });

    // Inject JS scripts
    for (const script of scripts) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [script]
      });
    }

    // Wait a moment for scripts to initialize
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Content scripts injected successfully');
    return true;
  } catch (error) {
    console.error('Failed to inject content scripts:', error);
    return false;
  }
}

// Request current page info from content script
async function requestPageInfo() {
  try {
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' }, (response) => {
        if (chrome.runtime.lastError) {
          // Silently ignore - content script may not be loaded
          return;
        }
        if (response && response.page) {
          updatePageIndicator(response.page, response.hiddenCount);
        }
      });
    }
  } catch (error) {
    console.error('Error requesting page info:', error);
  }
}

// ===== FILTERS FUNCTIONALITY =====
let filterSettings = {};
let includeKeywords = [];
let excludeKeywords = [];

async function initializeFilters() {
  await detectCurrentSite();
  await loadFilterSettings();
  updateFilterStats();
}

async function loadFilterSettings() {
  try {
    const result = await chrome.storage.local.get('filterSettings');
    filterSettings = result.filterSettings || {};

    // Apply saved settings to UI
    document.getElementById('filterStaffing').checked = filterSettings.hideStaffing || false;
    document.getElementById('filterSponsored').checked = filterSettings.hideSponsored || false;
    document.getElementById('filterApplicants').checked = filterSettings.filterApplicants || false;
    document.getElementById('applicantRange').value = filterSettings.applicantRange || 'under10';
    document.getElementById('filterEntryLevel').checked = filterSettings.entryLevelAccuracy || false;

    // True Remote Accuracy settings
    document.getElementById('filterTrueRemote').checked = filterSettings.trueRemoteAccuracy || false;
    document.getElementById('excludeHybrid').checked = filterSettings.excludeHybrid !== false; // Default true
    document.getElementById('excludeOnsite').checked = filterSettings.excludeOnsite !== false; // Default true
    document.getElementById('excludeInOffice').checked = filterSettings.excludeInOffice !== false; // Default true
    document.getElementById('excludeInPerson').checked = filterSettings.excludeInPerson !== false; // Default true

    document.getElementById('filterIncludeKeywords').checked = filterSettings.filterIncludeKeywords || false;
    document.getElementById('filterExcludeKeywords').checked = filterSettings.filterExcludeKeywords || false;
    document.getElementById('filterSalary').checked = filterSettings.filterSalary || false;
    document.getElementById('minSalary').value = filterSettings.minSalary || '';
    document.getElementById('maxSalary').value = filterSettings.maxSalary || '';
    document.getElementById('filterActiveRecruiting').checked = filterSettings.showActiveRecruiting || false;
    document.getElementById('filterJobAge').checked = filterSettings.showJobAge || false;
    document.getElementById('filterApplied').checked = filterSettings.hideApplied || false;
    document.getElementById('filterVisa').checked = filterSettings.visaOnly || false;
    document.getElementById('filterEasyApply').checked = filterSettings.easyApplyOnly || false;

    // Benefits Indicator
    document.getElementById('showBenefitsIndicator').checked = filterSettings.showBenefitsIndicator || false;
    updateBenefitsLegend(filterSettings.showBenefitsIndicator || false);

    // Applicant Count Display
    document.getElementById('showApplicantCount').checked = filterSettings.showApplicantCount || false;

    // Job Posting Age Filter
    document.getElementById('filterPostingAge').checked = filterSettings.filterPostingAge || false;
    document.getElementById('postingAgeRange').value = filterSettings.postingAgeRange || '1w';

    // Load keywords
    includeKeywords = filterSettings.includeKeywords || [];
    excludeKeywords = filterSettings.excludeKeywords || [];
    renderKeywordChips();

  } catch (error) {
    console.error('Error loading filter settings:', error);
  }
}

// Reset all filters to default unchecked state (called after sign-in)
async function resetFiltersToDefault() {
  // Clear filter settings from storage
  filterSettings = {};
  await chrome.storage.local.set({ filterSettings: {} });

  // Reset all checkboxes to unchecked
  document.getElementById('filterStaffing').checked = false;
  document.getElementById('filterSponsored').checked = false;
  document.getElementById('filterApplicants').checked = false;
  document.getElementById('applicantRange').value = 'under10';
  document.getElementById('filterEntryLevel').checked = false;

  // True Remote Accuracy settings
  document.getElementById('filterTrueRemote').checked = false;
  document.getElementById('excludeHybrid').checked = true;
  document.getElementById('excludeOnsite').checked = true;
  document.getElementById('excludeInOffice').checked = true;
  document.getElementById('excludeInPerson').checked = true;

  document.getElementById('filterIncludeKeywords').checked = false;
  document.getElementById('filterExcludeKeywords').checked = false;
  document.getElementById('filterSalary').checked = false;
  document.getElementById('minSalary').value = '';
  document.getElementById('maxSalary').value = '';
  document.getElementById('filterActiveRecruiting').checked = false;
  document.getElementById('filterJobAge').checked = false;
  document.getElementById('filterApplied').checked = false;
  document.getElementById('filterVisa').checked = false;
  document.getElementById('filterEasyApply').checked = false;

  // Benefits Indicator
  document.getElementById('showBenefitsIndicator').checked = false;
  updateBenefitsLegend(false);

  // Applicant Count Display
  document.getElementById('showApplicantCount').checked = false;

  // Job Posting Age Filter
  document.getElementById('filterPostingAge').checked = false;
  document.getElementById('postingAgeRange').value = '1w';

  // Clear keywords
  includeKeywords = [];
  excludeKeywords = [];
  renderKeywordChips();

  // Update filter stats
  updateFilterStats();
}

// Benefits legend toggle
function updateBenefitsLegend(show) {
  const legend = document.getElementById('benefitsLegend');
  if (legend) {
    legend.classList.toggle('hidden', !show);
  }
}

document.getElementById('showBenefitsIndicator')?.addEventListener('change', (e) => {
  updateBenefitsLegend(e.target.checked);
});

async function saveFilterSettings() {
  filterSettings = {
    hideStaffing: document.getElementById('filterStaffing').checked,
    hideSponsored: document.getElementById('filterSponsored').checked,
    filterApplicants: document.getElementById('filterApplicants').checked,
    applicantRange: document.getElementById('applicantRange').value,
    entryLevelAccuracy: document.getElementById('filterEntryLevel').checked,
    // True Remote Accuracy settings
    trueRemoteAccuracy: document.getElementById('filterTrueRemote').checked,
    excludeHybrid: document.getElementById('excludeHybrid').checked,
    excludeOnsite: document.getElementById('excludeOnsite').checked,
    excludeInOffice: document.getElementById('excludeInOffice').checked,
    excludeInPerson: document.getElementById('excludeInPerson').checked,
    filterIncludeKeywords: document.getElementById('filterIncludeKeywords').checked,
    filterExcludeKeywords: document.getElementById('filterExcludeKeywords').checked,
    includeKeywords: includeKeywords,
    excludeKeywords: excludeKeywords,
    filterSalary: document.getElementById('filterSalary').checked,
    minSalary: document.getElementById('minSalary').value,
    maxSalary: document.getElementById('maxSalary').value,
    showActiveRecruiting: document.getElementById('filterActiveRecruiting').checked,
    showJobAge: document.getElementById('filterJobAge').checked,
    hideApplied: document.getElementById('filterApplied').checked,
    visaOnly: document.getElementById('filterVisa').checked,
    easyApplyOnly: document.getElementById('filterEasyApply').checked,
    // Benefits Indicator
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator').checked,
    // Applicant Count Display
    showApplicantCount: document.getElementById('showApplicantCount').checked,
    // Job Posting Age Filter
    filterPostingAge: document.getElementById('filterPostingAge').checked,
    postingAgeRange: document.getElementById('postingAgeRange').value
  };

  await chrome.storage.local.set({ filterSettings });
}

function updateFilterStats() {
  // Count main filters (excluding trueRemoteAccuracy and showBenefitsIndicator)
  const mainFilters = [
    'hideStaffing',
    'hideSponsored',
    'filterApplicants',
    'filterPostingAge',
    'entryLevelAccuracy',
    'filterIncludeKeywords',
    'filterExcludeKeywords',
    'filterSalary',
    'showActiveRecruiting',
    'showJobAge',
    'hideApplied',
    'visaOnly',
    'easyApplyOnly'
  ];

  let activeCount = mainFilters.filter(key => filterSettings[key] === true).length;

  // Only count True Remote sub-checkboxes when trueRemoteAccuracy is enabled
  if (filterSettings.trueRemoteAccuracy) {
    const remoteSubFilters = ['excludeHybrid', 'excludeOnsite', 'excludeInOffice', 'excludeInPerson'];
    activeCount += remoteSubFilters.filter(key => filterSettings[key] === true).length;
  }

  document.getElementById('activeFiltersCount').textContent = activeCount;
}

// ===== KEYWORDS MANAGEMENT =====
function renderKeywordChips() {
  // Render include keywords
  const includeContainer = document.getElementById('includeKeywordsChips');
  includeContainer.innerHTML = '';

  if (includeKeywords.length === 0) {
    includeContainer.innerHTML = '<span class="keywords-empty">No keywords added</span>';
  } else {
    includeKeywords.forEach((keyword, index) => {
      const chip = createKeywordChip(keyword, 'include', index);
      includeContainer.appendChild(chip);
    });
  }

  // Render exclude keywords
  const excludeContainer = document.getElementById('excludeKeywordsChips');
  excludeContainer.innerHTML = '';

  if (excludeKeywords.length === 0) {
    excludeContainer.innerHTML = '<span class="keywords-empty">No keywords added</span>';
  } else {
    excludeKeywords.forEach((keyword, index) => {
      const chip = createKeywordChip(keyword, 'exclude', index);
      excludeContainer.appendChild(chip);
    });
  }
}

function createKeywordChip(keyword, type, index) {
  const chip = document.createElement('span');
  chip.className = `keyword-chip ${type === 'exclude' ? 'exclude' : ''}`;
  chip.innerHTML = `
    ${keyword}
    <button class="keyword-chip-remove" data-type="${type}" data-index="${index}">&times;</button>
  `;

  // Add click handler for remove button
  chip.querySelector('.keyword-chip-remove').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeKeyword(type, index);
  });

  return chip;
}

function addKeyword(type, keyword) {
  keyword = keyword.trim().toLowerCase();

  if (!keyword) return false;

  if (type === 'include') {
    if (includeKeywords.includes(keyword)) {
      return false; // Already exists
    }
    includeKeywords.push(keyword);
  } else {
    if (excludeKeywords.includes(keyword)) {
      return false; // Already exists
    }
    excludeKeywords.push(keyword);
  }

  renderKeywordChips();
  return true;
}

function removeKeyword(type, index) {
  if (type === 'include') {
    includeKeywords.splice(index, 1);
  } else {
    excludeKeywords.splice(index, 1);
  }

  renderKeywordChips();
}

// Include keyword input handlers
document.getElementById('includeKeywordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = e.target;
    if (addKeyword('include', input.value)) {
      input.value = '';
    }
  }
});

document.getElementById('addIncludeKeyword').addEventListener('click', () => {
  const input = document.getElementById('includeKeywordInput');
  if (addKeyword('include', input.value)) {
    input.value = '';
  }
  input.focus();
});

// Exclude keyword input handlers
document.getElementById('excludeKeywordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = e.target;
    if (addKeyword('exclude', input.value)) {
      input.value = '';
    }
  }
});

document.getElementById('addExcludeKeyword').addEventListener('click', () => {
  const input = document.getElementById('excludeKeywordInput');
  if (addKeyword('exclude', input.value)) {
    input.value = '';
  }
  input.focus();
});

// ===== TEMPLATES MANAGEMENT =====
const TEMPLATES_STORAGE_KEY = 'jobfiltr_templates';
let templates = [];
let activeTemplateId = null; // Track currently applied template

async function loadTemplates() {
  try {
    const result = await chrome.storage.local.get(TEMPLATES_STORAGE_KEY);
    templates = result[TEMPLATES_STORAGE_KEY] || [];
    renderTemplates();
  } catch (error) {
    console.error('Error loading templates:', error);
    templates = [];
    renderTemplates();
  }
}

async function saveTemplates() {
  try {
    await chrome.storage.local.set({ [TEMPLATES_STORAGE_KEY]: templates });
  } catch (error) {
    console.error('Error saving templates:', error);
  }
}

function countActiveFilters(settings) {
  const mainFilters = [
    'hideStaffing', 'hideSponsored', 'filterApplicants', 'filterPostingAge', 'entryLevelAccuracy',
    'trueRemoteAccuracy', 'filterIncludeKeywords', 'filterExcludeKeywords',
    'filterSalary', 'showActiveRecruiting', 'showJobAge', 'hideApplied',
    'visaOnly', 'easyApplyOnly', 'showBenefitsIndicator', 'showApplicantCount'
  ];
  return mainFilters.filter(key => settings[key] === true).length;
}

function getCurrentFilterSettings() {
  return {
    hideStaffing: document.getElementById('filterStaffing').checked,
    hideSponsored: document.getElementById('filterSponsored').checked,
    filterApplicants: document.getElementById('filterApplicants').checked,
    applicantRange: document.getElementById('applicantRange').value,
    filterPostingAge: document.getElementById('filterPostingAge').checked,
    postingAgeRange: document.getElementById('postingAgeRange').value,
    entryLevelAccuracy: document.getElementById('filterEntryLevel').checked,
    trueRemoteAccuracy: document.getElementById('filterTrueRemote').checked,
    excludeHybrid: document.getElementById('excludeHybrid').checked,
    excludeOnsite: document.getElementById('excludeOnsite').checked,
    excludeInOffice: document.getElementById('excludeInOffice').checked,
    excludeInPerson: document.getElementById('excludeInPerson').checked,
    filterIncludeKeywords: document.getElementById('filterIncludeKeywords').checked,
    filterExcludeKeywords: document.getElementById('filterExcludeKeywords').checked,
    includeKeywords: [...includeKeywords],
    excludeKeywords: [...excludeKeywords],
    filterSalary: document.getElementById('filterSalary').checked,
    minSalary: document.getElementById('minSalary').value,
    maxSalary: document.getElementById('maxSalary').value,
    showActiveRecruiting: document.getElementById('filterActiveRecruiting').checked,
    showJobAge: document.getElementById('filterJobAge').checked,
    hideApplied: document.getElementById('filterApplied').checked,
    visaOnly: document.getElementById('filterVisa').checked,
    easyApplyOnly: document.getElementById('filterEasyApply').checked,
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator').checked,
    showApplicantCount: document.getElementById('showApplicantCount').checked
  };
}

function applyTemplateSettings(settings) {
  // Apply all settings to UI
  document.getElementById('filterStaffing').checked = settings.hideStaffing || false;
  document.getElementById('filterSponsored').checked = settings.hideSponsored || false;
  document.getElementById('filterApplicants').checked = settings.filterApplicants || false;
  document.getElementById('applicantRange').value = settings.applicantRange || 'under10';
  document.getElementById('filterPostingAge').checked = settings.filterPostingAge || false;
  document.getElementById('postingAgeRange').value = settings.postingAgeRange || '1w';
  document.getElementById('filterEntryLevel').checked = settings.entryLevelAccuracy || false;
  document.getElementById('filterTrueRemote').checked = settings.trueRemoteAccuracy || false;
  document.getElementById('excludeHybrid').checked = settings.excludeHybrid !== false;
  document.getElementById('excludeOnsite').checked = settings.excludeOnsite !== false;
  document.getElementById('excludeInOffice').checked = settings.excludeInOffice !== false;
  document.getElementById('excludeInPerson').checked = settings.excludeInPerson !== false;
  document.getElementById('filterIncludeKeywords').checked = settings.filterIncludeKeywords || false;
  document.getElementById('filterExcludeKeywords').checked = settings.filterExcludeKeywords || false;
  document.getElementById('filterSalary').checked = settings.filterSalary || false;
  document.getElementById('minSalary').value = settings.minSalary || '';
  document.getElementById('maxSalary').value = settings.maxSalary || '';
  document.getElementById('filterActiveRecruiting').checked = settings.showActiveRecruiting || false;
  document.getElementById('filterJobAge').checked = settings.showJobAge || false;
  document.getElementById('filterApplied').checked = settings.hideApplied || false;
  document.getElementById('filterVisa').checked = settings.visaOnly || false;
  document.getElementById('filterEasyApply').checked = settings.easyApplyOnly || false;
  document.getElementById('showBenefitsIndicator').checked = settings.showBenefitsIndicator || false;
  document.getElementById('showApplicantCount').checked = settings.showApplicantCount || false;

  // Apply keywords
  includeKeywords = settings.includeKeywords || [];
  excludeKeywords = settings.excludeKeywords || [];
  renderKeywordChips();

  // Update benefits legend visibility
  updateBenefitsLegend(settings.showBenefitsIndicator || false);

  // Update filter stats
  filterSettings = settings;
  updateFilterStats();
}

async function saveTemplate(name) {
  const settings = getCurrentFilterSettings();
  const template = {
    id: Date.now().toString(),
    name: name.trim(),
    createdAt: Date.now(),
    settings: settings,
    filterCount: countActiveFilters(settings),
    isFavorite: false
  };

  templates.unshift(template);

  // Limit to 10 templates
  if (templates.length > 10) {
    templates.pop();
  }

  await saveTemplates();
  renderTemplates();
}

async function deleteTemplate(id) {
  templates = templates.filter(t => t.id !== id);
  await saveTemplates();
  renderTemplates();
}

async function toggleFavorite(id) {
  const template = templates.find(t => t.id === id);
  if (template) {
    template.isFavorite = !template.isFavorite;
    await saveTemplates();
    renderTemplates();
  }
}

function loadTemplate(id) {
  const template = templates.find(t => t.id === id);
  if (template) {
    applyTemplateSettings(template.settings);

    // Set as active template
    activeTemplateId = id;
    renderTemplates(); // Re-render to show active state

    // Show feedback
    const saveBtn = document.getElementById('saveTemplateBtn');
    const originalHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Loaded!
    `;
    saveBtn.style.background = 'var(--success)';

    setTimeout(() => {
      saveBtn.innerHTML = originalHTML;
      saveBtn.style.background = '';
    }, 1500);
  }
}

// Clear active template when filters are manually changed
function clearActiveTemplate() {
  if (activeTemplateId) {
    activeTemplateId = null;
    renderTemplates();
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function renderTemplates() {
  const templatesList = document.getElementById('templatesList');
  const templatesEmpty = document.getElementById('templatesEmpty');

  // Clear existing template items (but keep empty state element)
  const existingItems = templatesList.querySelectorAll('.template-item');
  existingItems.forEach(item => item.remove());

  if (templates.length === 0) {
    templatesEmpty.classList.remove('hidden');
    return;
  }

  templatesEmpty.classList.add('hidden');

  // Sort templates: favorites first, then by creation date (newest first)
  const sortedTemplates = [...templates].sort((a, b) => {
    // Favorites first
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    // Then by creation date (newest first)
    return b.createdAt - a.createdAt;
  });

  sortedTemplates.forEach(template => {
    const isFavorite = template.isFavorite || false;
    const isActive = template.id === activeTemplateId;
    const item = document.createElement('div');
    item.className = `template-item${isFavorite ? ' is-favorite' : ''}${isActive ? ' is-active' : ''}`;
    item.dataset.id = template.id;
    item.innerHTML = `
      <button class="btn-favorite-template${isFavorite ? ' active' : ''}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}" data-id="${template.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="template-item-info">
        <div class="template-item-name">
          ${escapeHtml(template.name)}
          ${isActive ? '<span class="template-active-badge">Active</span>' : ''}
        </div>
        <div class="template-item-meta">
          <span class="template-filter-count">${template.filterCount} filters</span>
          <span>${formatDate(template.createdAt)}</span>
        </div>
      </div>
      <div class="template-item-actions">
        <button class="btn-load-template" title="Load template" data-id="${template.id}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn-delete-template" title="Delete template" data-id="${template.id}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;

    // Click on item to load template (except on action buttons)
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-delete-template') && !e.target.closest('.btn-favorite-template')) {
        loadTemplate(template.id);
      }
    });

    // Favorite button handler
    item.querySelector('.btn-favorite-template').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(template.id);
    });

    // Load button handler
    item.querySelector('.btn-load-template').addEventListener('click', (e) => {
      e.stopPropagation();
      loadTemplate(template.id);
    });

    // Delete button handler
    item.querySelector('.btn-delete-template').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTemplate(template.id);
    });

    templatesList.appendChild(item);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Templates toggle (expand/collapse)
document.getElementById('templatesToggle')?.addEventListener('click', () => {
  const section = document.getElementById('templatesSection');
  section.classList.toggle('collapsed');

  // Save preference
  chrome.storage.local.set({
    templatesCollapsed: section.classList.contains('collapsed')
  });
});

// Load templates collapsed state
async function loadTemplatesCollapsedState() {
  try {
    const result = await chrome.storage.local.get('templatesCollapsed');
    if (result.templatesCollapsed) {
      document.getElementById('templatesSection')?.classList.add('collapsed');
    }
  } catch (error) {
    // Ignore errors
  }
}

// Save template button - show input
document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('saveTemplateModal');
  modal.classList.remove('hidden');
  const input = document.getElementById('templateNameInput');
  input.value = '';
  input.focus();
});

// Confirm save template
document.getElementById('confirmSaveTemplate')?.addEventListener('click', async () => {
  const input = document.getElementById('templateNameInput');
  const name = input.value.trim();

  if (name) {
    await saveTemplate(name);
    document.getElementById('saveTemplateModal').classList.add('hidden');
    input.value = '';
  }
});

// Cancel save template
document.getElementById('cancelSaveTemplate')?.addEventListener('click', () => {
  document.getElementById('saveTemplateModal').classList.add('hidden');
  document.getElementById('templateNameInput').value = '';
});

// Enter key to confirm save
document.getElementById('templateNameInput')?.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const name = e.target.value.trim();
    if (name) {
      await saveTemplate(name);
      document.getElementById('saveTemplateModal').classList.add('hidden');
      e.target.value = '';
    }
  }
});

// Escape key to cancel
document.getElementById('templateNameInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('saveTemplateModal').classList.add('hidden');
    e.target.value = '';
  }
});

// Apply Filters Button
document.getElementById('applyFilters').addEventListener('click', async () => {
  // Check if user is authenticated before applying filters
  if (!currentUser) {
    const btn = document.getElementById('applyFilters');
    const originalText = btn.innerHTML;

    // Show sign-in required feedback
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Sign in required';
    btn.style.background = 'var(--warning)';

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      // Show auth overlay
      showAuthOverlay();
    }, 1500);

    return;
  }

  await saveFilterSettings();

  // Send message to content script to apply filters
  try {
    // In panel mode, use the stored currentTabId from detectCurrentSite()
    // Otherwise, query the active tab in current window
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        // In panel mode, get tab from background script
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (!tabId) {
      console.error('No tab found to apply filters');
      return;
    }

    const btn = document.getElementById('applyFilters');
    const originalText = btn.innerHTML;

    // Helper function to send the apply filters message
    async function sendApplyFilters() {
      await chrome.tabs.sendMessage(tabId, {
        type: 'APPLY_FILTERS',
        settings: filterSettings,
        site: currentSite
      });
    }

    try {
      await sendApplyFilters();

      // Show success feedback
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Filters Applied!';
      btn.style.background = 'var(--success)';

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
      }, 2000);

      updateFilterStats();
    } catch (msgError) {
      // Handle content script not available - try to inject and retry
      if (msgError.message?.includes('Receiving end does not exist')) {
        console.warn('Content script not loaded, attempting to inject...');

        // Show loading feedback
        btn.innerHTML = '⏳ Loading scripts...';
        btn.style.background = 'var(--primary)';

        // Try to inject content scripts
        const injected = await injectContentScripts(tabId, currentSite);

        if (injected) {
          try {
            // Retry sending the message
            await sendApplyFilters();

            // Show success feedback
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Filters Applied!';
            btn.style.background = 'var(--success)';

            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.background = '';
            }, 2000);

            updateFilterStats();
            return;
          } catch (retryError) {
            console.error('Failed to apply filters after injection:', retryError);
          }
        }

        // Injection failed or retry failed
        btn.innerHTML = '⚠ Please refresh the page';
        btn.style.background = 'var(--error)';

        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '';
        }, 3000);
      } else {
        throw msgError;
      }
    }
  } catch (error) {
    console.error('Error applying filters:', error);
  }
});

// Reset Filters Button
document.getElementById('resetFilters').addEventListener('click', async () => {
  // Clear active template
  activeTemplateId = null;
  renderTemplates();

  // Reset all checkboxes
  document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });

  // Reset other inputs
  document.getElementById('applicantRange').value = 'under10';
  document.getElementById('minSalary').value = '';
  document.getElementById('maxSalary').value = '';

  // Reset keywords
  includeKeywords = [];
  excludeKeywords = [];
  renderKeywordChips();

  filterSettings = {};
  await chrome.storage.local.set({ filterSettings: {} });

  // Send reset message to content script
  try {
    // In panel mode, use the stored currentTabId or get from background
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (tabId) {
      // Helper function to send the reset message
      async function sendResetFilters() {
        await chrome.tabs.sendMessage(tabId, {
          type: 'RESET_FILTERS'
        });
      }

      try {
        await sendResetFilters();
      } catch (msgError) {
        // If content script not available, try to inject and retry
        if (msgError.message?.includes('Receiving end does not exist')) {
          console.warn('Content script not loaded for reset, attempting to inject...');

          const injected = await injectContentScripts(tabId, currentSite);
          if (injected) {
            try {
              await sendResetFilters();
            } catch (retryError) {
              // Silently fail on retry - the filters are already reset locally
              console.warn('Failed to send reset after injection:', retryError);
            }
          }
        } else {
          console.error('Error sending reset message:', msgError);
        }
      }
    }
  } catch (error) {
    console.error('Error resetting filters:', error);
  }

  updateFilterStats();
});

// ===== SCANNER FUNCTIONALITY =====
let currentJobData = null;
let scannerRefreshInterval = null;

async function initializeScanner() {
  // Ensure we have the correct tab first
  await detectCurrentSite();
  await detectCurrentJob();

  // Start auto-refresh for scanner detection (every 2 seconds)
  if (scannerRefreshInterval) {
    clearInterval(scannerRefreshInterval);
  }
  scannerRefreshInterval = setInterval(async () => {
    // Only refresh if scanner tab is active
    const scannerTab = document.querySelector('.tab-button[data-tab="scanner"]');
    if (scannerTab && scannerTab.classList.contains('active')) {
      await detectCurrentJob();
    }
  }, 2000);
}

async function detectCurrentJob() {
  try {
    // In panel mode, use the stored currentTabId or get from background
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (!tabId) {
      updateDetectedJobInfo(null);
      return;
    }

    // Send message to content script to extract job info
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_JOB_INFO'
      });

      if (response && response.success) {
        currentJobData = response.data;
        updateDetectedJobInfo(response.data);
      } else {
        updateDetectedJobInfo(null);
      }
    } catch (msgError) {
      // Silently ignore if content script is not available
      if (!msgError.message?.includes('Receiving end does not exist')) {
        console.error('Error sending job extraction message:', msgError);
      }
      updateDetectedJobInfo(null);
    }
  } catch (error) {
    console.error('Error detecting job:', error);
    updateDetectedJobInfo(null);
  }
}

// Format location to show only city and state
function formatLocationCityState(location) {
  if (!location || location === 'Not detected') return location;

  // Handle special cases
  const lowerLocation = location.toLowerCase().trim();
  if (lowerLocation === 'remote' || lowerLocation.includes('remote')) {
    return 'Remote';
  }

  // Remove common suffixes and work type indicators
  let cleaned = location
    .replace(/\s*\(On-?site\)/gi, '')
    .replace(/\s*\(Hybrid\)/gi, '')
    .replace(/\s*\(Remote\)/gi, '')
    .replace(/,?\s*United States$/i, '')
    .replace(/,?\s*USA$/i, '')
    .replace(/,?\s*US$/i, '')
    .trim();

  // Split by comma
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);

  if (parts.length === 0) return location;
  if (parts.length === 1) return parts[0];

  // Return first two parts (city, state)
  return `${parts[0]}, ${parts[1]}`;
}

function updateDetectedJobInfo(data) {
  if (data) {
    document.getElementById('detectedTitle').textContent = data.title || 'Not detected';
    document.getElementById('detectedCompany').textContent = data.company || 'Not detected';
    document.getElementById('detectedLocation').textContent = formatLocationCityState(data.location) || 'Not detected';
    document.getElementById('detectedUrl').textContent = data.url || 'Not detected';
    document.getElementById('detectedUrl').title = data.url || '';

    // Enable scan button
    document.getElementById('scanButton').disabled = false;

    // Check if job is saved and update save button
    checkIfJobIsSaved();
  } else {
    document.getElementById('detectedTitle').textContent = 'Not detected';
    document.getElementById('detectedCompany').textContent = 'Not detected';
    document.getElementById('detectedLocation').textContent = 'Not detected';
    document.getElementById('detectedUrl').textContent = 'Not on a job posting page';

    // Disable scan and save buttons
    document.getElementById('scanButton').disabled = true;
    document.getElementById('saveJobButton').disabled = true;
  }
}

// Minimum scan time in milliseconds (2.5 seconds for accurate analysis)
const MIN_SCAN_TIME = 2500;

// Scan Button
document.getElementById('scanButton').addEventListener('click', async () => {
  if (!currentJobData) {
    await detectCurrentJob();
    if (!currentJobData) {
      alert('No job posting detected. Please navigate to a job posting page.');
      return;
    }
  }

  // Show loading state
  document.querySelector('.scan-results').classList.add('hidden');
  document.querySelector('.loading-section').classList.remove('hidden');

  const scanStartTime = Date.now();

  try {
    // Get the tab ID to send message to
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
        tabId = response?.tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (!tabId) {
      throw new Error('No tab found for scanning');
    }

    // Send message to content script to perform ghost detection analysis
    let result;
    try {
      result = await chrome.tabs.sendMessage(tabId, {
        type: 'ANALYZE_GHOST_JOB',
        jobData: currentJobData
      });
    } catch (msgError) {
      // Handle content script not available - fall back to local analysis
      if (msgError.message?.includes('Receiving end does not exist')) {
        console.warn('Content script not available, using local analysis');
        result = null;
      } else {
        throw msgError;
      }
    }

    // Ensure minimum scan time for accurate results
    const elapsedTime = Date.now() - scanStartTime;
    if (elapsedTime < MIN_SCAN_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_SCAN_TIME - elapsedTime));
    }

    // Hide loading, show results
    document.querySelector('.loading-section').classList.add('hidden');
    document.querySelector('.scan-results').classList.remove('hidden');

    if (result && result.success) {
      displayScanResults(result.data);
      // Save to history
      await saveScanToHistory(result.data);
    } else {
      // Fallback: perform local analysis if content script doesn't respond
      const localResult = performLocalGhostAnalysis(currentJobData);
      displayScanResults(localResult);
      await saveScanToHistory(localResult);
    }

  } catch (error) {
    console.error('Error scanning job:', error);
    // Ensure minimum scan time even on error
    const elapsedTime = Date.now() - scanStartTime;
    if (elapsedTime < MIN_SCAN_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_SCAN_TIME - elapsedTime));
    }
    // Fallback: perform local analysis
    try {
      const localResult = performLocalGhostAnalysis(currentJobData);
      document.querySelector('.loading-section').classList.add('hidden');
      document.querySelector('.scan-results').classList.remove('hidden');
      displayScanResults(localResult);
      await saveScanToHistory(localResult);
    } catch (fallbackError) {
      document.querySelector('.loading-section').classList.add('hidden');
      alert('Error scanning job. Please try again.');
    }
  }
});

// Local ghost job analysis (fallback when content script unavailable)
function performLocalGhostAnalysis(jobData) {
  const redFlags = [];
  let score = 100; // Start with perfect score, subtract for issues

  // Track signals for confidence and breakdown calculations
  const signals = [];
  const breakdown = {
    temporal: 0,
    content: 0,
    company: 0,
    behavioral: 0
  };

  // ===== TEMPORAL SIGNALS =====
  // Check posting age if available
  let temporalRisk = 0;
  let temporalConfidence = 0.5;
  if (jobData.postedDate) {
    const daysPosted = parsePostingAge(jobData.postedDate);
    if (daysPosted !== null) {
      temporalConfidence = 0.9;
      if (daysPosted > 60) {
        temporalRisk = 0.8;
        redFlags.push(`Job posted ${daysPosted} days ago (stale posting)`);
        score -= 20;
      } else if (daysPosted > 30) {
        temporalRisk = 0.5;
        redFlags.push(`Job posted ${daysPosted} days ago`);
        score -= 10;
      } else if (daysPosted > 14) {
        temporalRisk = 0.2;
      }
    }
  }
  signals.push({ category: 'temporal', value: temporalRisk, confidence: temporalConfidence });
  breakdown.temporal = temporalRisk * 100;

  // ===== COMPANY SIGNALS =====
  let companyRisk = 0;
  let companyConfidence = 0.7;

  // Check for staffing indicators
  const staffingPatterns = [
    /staffing|recruiting|talent|solutions|workforce/i,
    /robert\s*half|randstad|adecco|manpower|kelly\s*services/i,
    /teksystems|insight\s*global|aerotek|allegis/i,
    /cybercoders|kforce|modis|judge|apex/i
  ];

  const companyLower = (jobData.company || '').toLowerCase();
  for (const pattern of staffingPatterns) {
    if (pattern.test(companyLower)) {
      redFlags.push('Company appears to be a staffing agency');
      companyRisk = 0.6;
      companyConfidence = 0.95;
      score -= 20;
      break;
    }
  }
  signals.push({ category: 'company', value: companyRisk, confidence: companyConfidence });
  breakdown.company = companyRisk * 100;

  // ===== CONTENT SIGNALS =====
  let contentRisk = 0;
  let contentConfidence = 0.8;

  // Check for vague descriptions
  const vagueIndicators = [
    'fast-paced', 'self-starter', 'team player', 'dynamic',
    'exciting opportunity', 'competitive salary', 'rock star', 'ninja',
    'guru', 'wear many hats', 'other duties as assigned'
  ];

  const descLower = (jobData.description || '').toLowerCase();
  let vagueCount = 0;
  for (const indicator of vagueIndicators) {
    if (descLower.includes(indicator)) vagueCount++;
  }

  if (vagueCount >= 3) {
    redFlags.push('Job description contains multiple vague/buzzword phrases');
    contentRisk += 0.4;
    score -= 15;
  } else if (vagueCount >= 1) {
    redFlags.push('Job description contains some vague language');
    contentRisk += 0.15;
    score -= 5;
  }

  // Check for salary transparency
  if (!/\$[\d,]+/.test(jobData.description || '') && !/salary|pay|compensation/i.test(jobData.description || '')) {
    redFlags.push('No salary information provided');
    contentRisk += 0.25;
    score -= 10;
  }

  // Check description length
  const descLength = (jobData.description || '').length;
  if (descLength < 200) {
    redFlags.push('Job description is unusually short');
    contentRisk += 0.35;
    contentConfidence = 0.9;
    score -= 15;
  } else if (descLength < 500) {
    contentRisk += 0.1;
  }

  // Check for remote work clarity issues
  if (/remote/i.test(jobData.description || '') && /hybrid|on-?site|in-?office|commute/i.test(jobData.description || '')) {
    redFlags.push('Conflicting remote/in-office requirements');
    contentRisk += 0.2;
    score -= 10;
  }

  contentRisk = Math.min(1, contentRisk);
  signals.push({ category: 'content', value: contentRisk, confidence: contentConfidence });
  breakdown.content = contentRisk * 100;

  // ===== BEHAVIORAL SIGNALS =====
  let behavioralRisk = 0;
  let behavioralConfidence = 0.6;

  // Check applicant count if available
  if (jobData.applicantCount !== undefined && jobData.applicantCount !== null) {
    behavioralConfidence = 0.85;
    if (jobData.applicantCount > 500) {
      behavioralRisk = 0.5;
      redFlags.push(`High applicant volume (${jobData.applicantCount}+)`);
      score -= 10;
    } else if (jobData.applicantCount > 200) {
      behavioralRisk = 0.3;
    }
  }

  // Check for Easy Apply
  if (jobData.isEasyApply === false) {
    behavioralRisk += 0.15;
  }

  behavioralRisk = Math.min(1, behavioralRisk);
  signals.push({ category: 'behavioral', value: behavioralRisk, confidence: behavioralConfidence });
  breakdown.behavioral = behavioralRisk * 100;

  // Calculate overall confidence as weighted average of signal confidences
  const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
  const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0.5;

  // Adjust confidence based on how much data we have
  const dataCompleteness = [
    jobData.description ? 0.3 : 0,
    jobData.company ? 0.2 : 0,
    jobData.postedDate ? 0.2 : 0,
    jobData.title ? 0.15 : 0,
    jobData.location ? 0.15 : 0
  ].reduce((a, b) => a + b, 0);

  const finalConfidence = Math.round((avgConfidence * 0.7 + dataCompleteness * 0.3) * 100);

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    legitimacyScore: score,
    redFlags: redFlags.length > 0 ? redFlags : ['No significant red flags detected'],
    confidence: finalConfidence,
    breakdown: breakdown,
    analyzedAt: Date.now()
  };
}

// Helper function to parse posting age from date string
function parsePostingAge(dateString) {
  if (!dateString) return null;
  const normalized = dateString.toLowerCase().trim();

  if (/just now|moments? ago/i.test(normalized)) return 0;

  let match;
  if ((match = normalized.match(/(\d+)\s*minutes?\s*ago/i))) return 0;
  if ((match = normalized.match(/(\d+)\s*hours?\s*ago/i))) return 0;
  if ((match = normalized.match(/(\d+)\s*days?\s*ago/i))) return parseInt(match[1]);
  if ((match = normalized.match(/(\d+)\s*weeks?\s*ago/i))) return parseInt(match[1]) * 7;
  if ((match = normalized.match(/(\d+)\s*months?\s*ago/i))) return parseInt(match[1]) * 30;

  return null;
}

function displayScanResults(result) {
  // Update result icon and badge
  const resultIcon = document.getElementById('resultIcon');
  const resultBadge = document.getElementById('resultBadge');
  const scoreValue = document.getElementById('scoreValue');
  const scoreFill = document.getElementById('scoreFill');

  const score = result.legitimacyScore || 0;
  scoreValue.textContent = `${score}/100`;
  scoreFill.style.width = `${score}%`;

  // Determine status
  let status = 'legitimate';
  let statusText = 'Legitimate';
  if (score < 40) {
    status = 'danger';
    statusText = 'Scam/Ghost Job';
  } else if (score < 70) {
    status = 'warning';
    statusText = 'Suspicious';
  }

  resultIcon.className = `result-icon ${status}`;
  resultBadge.className = `result-badge ${status}`;
  resultBadge.textContent = statusText;

  // Update result title
  document.getElementById('resultTitle').textContent = currentJobData.title || 'Analysis Complete';

  // Update confidence score
  const confidenceEl = document.getElementById('confidenceValue');
  if (confidenceEl) {
    const confidence = result.confidence || 0;
    confidenceEl.textContent = `${confidence}%`;
  }

  // Update breakdown percentages
  if (result.breakdown) {
    const breakdownCategories = ['temporal', 'content', 'company', 'behavioral'];
    breakdownCategories.forEach(cat => {
      const valueEl = document.getElementById(`breakdown${cat.charAt(0).toUpperCase() + cat.slice(1)}Value`);
      const barEl = document.getElementById(`breakdown${cat.charAt(0).toUpperCase() + cat.slice(1)}Bar`);
      if (valueEl && barEl) {
        const value = Math.round(result.breakdown[cat] || 0);
        valueEl.textContent = `${value}%`;
        barEl.style.width = `${value}%`;

        // Update bar color based on risk level
        if (value > 50) {
          barEl.className = 'breakdown-bar-fill danger';
        } else if (value > 25) {
          barEl.className = 'breakdown-bar-fill warning';
        } else {
          barEl.className = 'breakdown-bar-fill';
        }
      }
    });
  }

  // Display flags
  const flagsList = document.getElementById('flagsList');
  flagsList.innerHTML = '';

  if (result.redFlags && result.redFlags.length > 0) {
    result.redFlags.forEach(flag => {
      const flagItem = document.createElement('div');
      flagItem.className = 'flag-item';
      flagItem.innerHTML = `
        <svg class="flag-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v20M12 2l8 6-8 6M12 8l-8 6 8 6" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>${flag}</span>
      `;
      flagsList.appendChild(flagItem);
    });
  } else {
    flagsList.innerHTML = '<div class="flag-item"><span>No red flags detected!</span></div>';
  }

  // Show notification toast if enabled
  showScanNotification(result, status, statusText);
}

// ===== NOTIFICATION TOAST =====
let notificationTimeout = null;

async function showScanNotification(result, status, statusText) {
  // Check if notifications are enabled
  const settings = await chrome.storage.sync.get({ notifications: true });
  if (!settings.notifications) return;

  const toast = document.getElementById('notificationToast');
  const title = document.getElementById('notificationTitle');
  const message = document.getElementById('notificationMessage');

  if (!toast) return;

  // Clear any existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  // Set notification content
  title.textContent = 'Scan Complete';
  const jobTitle = currentJobData?.title || 'Job';
  if (status === 'danger') {
    message.textContent = `Warning: ${jobTitle} may be a scam/ghost job`;
  } else if (status === 'warning') {
    message.textContent = `${jobTitle} has some suspicious indicators`;
  } else {
    message.textContent = `${jobTitle} appears legitimate`;
  }

  // Set notification type (success or warning)
  toast.classList.remove('success', 'warning', 'hidden', 'hiding');
  toast.classList.add(status === 'legitimate' ? 'success' : 'warning');

  // Auto-hide after 5 seconds
  notificationTimeout = setTimeout(() => {
    hideNotificationToast();
  }, 5000);
}

function hideNotificationToast() {
  const toast = document.getElementById('notificationToast');
  if (!toast || toast.classList.contains('hidden')) return;

  toast.classList.add('hiding');
  setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('hiding');
  }, 300);
}

// Close button for notification
document.getElementById('notificationClose')?.addEventListener('click', hideNotificationToast);

async function saveScanToHistory(result) {
  try {
    const history = await chrome.storage.local.get('scanHistory');
    const scanHistory = history.scanHistory || [];

    scanHistory.unshift({
      ...currentJobData,
      location: formatLocationCityState(currentJobData?.location), // Format location to city, state
      ...result,
      timestamp: Date.now()
    });

    // Keep only last 10 scans
    if (scanHistory.length > 10) {
      scanHistory.pop();
    }

    await chrome.storage.local.set({ scanHistory });
    loadScanHistory();
  } catch (error) {
    console.error('Error saving scan to history:', error);
  }
}

async function loadScanHistory() {
  try {
    const history = await chrome.storage.local.get('scanHistory');
    const scanHistory = history.scanHistory || [];

    const historyList = document.getElementById('historyList');

    if (scanHistory.length === 0) {
      historyList.innerHTML = '<div class="empty-state"><p>No recent scans</p></div>';
      return;
    }

    historyList.innerHTML = '';
    scanHistory.forEach((scan, index) => {
      const historyItem = document.createElement('div');

      // Determine status class based on score
      const score = scan.legitimacyScore || 0;
      let statusClass = '';
      if (score < 40) {
        statusClass = 'danger';
      } else if (score < 70) {
        statusClass = 'warning';
      }

      historyItem.className = `history-item ${statusClass}`;

      // Format date and time separately
      const scanDate = new Date(scan.timestamp);
      const dateStr = scanDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
      const timeStr = scanDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      historyItem.innerHTML = `
        <div class="history-info">
          <div class="history-item-header">
            <span class="history-item-title">${scan.title || 'Unknown Job'}</span>
            <span class="history-item-score">${score}/100</span>
          </div>
          <div class="history-item-company">${scan.company || 'Unknown Company'}</div>
          <div class="history-item-location">${formatLocationCityState(scan.location) || ''}</div>
        </div>
        <div class="history-item-datetime">
          <span class="history-item-date">${dateStr}</span>
          <span class="history-item-time">${timeStr}</span>
        </div>
      `;
      historyList.appendChild(historyItem);
    });
  } catch (error) {
    console.error('Error loading scan history:', error);
  }
}

// New Scan Button
document.getElementById('newScan').addEventListener('click', () => {
  document.querySelector('.scan-results').classList.add('hidden');
  currentJobData = null;
  detectCurrentJob();
});

// Clear History Button
document.getElementById('clearHistory').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all scan history?')) {
    await chrome.storage.local.set({ scanHistory: [] });
    loadScanHistory();
  }
});

// ===== SAVED JOBS FUNCTIONALITY =====
let savedJobs = [];

// Load saved jobs from storage
async function loadSavedJobs() {
  try {
    const result = await chrome.storage.local.get('savedJobs');
    savedJobs = result.savedJobs || [];
    renderSavedJobs();
  } catch (error) {
    console.error('Error loading saved jobs:', error);
    savedJobs = [];
  }
}

// Save jobs to storage
async function saveSavedJobsToStorage() {
  try {
    await chrome.storage.local.set({ savedJobs });
    renderSavedJobs();
  } catch (error) {
    console.error('Error saving jobs to storage:', error);
  }
}

// Save current job
async function saveCurrentJob() {
  if (!currentJobData) return;

  // Check if already saved
  const exists = savedJobs.some(job => job.url === currentJobData.url);
  if (exists) {
    // Toggle save - remove if already saved
    savedJobs = savedJobs.filter(job => job.url !== currentJobData.url);
    await saveSavedJobsToStorage();
    updateSaveJobButton(false);
    return;
  }

  // Add new saved job
  const savedJob = {
    id: Date.now().toString(),
    title: currentJobData.title || 'Unknown Job',
    company: currentJobData.company || 'Unknown Company',
    location: formatLocationCityState(currentJobData.location) || 'Not specified',
    url: currentJobData.url,
    savedAt: Date.now()
  };

  savedJobs.unshift(savedJob);

  // Keep only last 20 saved jobs
  if (savedJobs.length > 20) {
    savedJobs.pop();
  }

  await saveSavedJobsToStorage();
  updateSaveJobButton(true);
}

// Render saved jobs list
function renderSavedJobs() {
  const savedJobsList = document.getElementById('savedJobsList');
  if (!savedJobsList) return;

  if (savedJobs.length === 0) {
    savedJobsList.innerHTML = '<div class="empty-state"><p>No saved jobs</p></div>';
    return;
  }

  savedJobsList.innerHTML = '';
  savedJobs.forEach(job => {
    const jobItem = document.createElement('div');
    jobItem.className = 'saved-job-item';

    // Format date and time for saved job
    const savedDate = new Date(job.savedAt);
    const dateStr = savedDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
    const timeStr = savedDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    jobItem.innerHTML = `
      <div class="saved-job-info">
        <div class="saved-job-title">${job.title}</div>
        <div class="saved-job-company">${job.company}</div>
        <div class="saved-job-location">${formatLocationCityState(job.location) || ''}</div>
      </div>
      <div class="saved-job-datetime">
        <span class="saved-job-date">${dateStr}</span>
        <span class="saved-job-time">${timeStr}</span>
      </div>
      <div class="saved-job-actions">
        <button class="saved-job-goto" title="Go to job posting" data-url="${job.url}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="saved-job-delete" title="Remove" data-id="${job.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;

    // Go to job posting
    jobItem.querySelector('.saved-job-goto').addEventListener('click', (e) => {
      e.stopPropagation();
      const url = e.currentTarget.dataset.url;
      if (url) {
        chrome.tabs.create({ url });
      }
    });

    // Delete saved job
    jobItem.querySelector('.saved-job-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      savedJobs = savedJobs.filter(j => j.id !== id);
      await saveSavedJobsToStorage();
      // Update button state if current job was unsaved
      if (currentJobData) {
        const isSaved = savedJobs.some(j => j.url === currentJobData.url);
        updateSaveJobButton(isSaved);
      }
    });

    savedJobsList.appendChild(jobItem);
  });
}

// Update save job button state
function updateSaveJobButton(isSaved) {
  const saveBtn = document.getElementById('saveJobButton');
  if (!saveBtn) return;

  if (isSaved) {
    saveBtn.classList.add('saved');
    saveBtn.querySelector('span').textContent = 'Saved';
  } else {
    saveBtn.classList.remove('saved');
    saveBtn.querySelector('span').textContent = 'Save Job';
  }
}

// Check if current job is saved and update button
function checkIfJobIsSaved() {
  if (!currentJobData || !currentJobData.url) {
    document.getElementById('saveJobButton').disabled = true;
    return;
  }

  document.getElementById('saveJobButton').disabled = false;
  const isSaved = savedJobs.some(job => job.url === currentJobData.url);
  updateSaveJobButton(isSaved);
}

// Save Job Button
document.getElementById('saveJobButton')?.addEventListener('click', async () => {
  await saveCurrentJob();
});

// Clear Saved Jobs Button
document.getElementById('clearSavedJobs')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all saved jobs?')) {
    savedJobs = [];
    await chrome.storage.local.set({ savedJobs: [] });
    renderSavedJobs();
    if (currentJobData) {
      updateSaveJobButton(false);
    }
  }
});

// ===== FOOTER ACTIONS =====
document.getElementById('openSettings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('openWebApp').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://jobfiltr.com/dashboard' });
});

// ===== RESPONSIVE SIZING =====
function initResponsiveSizing() {
  const updateSizeClass = () => {
    const width = document.body.offsetWidth;
    document.body.classList.remove('size-compact', 'size-expanded');

    if (width < 320) {
      document.body.classList.add('size-compact');
    } else if (width > 450) {
      document.body.classList.add('size-expanded');
    }
    // Normal size (320-450px) uses default CSS variables
  };

  // Initial size check
  updateSizeClass();

  // Watch for size changes using ResizeObserver
  const resizeObserver = new ResizeObserver(() => {
    updateSizeClass();
  });
  resizeObserver.observe(document.body);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  // Notify background that popup is opened (for notification suppression)
  chrome.runtime.sendMessage({ type: 'POPUP_OPENED' }).catch(() => {});

  // Detect if in panel mode first
  detectPanelMode();

  // Initialize responsive button sizing
  initResponsiveSizing();

  // Initialize filters tab by default
  initializeFilters();
  loadScanHistory();
  loadSavedJobs();

  // Load templates
  loadTemplates();
  loadTemplatesCollapsedState();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILTER_STATS_UPDATE') {
    document.getElementById('hiddenJobsCount').textContent = message.hiddenCount || 0;

    // Update page indicator if on LinkedIn
    if (message.site === 'linkedin' && message.page) {
      updatePageIndicator(message.page, message.hiddenCount);
    }
  }

  if (message.type === 'PAGE_UPDATE') {
    if (message.site === 'linkedin') {
      updatePageIndicator(message.page, message.hiddenCount);
    }
  }
});

// Update page indicator display
function updatePageIndicator(page, hiddenCount) {
  const pageIndicator = document.getElementById('pageIndicator');
  const currentPageText = document.getElementById('currentPageText');
  const pageHiddenCount = document.getElementById('pageHiddenCount');

  if (pageIndicator && currentSite === 'linkedin') {
    pageIndicator.classList.remove('hidden');
    currentPageText.textContent = `Page ${page}`;
    pageHiddenCount.textContent = hiddenCount || 0;
  }
}

// Hide page indicator when not on LinkedIn
function hidePageIndicator() {
  const pageIndicator = document.getElementById('pageIndicator');
  if (pageIndicator) {
    pageIndicator.classList.add('hidden');
  }
}

// ===== DOCUMENTS TAB =====
const DOCUMENT_LIMITS = {
  resumes: 10,
  coverLetters: 10,
  portfolio: 10
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

// Accepted file types per category
const ACCEPTED_FILE_TYPES = {
  resumes: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    accept: '.pdf',
    description: 'PDF files only'
  },
  coverLetters: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    accept: '.pdf',
    description: 'PDF files only'
  },
  portfolio: {
    mimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    extensions: ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.xls', '.xlsx'],
    accept: '.pdf,.png,.jpg,.jpeg,.gif,.webp,.xls,.xlsx',
    description: 'PDF, Images, Excel'
  }
};

let documents = {
  resumes: [],
  coverLetters: [],
  portfolio: []
};

let currentUploadCategory = null;
let currentPreviewDoc = null;
let currentPreviewPage = 1;
let pdfDoc = null;

// Initialize documents tab
async function initializeDocuments() {
  await loadDocuments();
  renderAllDocuments();
  updateStorageInfo();
  setupDocumentEventListeners();
}

// Load documents from storage
async function loadDocuments() {
  try {
    const result = await chrome.storage.local.get('userDocuments');
    if (result.userDocuments) {
      documents = result.userDocuments;
    }
  } catch (error) {
    console.error('Error loading documents:', error);
  }
}

// Save documents to storage
async function saveDocuments() {
  try {
    await chrome.storage.local.set({ userDocuments: documents });
    updateStorageInfo();
  } catch (error) {
    console.error('Error saving documents:', error);
  }
}

// Setup event listeners for documents tab
function setupDocumentEventListeners() {
  // Add document buttons
  document.getElementById('addResumeBtn').addEventListener('click', () => triggerFileUpload('resumes'));
  document.getElementById('addCoverLetterBtn').addEventListener('click', () => triggerFileUpload('coverLetters'));
  document.getElementById('addPortfolioBtn').addEventListener('click', () => triggerFileUpload('portfolio'));

  // File input change
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);

  // Preview modal controls
  document.getElementById('closePreviewBtn').addEventListener('click', closePreviewModal);
  document.getElementById('docPreviewOverlay').addEventListener('click', closePreviewModal);
  document.getElementById('downloadDocBtn').addEventListener('click', downloadCurrentDoc);
  document.getElementById('deleteDocBtn').addEventListener('click', deleteCurrentDoc);
  document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
  document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));

  // Cloud sync toggle
  document.getElementById('cloudSyncToggle').addEventListener('change', handleCloudSyncToggle);

  // Keyboard shortcuts for modal
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('docPreviewModal').classList.contains('hidden')) {
      if (e.key === 'Escape') closePreviewModal();
      if (e.key === 'ArrowLeft') changePage(-1);
      if (e.key === 'ArrowRight') changePage(1);
    }
  });
}

// Trigger file upload for a category
function triggerFileUpload(category) {
  if (documents[category].length >= DOCUMENT_LIMITS[category]) {
    alert(`Maximum ${DOCUMENT_LIMITS[category]} documents allowed in this category.`);
    return;
  }
  currentUploadCategory = category;
  // Set accept attribute based on category
  const fileInput = document.getElementById('fileInput');
  fileInput.setAttribute('accept', ACCEPTED_FILE_TYPES[category].accept);
  fileInput.click();
}

// Handle file selection
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const category = currentUploadCategory;
  const acceptedTypes = ACCEPTED_FILE_TYPES[category];

  // Validate file type based on category
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  const isValidType = acceptedTypes.mimeTypes.includes(file.type) ||
                      acceptedTypes.extensions.includes(fileExtension);

  if (!isValidType) {
    alert(`Invalid file type. Accepted: ${acceptedTypes.description}`);
    event.target.value = '';
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    alert('File size must be less than 10MB.');
    event.target.value = '';
    return;
  }

  try {
    // Read file as base64
    const base64Data = await readFileAsBase64(file);

    // Generate thumbnail based on file type
    let thumbnail = null;
    if (file.type.startsWith('image/')) {
      thumbnail = base64Data; // Use image itself as thumbnail
    } else if (file.type === 'application/pdf') {
      thumbnail = await generatePDFThumbnail(base64Data);
    }
    // Excel files get no thumbnail (will use placeholder)

    // Determine file type category for display
    let fileType = 'pdf';
    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet') ||
               fileExtension === '.xls' || fileExtension === '.xlsx') {
      fileType = 'excel';
    }

    // Create document object
    const doc = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      fileType: fileType,
      data: base64Data,
      thumbnail: thumbnail,
      createdAt: Date.now()
    };

    // Add to category
    documents[category].push(doc);

    // Save and render
    await saveDocuments();
    renderDocuments(category);
    updateDocumentCount(category);

  } catch (error) {
    console.error('Error uploading file:', error);
    alert('Error uploading file. Please try again.');
  }

  // Reset file input
  event.target.value = '';
  currentUploadCategory = null;
}

// Read file as base64
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate PDF thumbnail using canvas
async function generatePDFThumbnail(base64Data) {
  // For now, return null and use placeholder
  // In a full implementation, you would use PDF.js here
  return null;
}

// Render all document categories
function renderAllDocuments() {
  renderDocuments('resumes');
  renderDocuments('coverLetters');
  renderDocuments('portfolio');
  updateDocumentCount('resumes');
  updateDocumentCount('coverLetters');
  updateDocumentCount('portfolio');
}

// Render documents for a category
function renderDocuments(category) {
  const gridId = {
    resumes: 'resumesGrid',
    coverLetters: 'coverLettersGrid',
    portfolio: 'portfolioGrid'
  }[category];

  const grid = document.getElementById(gridId);
  const docs = documents[category];

  if (docs.length === 0) {
    // Show empty state
    const emptyStates = {
      resumes: `
        <div class="empty-docs-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
            <path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No resumes uploaded</p>
          <span>Click "Add" to upload your resume</span>
        </div>`,
      coverLetters: `
        <div class="empty-docs-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
            <path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No cover letters uploaded</p>
          <span>Click "Add" to upload a cover letter</span>
        </div>`,
      portfolio: `
        <div class="empty-docs-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
            <path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>No portfolio items uploaded</p>
          <span>Click "Add" to upload portfolio work</span>
        </div>`
    };
    grid.innerHTML = emptyStates[category];
    return;
  }

  // Render document cards
  grid.innerHTML = docs.map(doc => {
    const fileType = doc.fileType || 'pdf';
    let thumbnailHTML = '';

    if (doc.thumbnail) {
      // Use thumbnail if available (PDF generated or image file)
      thumbnailHTML = `<img src="${doc.thumbnail}" alt="${doc.name}">`;
    } else if (fileType === 'excel') {
      // Excel file placeholder
      thumbnailHTML = `
        <div class="doc-thumbnail-placeholder excel">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M3 9h18M9 3v18" stroke="currentColor" stroke-width="2"/>
            <path d="M12 12l3 3M15 12l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Excel</span>
        </div>`;
    } else if (fileType === 'image') {
      // Image without thumbnail (fallback)
      thumbnailHTML = `
        <div class="doc-thumbnail-placeholder image">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
            <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Image</span>
        </div>`;
    } else {
      // PDF placeholder
      thumbnailHTML = `
        <div class="doc-thumbnail-placeholder">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
            <path d="M14 2v6h6" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>PDF</span>
        </div>`;
    }

    return `
      <div class="doc-card"
           data-id="${doc.id}"
           data-category="${category}"
           data-file-type="${fileType}"
           draggable="true"
           title="${doc.name}">
        <div class="doc-drag-handle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
            <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <div class="doc-thumbnail">${thumbnailHTML}</div>
        <div class="doc-name">${truncateName(doc.name)}</div>
        <div class="doc-size">${formatFileSize(doc.size)}</div>
      </div>
    `;
  }).join('');

  // Add click listeners to doc cards
  grid.querySelectorAll('.doc-card').forEach(card => {
    card.addEventListener('click', () => openPreviewModal(card.dataset.id, card.dataset.category));

    // Drag and drop functionality
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
}

// Update document count display
function updateDocumentCount(category) {
  const countId = {
    resumes: 'resumeCount',
    coverLetters: 'coverLetterCount',
    portfolio: 'portfolioCount'
  }[category];

  const count = documents[category].length;
  const limit = DOCUMENT_LIMITS[category];
  document.getElementById(countId).textContent = `${count}/${limit}`;

  // Disable add button if at limit
  const btnId = {
    resumes: 'addResumeBtn',
    coverLetters: 'addCoverLetterBtn',
    portfolio: 'addPortfolioBtn'
  }[category];
  document.getElementById(btnId).disabled = count >= limit;
}

// Truncate filename for display
function truncateName(name) {
  const maxLength = 12;
  if (name.length <= maxLength) return name;
  const ext = name.split('.').pop();
  const baseName = name.slice(0, maxLength - ext.length - 4);
  return `${baseName}...${ext}`;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Update storage info
async function updateStorageInfo() {
  try {
    let totalSize = 0;

    // Calculate total size of all documents
    for (const category of Object.keys(documents)) {
      for (const doc of documents[category]) {
        totalSize += doc.size;
      }
    }

    // With unlimitedStorage, we show usage but not a strict limit
    const usedText = formatFileSize(totalSize);
    document.getElementById('storageUsed').textContent = usedText;
    document.getElementById('storageTotal').textContent = 'Unlimited';

    // Update storage bar (use 100MB as visual reference)
    const visualLimit = 100 * 1024 * 1024;
    const percentage = Math.min((totalSize / visualLimit) * 100, 100);
    const storageFill = document.getElementById('storageFill');
    storageFill.style.width = percentage + '%';

    // Add warning/danger classes
    storageFill.classList.remove('warning', 'danger');
    if (percentage > 90) {
      storageFill.classList.add('danger');
    } else if (percentage > 70) {
      storageFill.classList.add('warning');
    }
  } catch (error) {
    console.error('Error updating storage info:', error);
  }
}

// Open preview modal
function openPreviewModal(docId, category) {
  const doc = documents[category].find(d => d.id === docId);
  if (!doc) return;

  currentPreviewDoc = { ...doc, category };
  currentPreviewPage = 1;

  document.getElementById('previewDocName').textContent = doc.name;
  document.getElementById('docPreviewModal').classList.remove('hidden');

  // Render preview based on file type
  const fileType = doc.fileType || 'pdf';
  if (fileType === 'image') {
    renderImagePreview(doc.data, doc.name);
  } else if (fileType === 'excel') {
    renderExcelPreview(doc.name);
  } else {
    renderPDFPreview(doc.data);
  }
}

// Render image preview
function renderImagePreview(base64Data, name) {
  const previewContent = document.getElementById('docPreviewContent');

  previewContent.innerHTML = `
    <div class="image-preview-container">
      <img src="${base64Data}" alt="${name}" class="image-preview" />
    </div>
  `;

  // Hide page navigation for images
  document.getElementById('previewPageInfo').textContent = 'Image preview';
  document.getElementById('prevPageBtn').style.display = 'none';
  document.getElementById('nextPageBtn').style.display = 'none';
}

// Render Excel preview (placeholder since we can't preview Excel in browser)
function renderExcelPreview(name) {
  const previewContent = document.getElementById('docPreviewContent');

  previewContent.innerHTML = `
    <div class="excel-preview-placeholder">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M3 9h18M9 3v18" stroke="currentColor" stroke-width="2"/>
        <path d="M12 12l3 3M15 12l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <h4>Excel File</h4>
      <p>${name}</p>
      <span class="excel-hint">Preview not available for Excel files.<br>Click Download to open in Excel.</span>
    </div>
  `;

  // Hide page navigation for Excel
  document.getElementById('previewPageInfo').textContent = 'Excel file';
  document.getElementById('prevPageBtn').style.display = 'none';
  document.getElementById('nextPageBtn').style.display = 'none';
}

// Render PDF preview using iframe
function renderPDFPreview(base64Data) {
  const previewContent = document.getElementById('docPreviewContent');

  // Create blob from base64
  const byteCharacters = atob(base64Data.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  // Use embed element for PDF preview
  previewContent.innerHTML = `
    <embed
      src="${blobUrl}#toolbar=0&navpanes=0"
      type="application/pdf"
      width="100%"
      height="100%"
      style="border: none; border-radius: 8px;"
    />
  `;

  // Hide page navigation since embed handles it
  document.getElementById('previewPageInfo').textContent = 'Use scroll to navigate';
  document.getElementById('prevPageBtn').style.display = 'none';
  document.getElementById('nextPageBtn').style.display = 'none';
}

// Close preview modal
function closePreviewModal() {
  document.getElementById('docPreviewModal').classList.add('hidden');
  document.getElementById('docPreviewContent').innerHTML = '';
  currentPreviewDoc = null;
  currentPreviewPage = 1;
  pdfDoc = null;

  // Reset page nav visibility
  document.getElementById('prevPageBtn').style.display = '';
  document.getElementById('nextPageBtn').style.display = '';
}

// Change page in preview
function changePage(delta) {
  if (!pdfDoc) return;

  const newPage = currentPreviewPage + delta;
  if (newPage < 1 || newPage > pdfDoc.numPages) return;

  currentPreviewPage = newPage;
  // Re-render page would go here with PDF.js
}

// Download current document
function downloadCurrentDoc() {
  if (!currentPreviewDoc) return;

  const link = document.createElement('a');
  link.href = currentPreviewDoc.data;
  link.download = currentPreviewDoc.name;
  link.click();
}

// Delete current document
async function deleteCurrentDoc() {
  if (!currentPreviewDoc) return;

  if (!confirm(`Are you sure you want to delete "${currentPreviewDoc.name}"?`)) return;

  const category = currentPreviewDoc.category;
  documents[category] = documents[category].filter(d => d.id !== currentPreviewDoc.id);

  await saveDocuments();
  renderDocuments(category);
  updateDocumentCount(category);
  closePreviewModal();
}

// Drag and drop handlers
function handleDragStart(event) {
  const card = event.target.closest('.doc-card');
  if (!card) return;

  card.classList.add('dragging');

  const docId = card.dataset.id;
  const category = card.dataset.category;
  const doc = documents[category].find(d => d.id === docId);

  if (!doc) return;

  // Determine MIME type based on file type
  const mimeType = doc.type || 'application/pdf';

  // Set drag data - the file data for dropping into other applications
  event.dataTransfer.setData('text/plain', doc.name);
  event.dataTransfer.setData(mimeType, doc.data);

  // Create a file from the base64 data for drag-and-drop
  try {
    const byteCharacters = atob(doc.data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new File([byteArray], doc.name, { type: mimeType });

    // For some browsers, we can set the file directly
    if (event.dataTransfer.items) {
      event.dataTransfer.items.add(file);
    }
  } catch (error) {
    console.error('Error setting drag data:', error);
  }

  event.dataTransfer.effectAllowed = 'copy';
}

function handleDragEnd(event) {
  const card = event.target.closest('.doc-card');
  if (card) {
    card.classList.remove('dragging');
  }
}

// Cloud sync toggle handler
async function handleCloudSyncToggle(event) {
  const isEnabled = event.target.checked;
  const statusElement = document.getElementById('syncStatus');

  if (isEnabled) {
    // Check if user is authenticated
    const { authToken } = await chrome.storage.local.get('authToken');

    if (!authToken) {
      alert('Please log in to JobFiltr to enable cloud sync.');
      event.target.checked = false;
      return;
    }

    statusElement.textContent = 'Syncing...';

    try {
      // Sync documents to cloud (placeholder for actual implementation)
      await syncDocumentsToCloud();
      statusElement.textContent = 'Synced to cloud';

      // Save sync preference
      await chrome.storage.local.set({ cloudSyncEnabled: true });
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      statusElement.textContent = 'Sync failed';
      event.target.checked = false;
    }
  } else {
    statusElement.textContent = 'Local only';
    await chrome.storage.local.set({ cloudSyncEnabled: false });
  }
}

// Sync documents to cloud (placeholder)
async function syncDocumentsToCloud() {
  // This would integrate with Convex backend
  // For now, just simulate a sync
  return new Promise(resolve => setTimeout(resolve, 1000));
}

// Load cloud sync preference
async function loadCloudSyncPreference() {
  try {
    const result = await chrome.storage.local.get(['cloudSyncEnabled', 'authToken']);

    if (result.cloudSyncEnabled && result.authToken) {
      document.getElementById('cloudSyncToggle').checked = true;
      document.getElementById('syncStatus').textContent = 'Synced to cloud';
    }
  } catch (error) {
    console.error('Error loading sync preference:', error);
  }
}

// Initialize documents when tab is shown
document.querySelector('[data-tab="documents"]')?.addEventListener('click', () => {
  if (!documents.resumes.length && !documents.coverLetters.length && !documents.portfolio.length) {
    initializeDocuments();
  }
});

// Initialize on DOMContentLoaded (deferred)
document.addEventListener('DOMContentLoaded', () => {
  // Defer documents initialization until tab is accessed
  setTimeout(() => {
    initializeDocuments();
    loadCloudSyncPreference();
  }, 100);
});
