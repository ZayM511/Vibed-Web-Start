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

// ===== TOAST NOTIFICATIONS =====
function showToast({ type = 'info', title, message, duration = 5000 }) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    min-width: 250px;
    max-width: 350px;
    animation: slideIn 0.3s ease-out;
  `;

  toast.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
    <div style="font-size: 13px; opacity: 0.95;">${message}</div>
  `;

  toastContainer.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Add animation styles
if (!document.getElementById('toastStyles')) {
  const style = document.createElement('style');
  style.id = 'toastStyles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

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
      // Trigger notification on content scripts (first sign-in = bottom-right notification)
      triggerJobFiltrActiveNotification(true);
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
async function triggerJobFiltrActiveNotification(isFirstSignIn = false) {
  try {
    // Get the active tab and send message to show notification
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: 'JobFiltr Is Active',
        isFirstSignIn: isFirstSignIn
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
let ownWindowId = null; // Track our own window ID for exclusion

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

    // Track our own window ID so we can exclude it from tab queries
    chrome.windows.getCurrent().then(win => {
      ownWindowId = win.id;
      console.log('Panel window ID:', ownWindowId);
    });
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
  try {
    if (isPanelMode) {
      // Already in panel mode, switch to left dock
      const response = await chrome.runtime.sendMessage({
        action: 'repositionPanel',
        dock: 'left'
      });
      if (response?.success) {
        document.body.classList.remove('docked-right');
        document.body.classList.add('docked-left');
        currentDockSide = 'left';
      } else {
        console.error('Failed to reposition panel:', response?.error);
      }
    } else {
      // Open as panel window docked to left
      const response = await chrome.runtime.sendMessage({
        action: 'openPanel',
        dock: 'left'
      });
      if (response?.success) {
        window.close(); // Close popup only if panel opened successfully
      } else {
        console.error('Failed to open panel:', response?.error);
      }
    }
  } catch (error) {
    console.error('Error pinning to left:', error);
  }
});

// Pin to right side
document.getElementById('pinRightBtn').addEventListener('click', async () => {
  try {
    if (isPanelMode) {
      // Already in panel mode, switch to right dock
      const response = await chrome.runtime.sendMessage({
        action: 'repositionPanel',
        dock: 'right'
      });
      if (response?.success) {
        document.body.classList.remove('docked-left');
        document.body.classList.add('docked-right');
        currentDockSide = 'right';
      } else {
        console.error('Failed to reposition panel:', response?.error);
      }
    } else {
      // Open as panel window docked to right
      const response = await chrome.runtime.sendMessage({
        action: 'openPanel',
        dock: 'right'
      });
      if (response?.success) {
        window.close(); // Close popup only if panel opened successfully
      } else {
        console.error('Failed to open panel:', response?.error);
      }
    }
  } catch (error) {
    console.error('Error pinning to right:', error);
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

// Helper function to safely get active job tab (handles service worker being inactive)
async function safeGetActiveJobTab() {
  // First try background script (most reliable)
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getActiveJobTab' });
    if (response && response.tab) {
      return response.tab;
    }
  } catch (error) {
    // Service worker may be inactive - this is expected in MV3
    console.log('Background script not available, using fallback');
  }

  // Fallback: query tabs directly, excluding our own panel window
  // Get all normal (non-popup) windows
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });

  // Sort by focused status to prioritize the currently focused browser window
  windows.sort((a, b) => (b.focused ? 1 : 0) - (a.focused ? 1 : 0));

  // Check each window for a job site tab
  for (const win of windows) {
    // Skip our own window if we know it
    if (ownWindowId && win.id === ownWindowId) continue;

    const tabs = await chrome.tabs.query({ active: true, windowId: win.id });
    const jobTab = tabs.find(t =>
      t.url &&
      !t.url.startsWith('chrome-extension://') &&
      (t.url.includes('linkedin.com') || t.url.includes('indeed.com') || t.url.includes('google.com/search'))
    );

    if (jobTab) {
      return jobTab;
    }
  }

  // Final fallback: any active tab in any window that's not extension URL
  const allActiveTabs = await chrome.tabs.query({ active: true });
  const validTab = allActiveTabs.find(t =>
    t.url &&
    !t.url.startsWith('chrome-extension://') &&
    t.windowId !== ownWindowId
  );

  return validTab || null;
}

async function detectCurrentSite() {
  try {
    let tab;

    if (isPanelMode) {
      // In panel mode, use helper to safely get active tab
      tab = await safeGetActiveJobTab();
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

  // Remove any existing beta badge
  const existingBetaBadge = siteStatus.querySelector('.site-beta-badge');
  if (existingBetaBadge) {
    existingBetaBadge.remove();
  }

  if (site) {
    siteStatus.classList.add('active');
    const siteNames = {
      'linkedin': 'LinkedIn',
      'indeed': 'Indeed',
      'google-jobs': 'Google Jobs'
    };
    currentSiteText.textContent = `Active on ${siteNames[site]}`;

    // Add beta badge for LinkedIn
    if (site === 'linkedin') {
      const betaBadge = document.createElement('span');
      betaBadge.className = 'site-beta-badge';
      betaBadge.textContent = 'Beta';
      betaBadge.title = 'LinkedIn support is in beta - some features may be limited';
      siteStatus.appendChild(betaBadge);
    }

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
        const tab = await safeGetActiveJobTab();
        tabId = tab?.id;
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
let filtersInitialized = false; // Track if filters have been loaded

async function initializeFilters() {
  await detectCurrentSite();
  // Always reload from storage to get latest saved settings
  // (auto-save ensures our changes are persisted before tab switch)
  await loadFilterSettings();
  updateFilterStats();
  filtersInitialized = true;
}

async function loadFilterSettings() {
  try {
    const result = await chrome.storage.local.get('filterSettings');
    filterSettings = result.filterSettings || {};

    // DEBUG: Log what we're loading from storage
    console.log('%c[JobFiltr Popup] loadFilterSettings from storage', 'background: #009688; color: white; padding: 2px 6px;');
    console.log('  filterIncludeKeywords:', filterSettings.filterIncludeKeywords);
    console.log('  includeKeywords:', JSON.stringify(filterSettings.includeKeywords));
    console.log('  filterExcludeKeywords:', filterSettings.filterExcludeKeywords);
    console.log('  excludeKeywords:', JSON.stringify(filterSettings.excludeKeywords));

    // Apply saved settings to UI
    document.getElementById('filterStaffing').checked = filterSettings.hideStaffing || false;
    // Staffing display mode (default to 'hide')
    const staffingMode = filterSettings.staffingDisplayMode || 'hide';
    document.getElementById('staffingDisplayMode').value = staffingMode;
    document.getElementById('filterSponsored').checked = filterSettings.hideSponsored || false;

    // Initialize sponsored stats section
    const sponsoredStats = document.getElementById('sponsoredStats');
    if (sponsoredStats) {
      // Show stats section only if filter is enabled
      sponsoredStats.classList.toggle('hidden', !filterSettings.hideSponsored);
      // Request sponsored count from content script for initial preview
      if (filterSettings.hideSponsored) {
        requestSponsoredCount();
      }
    }

    document.getElementById('filterEarlyApplicant').checked = filterSettings.filterEarlyApplicant || false;
    // Request early applicant count from content script for initial preview
    if (filterSettings.filterEarlyApplicant) {
      requestEarlyApplicantCount();
    }

    // True Remote Accuracy settings
    document.getElementById('filterTrueRemote').checked = filterSettings.trueRemoteAccuracy || false;
    document.getElementById('excludeHybrid').checked = filterSettings.excludeHybrid !== false; // Default true
    document.getElementById('excludeOnsite').checked = filterSettings.excludeOnsite !== false; // Default true
    document.getElementById('excludeInOffice').checked = filterSettings.excludeInOffice !== false; // Default true
    document.getElementById('excludeInPerson').checked = filterSettings.excludeInPerson !== false; // Default true
    document.getElementById('showWorkTypeUnclear').checked = filterSettings.showWorkTypeUnclear !== false; // Default true

    document.getElementById('filterIncludeKeywords').checked = filterSettings.filterIncludeKeywords || false;
    document.getElementById('filterExcludeKeywords').checked = filterSettings.filterExcludeKeywords || false;
    document.getElementById('filterSalary').checked = filterSettings.filterSalary || false;
    document.getElementById('minSalary').value = filterSettings.minSalary || '';
    document.getElementById('maxSalary').value = filterSettings.maxSalary || '';
    document.getElementById('salaryPeriod').value = filterSettings.salaryPeriod || 'yearly';
    document.getElementById('hideNoSalary').checked = filterSettings.hideNoSalary || false;
    document.getElementById('normalizePartTime').checked = filterSettings.normalizePartTime || false;
    document.getElementById('filterActiveRecruiting').checked = filterSettings.showActiveRecruiting || false;
    document.getElementById('filterJobAge').checked = filterSettings.showJobAge || false;
    document.getElementById('filterApplied').checked = filterSettings.hideApplied || false;
    document.getElementById('filterUrgentlyHiring').checked = filterSettings.filterUrgentlyHiring || false;
    document.getElementById('filterVisa').checked = filterSettings.visaOnly || false;

    // Show/blur Urgently Hiring filter based on site (Indeed only)
    // On LinkedIn: show as blurred/unavailable instead of hiding
    const urgentlyHiringFilter = document.getElementById('urgentlyHiringFilter');
    const urgentlyHiringStats = document.getElementById('urgentlyHiringStats');
    if (urgentlyHiringFilter) {
      if (currentSite === 'indeed') {
        // Indeed: Show filter normally
        urgentlyHiringFilter.classList.remove('hidden');
        urgentlyHiringFilter.classList.remove('platform-unavailable');
        // Show stats section only if filter is enabled
        if (urgentlyHiringStats) {
          urgentlyHiringStats.classList.toggle('hidden', !filterSettings.filterUrgentlyHiring);
        }
        // Request urgently hiring count from content script (always for initial preview)
        requestUrgentlyHiringCount();
      } else if (currentSite === 'linkedin') {
        // LinkedIn: Show filter but blurred/unavailable
        urgentlyHiringFilter.classList.remove('hidden');
        urgentlyHiringFilter.classList.add('platform-unavailable');
        if (urgentlyHiringStats) urgentlyHiringStats.classList.add('hidden');
      } else {
        // Other sites: Hide completely
        urgentlyHiringFilter.classList.add('hidden');
        urgentlyHiringFilter.classList.remove('platform-unavailable');
        if (urgentlyHiringStats) urgentlyHiringStats.classList.add('hidden');
      }
    }

    // Show/hide Visa Sponsorship stats when filter is enabled
    const visaSponsorshipStats = document.getElementById('visaSponsorshipStats');
    if (visaSponsorshipStats && filterSettings.visaOnly) {
      visaSponsorshipStats.classList.remove('hidden');
      // Request visa sponsorship count from content script
      requestVisaSponsorshipCount();
    } else if (visaSponsorshipStats) {
      visaSponsorshipStats.classList.add('hidden');
    }

    // Benefits Indicator
    document.getElementById('showBenefitsIndicator').checked = filterSettings.showBenefitsIndicator || false;
    updateBenefitsLegend(filterSettings.showBenefitsIndicator || false);

    // Hide benefits indicator toggle for Indeed (LinkedIn only feature)
    if (currentSite === 'indeed') {
      const benefitsToggle = document.querySelector('#showBenefitsIndicator')?.closest('.filter-item');
      if (benefitsToggle) {
        benefitsToggle.classList.add('hidden');
      }
    }

    // Early Applicant Display Mode
    if (document.getElementById('earlyApplicantDisplayMode')) {
      document.getElementById('earlyApplicantDisplayMode').value = filterSettings.earlyApplicantDisplayMode || 'hide';
    }

    // Job Posting Age Filter
    document.getElementById('filterPostingAge').checked = filterSettings.filterPostingAge || false;
    document.getElementById('postingAgeRange').value = filterSettings.postingAgeRange || '1w';

    // Ghost Job Analysis Settings (default enabled)
    const enableGhostAnalysis = filterSettings.enableGhostAnalysis !== false; // Default true
    const showCommunityReportedWarnings = filterSettings.showCommunityReportedWarnings !== false; // Default true
    document.getElementById('enableGhostAnalysis').checked = enableGhostAnalysis;
    document.getElementById('showCommunityReportedWarnings').checked = showCommunityReportedWarnings;
    updateGhostSettingsState(enableGhostAnalysis);

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
  document.getElementById('staffingDisplayMode').value = 'hide';
  document.getElementById('filterSponsored').checked = false;
  document.getElementById('filterEarlyApplicant').checked = false;

  // True Remote Accuracy settings
  document.getElementById('filterTrueRemote').checked = false;
  document.getElementById('excludeHybrid').checked = true;
  document.getElementById('excludeOnsite').checked = true;
  document.getElementById('excludeInOffice').checked = true;
  document.getElementById('excludeInPerson').checked = true;
  document.getElementById('showWorkTypeUnclear').checked = true;

  document.getElementById('filterIncludeKeywords').checked = false;
  document.getElementById('filterExcludeKeywords').checked = false;
  document.getElementById('filterSalary').checked = false;
  document.getElementById('minSalary').value = '';
  document.getElementById('maxSalary').value = '';
  document.getElementById('salaryPeriod').value = 'yearly';
  document.getElementById('hideNoSalary').checked = false;
  document.getElementById('normalizePartTime').checked = false;
  document.getElementById('filterActiveRecruiting').checked = false;
  document.getElementById('filterJobAge').checked = false;
  document.getElementById('filterApplied').checked = false;
  document.getElementById('filterUrgentlyHiring').checked = false;
  document.getElementById('filterVisa').checked = false;

  // Hide Urgently Hiring stats on reset
  const urgentlyHiringStats = document.getElementById('urgentlyHiringStats');
  if (urgentlyHiringStats) urgentlyHiringStats.classList.add('hidden');

  // Hide Visa Sponsorship stats on reset
  const visaSponsorshipStats = document.getElementById('visaSponsorshipStats');
  if (visaSponsorshipStats) visaSponsorshipStats.classList.add('hidden');

  // Hide Sponsored stats on reset
  const sponsoredStats = document.getElementById('sponsoredStats');
  if (sponsoredStats) sponsoredStats.classList.add('hidden');

  // Benefits Indicator
  document.getElementById('showBenefitsIndicator').checked = false;
  updateBenefitsLegend(false);

  // Early Applicant Display Mode
  if (document.getElementById('earlyApplicantDisplayMode')) {
    document.getElementById('earlyApplicantDisplayMode').value = 'hide';
  }

  // Job Posting Age Filter
  document.getElementById('filterPostingAge').checked = false;
  document.getElementById('postingAgeRange').value = '1w';

  // Ghost Job Analysis Settings (reset to enabled by default)
  document.getElementById('enableGhostAnalysis').checked = true;
  document.getElementById('showCommunityReportedWarnings').checked = true;
  updateGhostSettingsState(true);

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

// ===== URGENTLY HIRING FILTER UX =====
// Request count of urgently hiring jobs from content script for UX improvements
async function requestUrgentlyHiringCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.includes('indeed.com')) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'COUNT_URGENTLY_HIRING' });
    if (response?.success && response.data) {
      updateUrgentlyHiringStats(response.data);
    }
  } catch (error) {
    console.log('Could not get urgently hiring count:', error);
    // Hide stats section if we can't get data
    const statsSection = document.getElementById('urgentlyHiringStats');
    if (statsSection) statsSection.classList.add('hidden');
  }
}

// Update the UI with urgently hiring job counts
function updateUrgentlyHiringStats(counts) {
  const statsSection = document.getElementById('urgentlyHiringStats');
  const countText = document.getElementById('urgentlyHiringCountText');
  const countDiv = document.querySelector('.urgently-hiring-count');
  const hintText = document.getElementById('urgentlyHiringHint');

  if (!statsSection || !countText || !hintText) return;

  // Show the stats section
  statsSection.classList.remove('hidden');

  // Update the count text
  if (counts.urgent === 0) {
    countText.textContent = `0 of ${counts.total} jobs are urgently hiring`;
    countDiv?.classList.add('no-urgent');
    countDiv?.classList.remove('has-urgent');
    hintText.textContent = 'No "Urgently Hiring" badges found on this page. Try searching with "urgently hiring" as a keyword, or navigate to a different page.';
    hintText.className = 'urgently-hiring-hint warning';
  } else {
    countText.textContent = `${counts.urgent} of ${counts.total} jobs are urgently hiring (${counts.percentage}%)`;
    countDiv?.classList.add('has-urgent');
    countDiv?.classList.remove('no-urgent');

    if (counts.percentage < 20) {
      hintText.textContent = `Only ${counts.percentage}% of jobs on this page have the badge. Enabling this filter will hide ${counts.total - counts.urgent} jobs.`;
      hintText.className = 'urgently-hiring-hint warning';
    } else {
      hintText.textContent = `Enabling this filter will show only the ${counts.urgent} urgently hiring jobs.`;
      hintText.className = 'urgently-hiring-hint info';
    }
  }
}

// Handle urgently hiring checkbox change
document.getElementById('filterUrgentlyHiring')?.addEventListener('change', (e) => {
  const statsSection = document.getElementById('urgentlyHiringStats');

  if (e.target.checked) {
    // Show stats when enabled
    if (statsSection) statsSection.classList.remove('hidden');
    // Refresh the count
    requestUrgentlyHiringCount();
  } else {
    // Hide stats when disabled
    if (statsSection) statsSection.classList.add('hidden');
  }

  saveFilterSettings();
});

// ===== VISA SPONSORSHIP FILTER UX =====
// Request count of visa sponsorship jobs from content script for UX improvements
async function requestVisaSponsorshipCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Works on both LinkedIn and Indeed
    const isJobSite = tab.url?.includes('linkedin.com') || tab.url?.includes('indeed.com');
    if (!isJobSite) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'COUNT_VISA_SPONSORSHIP' });
    if (response?.success && response.data) {
      updateVisaSponsorshipStats(response.data);
    }
  } catch (error) {
    console.log('Could not get visa sponsorship count:', error);
    // Show fallback message if we can't get data
    const statsSection = document.getElementById('visaSponsorshipStats');
    const infoText = document.getElementById('visaSponsorshipInfoText');
    const hintText = document.getElementById('visaSponsorshipHint');
    const infoDiv = document.querySelector('.visa-sponsorship-info');

    if (statsSection) {
      statsSection.classList.remove('hidden');
      if (infoDiv) infoDiv.className = 'visa-sponsorship-info';
      if (infoText) infoText.textContent = 'Scanning page...';
      if (hintText) {
        hintText.textContent = 'Visa sponsorship info is typically found in full job descriptions. Jobs without explicit "visa sponsorship" mentions will be hidden.';
        hintText.className = 'visa-sponsorship-hint warning';
      }
    }
  }
}

// Update the UI with visa sponsorship job counts
function updateVisaSponsorshipStats(counts) {
  const statsSection = document.getElementById('visaSponsorshipStats');
  const infoText = document.getElementById('visaSponsorshipInfoText');
  const infoDiv = document.querySelector('.visa-sponsorship-info');
  const hintText = document.getElementById('visaSponsorshipHint');

  if (!statsSection || !infoText || !hintText) return;

  // Show the stats section
  statsSection.classList.remove('hidden');

  // Update the count text and styling
  if (counts.visa === 0) {
    infoText.textContent = `0 of ${counts.total} jobs mention visa sponsorship`;
    infoDiv?.classList.add('no-visa');
    infoDiv?.classList.remove('has-visa');
    hintText.textContent = 'No jobs on this page explicitly mention visa sponsorship. Visa info is typically found in full job descriptions. Try searching with "visa sponsorship" or "H1B" as keywords, or click on jobs to load their full descriptions.';
    hintText.className = 'visa-sponsorship-hint warning';
  } else {
    infoText.textContent = `${counts.visa} of ${counts.total} jobs mention visa sponsorship (${counts.percentage}%)`;
    infoDiv?.classList.add('has-visa');
    infoDiv?.classList.remove('no-visa');

    if (counts.percentage < 20) {
      hintText.textContent = `Only ${counts.percentage}% of jobs on this page mention sponsorship. Enabling this filter will hide ${counts.total - counts.visa} jobs. Click on more jobs to load their full descriptions for better detection.`;
      hintText.className = 'visa-sponsorship-hint warning';
    } else {
      hintText.textContent = `Enabling this filter will show only the ${counts.visa} jobs that mention visa sponsorship.`;
      hintText.className = 'visa-sponsorship-hint info';
    }
  }
}

// Handle visa sponsorship checkbox change
document.getElementById('filterVisa')?.addEventListener('change', (e) => {
  const statsSection = document.getElementById('visaSponsorshipStats');

  if (e.target.checked) {
    // Show stats when enabled
    if (statsSection) statsSection.classList.remove('hidden');
    // Request the count from content script
    requestVisaSponsorshipCount();
  } else {
    // Hide stats when disabled
    if (statsSection) statsSection.classList.add('hidden');
  }

  saveFilterSettings();
});

// ===== EARLY APPLICANT FILTER UX =====
// Request count of early applicant jobs from content script for UX improvements
async function requestEarlyApplicantCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Works on both Indeed and LinkedIn
    const isJobSite = tab.url?.includes('indeed.com') || tab.url?.includes('linkedin.com');
    if (!isJobSite) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'COUNT_EARLY_APPLICANT' });
    if (response?.success && response.data) {
      updateEarlyApplicantStats(response.data);
    }
  } catch (error) {
    console.log('Could not get early applicant count:', error);
    // Hide stats section if we can't get data
    const statsSection = document.getElementById('earlyApplicantStats');
    if (statsSection) statsSection.classList.add('hidden');
  }
}

// Update the UI with early applicant job counts
function updateEarlyApplicantStats(counts) {
  const statsSection = document.getElementById('earlyApplicantStats');
  const countText = document.getElementById('earlyApplicantCountText');
  const countDiv = document.querySelector('.early-applicant-count');
  const hintText = document.getElementById('earlyApplicantHint');

  if (!statsSection || !countText || !hintText) return;

  // Show the stats section
  statsSection.classList.remove('hidden');

  // Update the count text
  if (counts.early === 0) {
    countText.textContent = `0 of ${counts.total} jobs have early applicant status`;
    countDiv?.classList.add('no-early');
    countDiv?.classList.remove('has-early');
    hintText.textContent = 'No early applicant opportunities found on this page. Try refreshing or navigating to a different page with fresher job listings.';
    hintText.className = 'early-applicant-hint warning';
  } else {
    countText.textContent = `${counts.early} of ${counts.total} jobs are early applicant opportunities (${counts.percentage}%)`;
    countDiv?.classList.add('has-early');
    countDiv?.classList.remove('no-early');

    if (counts.percentage < 20) {
      hintText.textContent = `Only ${counts.percentage}% of jobs on this page are early applicant opportunities. Enabling this filter will hide ${counts.total - counts.early} jobs.`;
      hintText.className = 'early-applicant-hint warning';
    } else {
      hintText.textContent = `Enabling this filter will show only the ${counts.early} early applicant jobs.`;
      hintText.className = 'early-applicant-hint info';
    }
  }
}

// Handle early applicant checkbox change
document.getElementById('filterEarlyApplicant')?.addEventListener('change', (e) => {
  const statsSection = document.getElementById('earlyApplicantStats');

  if (e.target.checked) {
    // Show stats when enabled
    if (statsSection) statsSection.classList.remove('hidden');
    // Refresh the count
    requestEarlyApplicantCount();
  } else {
    // Hide stats when disabled
    if (statsSection) statsSection.classList.add('hidden');
  }

  saveFilterSettings();
});

// ===== SPONSORED/PROMOTED FILTER UX =====
// Request count of sponsored jobs from content script for UX improvements
async function requestSponsoredCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    // Works on both Indeed and LinkedIn
    const isJobSite = tab.url?.includes('indeed.com') || tab.url?.includes('linkedin.com');
    if (!isJobSite) return;

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'COUNT_SPONSORED_JOBS' });
    if (response?.success && response.data) {
      updateSponsoredStats(response.data);
    }
  } catch (error) {
    console.log('Could not get sponsored count:', error);
    // Hide stats section if we can't get data
    const statsSection = document.getElementById('sponsoredStats');
    if (statsSection) statsSection.classList.add('hidden');
  }
}

// Update the UI with sponsored job counts
function updateSponsoredStats(counts) {
  const statsSection = document.getElementById('sponsoredStats');
  const countText = document.getElementById('sponsoredCountText');
  const countDiv = document.querySelector('.sponsored-count');
  const hintText = document.getElementById('sponsoredHint');

  if (!statsSection || !countText || !hintText) return;

  // Show the stats section
  statsSection.classList.remove('hidden');

  // Update the count text
  if (counts.sponsored === 0) {
    countText.textContent = `0 of ${counts.total} jobs are sponsored`;
    countDiv?.classList.add('no-sponsored');
    countDiv?.classList.remove('has-sponsored');
    hintText.textContent = 'No sponsored/promoted jobs detected on this page. This filter won\'t hide any jobs.';
    hintText.className = 'sponsored-hint success';
  } else {
    countText.textContent = `${counts.sponsored} of ${counts.total} jobs are sponsored (${counts.percentage}%)`;
    countDiv?.classList.add('has-sponsored');
    countDiv?.classList.remove('no-sponsored');

    if (counts.percentage >= 50) {
      hintText.textContent = `Warning: ${counts.percentage}% of jobs on this page are sponsored. Enabling this filter will hide ${counts.sponsored} jobs.`;
      hintText.className = 'sponsored-hint warning';
    } else if (counts.percentage >= 20) {
      hintText.textContent = `${counts.sponsored} sponsored jobs will be hidden when this filter is enabled.`;
      hintText.className = 'sponsored-hint info';
    } else {
      hintText.textContent = `Only ${counts.sponsored} sponsored job(s) found. This filter will have minimal impact.`;
      hintText.className = 'sponsored-hint info';
    }
  }
}

// Handle sponsored filter checkbox change
document.getElementById('filterSponsored')?.addEventListener('change', (e) => {
  const statsSection = document.getElementById('sponsoredStats');

  if (e.target.checked) {
    // Show stats when enabled
    if (statsSection) statsSection.classList.remove('hidden');
    // Refresh the count
    requestSponsoredCount();
  } else {
    // Hide stats when disabled
    if (statsSection) statsSection.classList.add('hidden');
  }

  saveFilterSettings();
});

// Ghost Job Analysis settings toggle
function updateGhostSettingsState(enabled) {
  const optionsSection = document.getElementById('ghostSettingsOptions');
  if (optionsSection) {
    optionsSection.classList.toggle('disabled', !enabled);
  }
}

document.getElementById('enableGhostAnalysis')?.addEventListener('change', (e) => {
  updateGhostSettingsState(e.target.checked);
  saveFilterSettings();
});

document.getElementById('showCommunityReportedWarnings')?.addEventListener('change', () => {
  saveFilterSettings();
});

async function saveFilterSettings() {
  // KEYWORD DEBUG: Log global arrays at the START of saveFilterSettings
  console.log('%c[JobFiltr Popup] saveFilterSettings called', 'background: #3F51B5; color: white; padding: 2px 6px;');
  console.log('  Global includeKeywords array at start:', JSON.stringify(includeKeywords));
  console.log('  Global excludeKeywords array at start:', JSON.stringify(excludeKeywords));
  console.log('  Include checkbox element:', document.getElementById('filterIncludeKeywords'));
  console.log('  Include checkbox checked:', document.getElementById('filterIncludeKeywords')?.checked);

  // DEBUG: Log each checkbox element and its state
  const debugCheckboxes = {
    filterStaffing: document.getElementById('filterStaffing'),
    filterSponsored: document.getElementById('filterSponsored'),
    filterEarlyApplicant: document.getElementById('filterEarlyApplicant'),
    filterTrueRemote: document.getElementById('filterTrueRemote'),
    filterJobAge: document.getElementById('filterJobAge'),
    filterPostingAge: document.getElementById('filterPostingAge'),
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator')
  };

  console.log('%c[JobFiltr Popup] DEBUG: Checkbox elements and states:', 'background: #FF5722; color: white; padding: 2px 6px;');
  for (const [name, el] of Object.entries(debugCheckboxes)) {
    console.log(`  ${name}: element=${el ? 'FOUND' : 'NULL'}, checked=${el?.checked}`);
  }

  filterSettings = {
    hideStaffing: document.getElementById('filterStaffing')?.checked || false,
    staffingDisplayMode: document.getElementById('staffingDisplayMode')?.value || 'hide',
    hideSponsored: document.getElementById('filterSponsored')?.checked || false,
    filterEarlyApplicant: document.getElementById('filterEarlyApplicant')?.checked || false,
    // True Remote Accuracy settings
    trueRemoteAccuracy: document.getElementById('filterTrueRemote')?.checked || false,
    excludeHybrid: document.getElementById('excludeHybrid')?.checked ?? true,
    excludeOnsite: document.getElementById('excludeOnsite')?.checked ?? true,
    excludeInOffice: document.getElementById('excludeInOffice')?.checked ?? true,
    excludeInPerson: document.getElementById('excludeInPerson')?.checked ?? true,
    showWorkTypeUnclear: document.getElementById('showWorkTypeUnclear')?.checked ?? true,
    filterIncludeKeywords: document.getElementById('filterIncludeKeywords')?.checked || false,
    filterExcludeKeywords: document.getElementById('filterExcludeKeywords')?.checked || false,
    // CRITICAL: Use spread to create COPIES of arrays, not references
    // This prevents issues if global arrays are reassigned later
    includeKeywords: [...includeKeywords],
    excludeKeywords: [...excludeKeywords],
    filterSalary: document.getElementById('filterSalary')?.checked || false,
    minSalary: document.getElementById('minSalary')?.value || '',
    maxSalary: document.getElementById('maxSalary')?.value || '',
    salaryPeriod: document.getElementById('salaryPeriod')?.value || 'yearly',
    hideNoSalary: document.getElementById('hideNoSalary')?.checked || false,
    normalizePartTime: document.getElementById('normalizePartTime')?.checked || false,
    showActiveRecruiting: document.getElementById('filterActiveRecruiting')?.checked || false,
    hideStalePostings: document.getElementById('hideStalePostings')?.checked || false, // Option to hide 30+ day old postings
    showJobAge: document.getElementById('filterJobAge')?.checked || false,
    hideApplied: document.getElementById('filterApplied')?.checked || false,
    filterUrgentlyHiring: document.getElementById('filterUrgentlyHiring')?.checked || false,
    visaOnly: document.getElementById('filterVisa')?.checked || false,
    // Benefits Indicator
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator')?.checked || false,
    // Early Applicant Display Mode
    earlyApplicantDisplayMode: document.getElementById('earlyApplicantDisplayMode')?.value || 'hide',
    // Job Posting Age Filter
    filterPostingAge: document.getElementById('filterPostingAge')?.checked || false,
    postingAgeRange: document.getElementById('postingAgeRange')?.value || '1w',
    // Ghost Job Analysis Settings
    enableGhostAnalysis: document.getElementById('enableGhostAnalysis')?.checked ?? true,
    showCommunityReportedWarnings: document.getElementById('showCommunityReportedWarnings')?.checked ?? true
  };

  // DEBUG: Log the settings object being saved
  console.log('%c[JobFiltr Popup] Saving filter settings:', 'background: #4CAF50; color: white; padding: 2px 6px;');
  console.log('  Settings object:', JSON.stringify(filterSettings, null, 2));

  // Count active filters for debugging
  const activeFilters = Object.entries(filterSettings)
    .filter(([key, val]) => val === true && !key.startsWith('exclude'))
    .map(([key]) => key);
  console.log('%c[JobFiltr Popup] Active filters to apply:', 'background: #2196F3; color: white; padding: 2px 6px;', activeFilters.join(', ') || 'NONE');

  // CRITICAL DEBUG: Log exact keyword state BEFORE saving
  console.log('%c[JobFiltr Popup] ========== PRE-SAVE KEYWORD CHECK ==========', 'background: #FF0000; color: white; padding: 4px 8px; font-weight: bold;');
  console.log('%c  filterIncludeKeywords:', 'color: yellow;', filterSettings.filterIncludeKeywords);
  console.log('%c  includeKeywords array:', 'color: yellow;', JSON.stringify(filterSettings.includeKeywords));
  console.log('%c  includeKeywords length:', 'color: yellow;', filterSettings.includeKeywords?.length);
  console.log('%c  filterExcludeKeywords:', 'color: yellow;', filterSettings.filterExcludeKeywords);
  console.log('%c  excludeKeywords array:', 'color: yellow;', JSON.stringify(filterSettings.excludeKeywords));
  console.log('%c  excludeKeywords length:', 'color: yellow;', filterSettings.excludeKeywords?.length);
  console.log('%c=====================================================', 'background: #FF0000; color: white; padding: 4px 8px; font-weight: bold;');

  await chrome.storage.local.set({ filterSettings });
  console.log('%c[JobFiltr Popup] Settings saved to chrome.storage.local', 'background: #9C27B0; color: white; padding: 2px 6px;');
}

function updateFilterStats() {
  // ULTRATHINK: Count ALL main filters consistently
  // This must match countActiveFilters() for template saving consistency
  const mainFilters = [
    'hideStaffing',
    'hideSponsored',
    'filterEarlyApplicant',
    'filterPostingAge',
    'trueRemoteAccuracy',      // Count True Remote as 1 filter when enabled
    'filterIncludeKeywords',
    'filterExcludeKeywords',
    'filterSalary',
    // hideNoSalary is NOT counted separately - it's part of filterSalary
    'showActiveRecruiting',
    'showJobAge',
    'hideApplied',
    'filterUrgentlyHiring',
    'visaOnly',
    'showBenefitsIndicator'    // Display setting - counts as active filter
    // Note: earlyApplicantDisplayMode is controlled by filterEarlyApplicant checkbox
  ];

  let activeCount = mainFilters.filter(key => filterSettings[key] === true).length;

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

async function addKeyword(type, keyword) {
  keyword = keyword.trim().toLowerCase();

  if (!keyword) return false;

  console.log('%c[JobFiltr Popup] addKeyword called', 'background: #00BCD4; color: white; padding: 2px 6px;');
  console.log('  type:', type);
  console.log('  keyword:', keyword);

  if (type === 'include') {
    if (includeKeywords.includes(keyword)) {
      console.log('  Keyword already exists in includeKeywords');
      return false; // Already exists
    }
    includeKeywords.push(keyword);
    console.log('%c[JobFiltr Popup] KEYWORD ADDED TO INCLUDE:', 'background: #4CAF50; color: white; padding: 4px 8px; font-weight: bold;');
    console.log('  Keyword:', keyword);
    console.log('  Array now:', JSON.stringify(includeKeywords));
    console.log('  Array length:', includeKeywords.length);

    // AUTO-ENABLE: When user adds an include keyword, they want to use the filter
    const checkbox = document.getElementById('filterIncludeKeywords');
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      console.log('%c[JobFiltr Popup] Auto-enabled Include Keywords filter', 'background: #4CAF50; color: white; padding: 2px 6px;');
    }
  } else {
    if (excludeKeywords.includes(keyword)) {
      console.log('  Keyword already exists in excludeKeywords');
      return false; // Already exists
    }
    excludeKeywords.push(keyword);
    console.log('%c[JobFiltr Popup] KEYWORD ADDED TO EXCLUDE:', 'background: #E91E63; color: white; padding: 4px 8px; font-weight: bold;');
    console.log('  Keyword:', keyword);
    console.log('  Array now:', JSON.stringify(excludeKeywords));
    console.log('  Array length:', excludeKeywords.length);

    // AUTO-ENABLE: When user adds an exclude keyword, they want to use the filter
    const checkbox = document.getElementById('filterExcludeKeywords');
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
      console.log('%c[JobFiltr Popup] Auto-enabled Exclude Keywords filter', 'background: #4CAF50; color: white; padding: 2px 6px;');
    }
  }

  renderKeywordChips();
  // AUTO-SAVE: Persist keywords immediately to prevent loss on tab switch
  // CRITICAL: Await to ensure save completes before any potential tab switch
  await saveFilterSettings();
  console.log('%c[JobFiltr Popup] Keyword saved to storage', 'background: #9C27B0; color: white; padding: 2px 6px;');
  return true;
}

function removeKeyword(type, index) {
  if (type === 'include') {
    includeKeywords.splice(index, 1);
  } else {
    excludeKeywords.splice(index, 1);
  }

  renderKeywordChips();
  // AUTO-SAVE: Persist keywords immediately to prevent loss on tab switch
  saveFilterSettings();
}

// CRITICAL FIX: Auto-save keyword checkbox changes to prevent tab-switch reset
// Other filters auto-save on change, keyword filters must do the same
document.getElementById('filterIncludeKeywords')?.addEventListener('change', (e) => {
  console.log('%c[JobFiltr Popup] Include Keywords checkbox changed!', 'background: #FF5722; color: white; padding: 2px 6px;');
  console.log('  New checked state:', e.target.checked);
  // AUTO-SAVE: Prevent tab switching from resetting this checkbox
  saveFilterSettings();
});

document.getElementById('filterExcludeKeywords')?.addEventListener('change', (e) => {
  console.log('%c[JobFiltr Popup] Exclude Keywords checkbox changed!', 'background: #FF5722; color: white; padding: 2px 6px;');
  console.log('  New checked state:', e.target.checked);
  // AUTO-SAVE: Prevent tab switching from resetting this checkbox
  saveFilterSettings();
});

// Include keyword input handlers
document.getElementById('includeKeywordInput').addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = e.target;
    const added = await addKeyword('include', input.value);
    if (added) {
      input.value = '';
    }
  }
});

document.getElementById('addIncludeKeyword').addEventListener('click', async () => {
  const input = document.getElementById('includeKeywordInput');
  const added = await addKeyword('include', input.value);
  if (added) {
    input.value = '';
  }
  input.focus();
});

// Exclude keyword input handlers
document.getElementById('excludeKeywordInput').addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = e.target;
    const added = await addKeyword('exclude', input.value);
    if (added) {
      input.value = '';
    }
  }
});

document.getElementById('addExcludeKeyword').addEventListener('click', async () => {
  const input = document.getElementById('excludeKeywordInput');
  const added = await addKeyword('exclude', input.value);
  if (added) {
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
    'hideStaffing', 'hideSponsored', 'filterEarlyApplicant', 'filterPostingAge',
    'trueRemoteAccuracy', 'filterIncludeKeywords', 'filterExcludeKeywords',
    'filterSalary', // hideNoSalary is NOT counted separately - it's part of filterSalary
    'showActiveRecruiting', 'showJobAge', 'hideApplied', 'filterUrgentlyHiring',
    'visaOnly', 'showBenefitsIndicator'
  ];
  return mainFilters.filter(key => settings[key] === true).length;
}

function getCurrentFilterSettings() {
  return {
    hideStaffing: document.getElementById('filterStaffing').checked,
    staffingDisplayMode: document.getElementById('staffingDisplayMode').value,
    hideSponsored: document.getElementById('filterSponsored').checked,
    filterEarlyApplicant: document.getElementById('filterEarlyApplicant').checked,
    filterPostingAge: document.getElementById('filterPostingAge').checked,
    postingAgeRange: document.getElementById('postingAgeRange').value,
    trueRemoteAccuracy: document.getElementById('filterTrueRemote').checked,
    excludeHybrid: document.getElementById('excludeHybrid').checked,
    excludeOnsite: document.getElementById('excludeOnsite').checked,
    excludeInOffice: document.getElementById('excludeInOffice').checked,
    excludeInPerson: document.getElementById('excludeInPerson').checked,
    showWorkTypeUnclear: document.getElementById('showWorkTypeUnclear').checked,
    filterIncludeKeywords: document.getElementById('filterIncludeKeywords').checked,
    filterExcludeKeywords: document.getElementById('filterExcludeKeywords').checked,
    includeKeywords: [...includeKeywords],
    excludeKeywords: [...excludeKeywords],
    filterSalary: document.getElementById('filterSalary').checked,
    minSalary: document.getElementById('minSalary').value,
    maxSalary: document.getElementById('maxSalary').value,
    hideNoSalary: document.getElementById('hideNoSalary').checked,
    showActiveRecruiting: document.getElementById('filterActiveRecruiting').checked,
    showJobAge: document.getElementById('filterJobAge').checked,
    hideApplied: document.getElementById('filterApplied').checked,
    filterUrgentlyHiring: document.getElementById('filterUrgentlyHiring').checked,
    visaOnly: document.getElementById('filterVisa').checked,
    showBenefitsIndicator: document.getElementById('showBenefitsIndicator').checked,
    earlyApplicantDisplayMode: document.getElementById('earlyApplicantDisplayMode')?.value || 'hide'
  };
}

function applyTemplateSettings(settings) {
  // Apply all settings to UI
  document.getElementById('filterStaffing').checked = settings.hideStaffing || false;
  const staffingMode = settings.staffingDisplayMode || 'hide';
  document.getElementById('staffingDisplayMode').value = staffingMode;
  document.getElementById('filterSponsored').checked = settings.hideSponsored || false;
  document.getElementById('filterEarlyApplicant').checked = settings.filterEarlyApplicant || false;
  document.getElementById('filterPostingAge').checked = settings.filterPostingAge || false;
  document.getElementById('postingAgeRange').value = settings.postingAgeRange || '1w';
  document.getElementById('filterTrueRemote').checked = settings.trueRemoteAccuracy || false;
  document.getElementById('excludeHybrid').checked = settings.excludeHybrid !== false;
  document.getElementById('excludeOnsite').checked = settings.excludeOnsite !== false;
  document.getElementById('excludeInOffice').checked = settings.excludeInOffice !== false;
  document.getElementById('excludeInPerson').checked = settings.excludeInPerson !== false;
  document.getElementById('showWorkTypeUnclear').checked = settings.showWorkTypeUnclear !== false;
  document.getElementById('filterIncludeKeywords').checked = settings.filterIncludeKeywords || false;
  document.getElementById('filterExcludeKeywords').checked = settings.filterExcludeKeywords || false;
  document.getElementById('filterSalary').checked = settings.filterSalary || false;
  document.getElementById('minSalary').value = settings.minSalary || '';
  document.getElementById('maxSalary').value = settings.maxSalary || '';
  document.getElementById('hideNoSalary').checked = settings.hideNoSalary || false;
  document.getElementById('filterActiveRecruiting').checked = settings.showActiveRecruiting || false;
  document.getElementById('filterJobAge').checked = settings.showJobAge || false;
  document.getElementById('filterApplied').checked = settings.hideApplied || false;
  document.getElementById('filterUrgentlyHiring').checked = settings.filterUrgentlyHiring || false;
  document.getElementById('filterVisa').checked = settings.visaOnly || false;
  document.getElementById('showBenefitsIndicator').checked = settings.showBenefitsIndicator || false;
  if (document.getElementById('earlyApplicantDisplayMode')) {
    document.getElementById('earlyApplicantDisplayMode').value = settings.earlyApplicantDisplayMode || 'hide';
  }

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

  // CRITICAL: Rebuild filterSettings from current UI state to ensure freshness
  // This is the DEFINITIVE source of truth when applying filters
  await saveFilterSettings();

  // KEYWORD INTEGRITY CHECK: Log the exact state AFTER rebuilding
  console.log('%c[JobFiltr Popup] ======= APPLY FILTERS - KEYWORD INTEGRITY CHECK =======', 'background: #FF0000; color: white; padding: 4px 8px; font-weight: bold;');
  console.log('%c  Global includeKeywords:', 'color: #0FF;', JSON.stringify(includeKeywords), '| Length:', includeKeywords.length);
  console.log('%c  Global excludeKeywords:', 'color: #0FF;', JSON.stringify(excludeKeywords), '| Length:', excludeKeywords.length);
  console.log('%c  filterSettings.includeKeywords:', 'color: #FF0;', JSON.stringify(filterSettings.includeKeywords), '| Length:', filterSettings.includeKeywords?.length || 0);
  console.log('%c  filterSettings.excludeKeywords:', 'color: #FF0;', JSON.stringify(filterSettings.excludeKeywords), '| Length:', filterSettings.excludeKeywords?.length || 0);
  console.log('%c  filterSettings.filterIncludeKeywords:', 'color: #0F0;', filterSettings.filterIncludeKeywords);
  console.log('%c  filterSettings.filterExcludeKeywords:', 'color: #0F0;', filterSettings.filterExcludeKeywords);
  console.log('%c  Include checkbox checked:', 'color: #AAA;', document.getElementById('filterIncludeKeywords')?.checked);
  console.log('%c  Exclude checkbox checked:', 'color: #AAA;', document.getElementById('filterExcludeKeywords')?.checked);
  console.log('%c========================================================', 'background: #FF0000; color: white; padding: 4px 8px;');

  // Send message to content script to apply filters
  try {
    // In panel mode, use the stored currentTabId from detectCurrentSite()
    // Otherwise, query the active tab in current window
    let tabId = currentTabId;
    if (!tabId) {
      if (isPanelMode) {
        // In panel mode, use safe helper
        const tab = await safeGetActiveJobTab();
        tabId = tab?.id;
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
      // DEBUG: Log exactly what we're sending
      console.log('%c[JobFiltr Popup] Sending APPLY_FILTERS message to tab ' + tabId, 'background: #E91E63; color: white; padding: 2px 6px;');
      console.log('  filterSettings object being sent:', filterSettings);
      console.log('  Active filters in message:', Object.entries(filterSettings)
        .filter(([key, val]) => val === true && !key.startsWith('exclude'))
        .map(([key]) => key).join(', ') || 'NONE');

      // EXPLICIT KEYWORD DEBUG
      console.log('%c[JobFiltr Popup] KEYWORD DEBUG:', 'background: #FF9800; color: white; padding: 2px 6px;');
      console.log('  Global includeKeywords array:', JSON.stringify(includeKeywords));
      console.log('  Global excludeKeywords array:', JSON.stringify(excludeKeywords));
      console.log('  filterSettings.filterIncludeKeywords:', filterSettings.filterIncludeKeywords);
      console.log('  filterSettings.includeKeywords:', JSON.stringify(filterSettings.includeKeywords));
      console.log('  filterSettings.filterExcludeKeywords:', filterSettings.filterExcludeKeywords);
      console.log('  filterSettings.excludeKeywords:', JSON.stringify(filterSettings.excludeKeywords));
      console.log('  Checkbox #filterIncludeKeywords checked:', document.getElementById('filterIncludeKeywords')?.checked);
      console.log('  Checkbox #filterExcludeKeywords checked:', document.getElementById('filterExcludeKeywords')?.checked);

      const messagePayload = {
        type: 'APPLY_FILTERS',
        settings: filterSettings,
        site: currentSite
      };

      console.log('%c[JobFiltr Popup] About to send message:', 'background: #673AB7; color: white; padding: 2px 6px;');
      console.log('  Target tabId:', tabId);
      console.log('  Message type:', messagePayload.type);
      console.log('  Settings keys:', Object.keys(messagePayload.settings));
      console.log('  Settings.filterIncludeKeywords:', messagePayload.settings.filterIncludeKeywords);
      console.log('  Settings.includeKeywords:', JSON.stringify(messagePayload.settings.includeKeywords));

      try {
        const response = await chrome.tabs.sendMessage(tabId, messagePayload);
        console.log('%c[JobFiltr Popup] Message sent, response:', 'background: #4CAF50; color: white; padding: 2px 6px;', response);
      } catch (sendError) {
        console.error('%c[JobFiltr Popup] Message send failed:', 'background: #F44336; color: white; padding: 2px 6px;', sendError.message);
        throw sendError;
      }
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
        const tab = await safeGetActiveJobTab();
        tabId = tab?.id;
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
        const tab = await safeGetActiveJobTab();
        tabId = tab?.id;
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = tab?.id;
      }
    }

    if (!tabId) {
      updateDetectedJobInfo(null, 'no_tab');
      return;
    }

    // FIX 8: Verify content script is loaded with PING before extracting
    let contentScriptResponding = false;
    try {
      const pingResponse = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      if (pingResponse && pingResponse.success) {
        contentScriptResponding = true;
        console.log('[Scanner] Content script active:', pingResponse.platform, 'at', new Date(pingResponse.timestamp).toISOString());
      }
    } catch (pingError) {
      console.warn('[Scanner] Content script not responding - may need page refresh');
      // Don't return here, still try to extract in case it's a timing issue
    }

    // Send message to content script to extract job info
    try {
      console.log('[Scanner DEBUG] Sending EXTRACT_JOB_INFO to tab:', tabId);
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_JOB_INFO'
      });
      console.log('[Scanner DEBUG] EXTRACT_JOB_INFO response:', response);
      console.log('[Scanner DEBUG] Response has description:', !!response?.data?.description);
      console.log('[Scanner DEBUG] Response description length:', response?.data?.description?.length || 0);

      if (response && response.success) {
        currentJobData = response.data;
        console.log('[Scanner DEBUG] Set currentJobData, description length:', currentJobData?.description?.length || 0);
        console.log('[Scanner DEBUG] Initial postedDate:', currentJobData?.postedDate);

        // ULTRATHINK FIX: If postedDate is missing, try dedicated JSON-LD extraction
        if (!currentJobData?.postedDate && currentJobData?.platform === 'indeed') {
          console.log('[Scanner DEBUG] postedDate missing, trying JSON-LD fallback...');
          try {
            const dateResponse = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_POSTED_DATE_JSONLD' });
            console.log('[Scanner DEBUG] JSON-LD date response:', dateResponse);
            if (dateResponse && dateResponse.success && dateResponse.postedDate) {
              currentJobData.postedDate = dateResponse.postedDate;
              console.log('[Scanner DEBUG] Set postedDate from JSON-LD:', currentJobData.postedDate);
            }
          } catch (dateError) {
            console.warn('[Scanner DEBUG] JSON-LD date extraction failed:', dateError);
          }
        }

        updateDetectedJobInfo(response.data);
      } else {
        console.log('[Scanner DEBUG] Response not successful or empty');
        updateDetectedJobInfo(null, contentScriptResponding ? 'not_job_page' : 'no_content_script');
      }
    } catch (msgError) {
      // Check if content script is not available
      if (msgError.message?.includes('Receiving end does not exist') ||
          msgError.message?.includes('Could not establish connection')) {
        console.warn('[Scanner] Content script not available - page refresh may be needed');
        updateDetectedJobInfo(null, 'no_content_script');
      } else {
        console.error('Error sending job extraction message:', msgError);
        updateDetectedJobInfo(null, 'error');
      }
    }
  } catch (error) {
    console.error('Error detecting job:', error);
    updateDetectedJobInfo(null, 'error');
  }
}

// Format location to show only city and state
function formatLocationCityState(location) {
  if (!location || location === 'Not detected') return location;

  // First, remove metadata separated by various separators
  // LinkedIn uses middle dot (·), bullet (•), or other separators before metadata like "1 day ago", "100 people clicked"
  let cleaned = location
    .split(/[·•‧∙]/)[0]  // Split on various dot-like characters
    .split(/\s+[-–—]\s+/)[0]  // Split on dashes with spaces
    .trim();

  // Also remove common metadata patterns that might not have separators
  cleaned = cleaned
    .replace(/\s*Reposted.*$/i, '')
    .replace(/\s*Posted.*$/i, '')
    .replace(/\s*\d+\s*(day|hour|week|month)s?\s*ago.*$/i, '')
    .replace(/\s*\d+\s*people\s*clicked.*$/i, '')
    .replace(/\s*Promoted.*$/i, '')
    .replace(/\s*Responses\s*managed.*$/i, '')
    .trim();

  // Handle special cases
  const lowerLocation = cleaned.toLowerCase().trim();
  if (lowerLocation === 'remote' || lowerLocation.includes('remote')) {
    return 'Remote';
  }

  // Remove common suffixes and work type indicators
  cleaned = cleaned
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

function updateDetectedJobInfo(data, failureReason = null) {
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

    // Show helpful message based on failure reason
    let urlMessage = 'Not on a job posting page';
    if (failureReason === 'no_content_script') {
      urlMessage = 'Please refresh the page';
    } else if (failureReason === 'no_tab') {
      urlMessage = 'Visit LinkedIn or Indeed';
    } else if (failureReason === 'error') {
      urlMessage = 'Detection error - try refreshing';
    }
    document.getElementById('detectedUrl').textContent = urlMessage;

    // Disable scan and save buttons
    document.getElementById('scanButton').disabled = true;
    document.getElementById('saveJobButton').disabled = true;
  }
}

// Minimum scan time in milliseconds (2.5 seconds for accurate analysis)
const MIN_SCAN_TIME = 2500;

// Scan Button - Uses local scam/spam analysis for accurate detection
document.getElementById('scanButton').addEventListener('click', async () => {
  // FIX: Always re-fetch fresh job data before scanning to ensure description is populated
  // Previously this used stale cached data which often had empty descriptions
  await detectCurrentJob();

  // DEBUG: Log EXACTLY what currentJobData contains
  console.log('[Scanner DEBUG] ========== SCAN BUTTON CLICKED ==========');
  console.log('[Scanner DEBUG] currentJobData:', currentJobData);
  console.log('[Scanner DEBUG] Has description:', !!currentJobData?.description);
  console.log('[Scanner DEBUG] Description length:', currentJobData?.description?.length || 0);
  console.log('[Scanner DEBUG] Description preview:', currentJobData?.description?.substring(0, 300));

  if (!currentJobData) {
    alert('No job posting detected. Please navigate to a job posting page.');
    return;
  }

  // Show loading state
  document.querySelector('.scan-results').classList.add('hidden');
  document.querySelector('.loading-section').classList.remove('hidden');

  const scanStartTime = Date.now();

  try {
    // Perform LOCAL scam/spam analysis (not content script ghost analysis)
    // This ensures we use our comprehensive pattern matching and scoring
    console.log('[Scanner] Analyzing job for scam/spam indicators:', currentJobData.title);
    console.log('[Scanner DEBUG] Calling performScamSpamAnalysis with description length:', currentJobData.description?.length || 0);
    const scanResult = performScamSpamAnalysis(currentJobData);
    console.log('[Scanner DEBUG] Analysis result:', JSON.stringify(scanResult, null, 2));

    // Ensure minimum scan time for UX (gives impression of thorough analysis)
    const elapsedTime = Date.now() - scanStartTime;
    if (elapsedTime < MIN_SCAN_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_SCAN_TIME - elapsedTime));
    }

    // Hide loading, show results
    document.querySelector('.loading-section').classList.add('hidden');
    document.querySelector('.scan-results').classList.remove('hidden');

    // Display the scan results
    displayScanResults(scanResult);

    // Save to history
    await saveScanToHistory(scanResult);

    console.log('[Scanner] Analysis complete:', {
      legitimacy: scanResult.legitimacyScore,
      scamRisk: scanResult.scamScore,
      spamRisk: scanResult.spamScore,
      breakdown: scanResult.breakdown
    });

  } catch (error) {
    console.error('[Scanner] Error during scan:', error);
    // Ensure minimum scan time even on error
    const elapsedTime = Date.now() - scanStartTime;
    if (elapsedTime < MIN_SCAN_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_SCAN_TIME - elapsedTime));
    }
    document.querySelector('.loading-section').classList.add('hidden');
    alert('Error scanning job. Please try again.');
  }
});

// ===== SCAM/SPAM DETECTION PATTERNS =====
const SCAM_PATTERNS = {
  // FINANCIAL CATEGORY - High risk indicators
  financial: [
    { pattern: /\b(provide|send|submit|enter|your)\s*(your\s*)?(social\s*security\s*number|ssn|ss#)\b/i, weight: 0.95, tier: 'high', desc: 'Requests Social Security Number' },
    { pattern: /\b(ssn|ss#)\s*(required|needed|must)/i, weight: 0.90, tier: 'high', desc: 'SSN required before hiring' },
    { pattern: /\b(provide|send|submit|enter|your)\s*(your\s*)?(bank\s*account|routing\s*number|account\s*number)\b/i, weight: 0.90, tier: 'high', desc: 'Requests bank account details upfront' },
    { pattern: /\b(pay|send|transfer)\s*(us|me)?\s*\$?\s*\d+.*?(upfront|before|first|fee|deposit)/i, weight: 0.95, tier: 'high', desc: 'Requires upfront payment' },
    { pattern: /\btraining\s*fee\b/i, weight: 0.90, tier: 'high', desc: 'Requires training fee' },
    { pattern: /\b(buy|purchase|invest)\s*(in)?\s*(equipment|materials|starter\s*kit)/i, weight: 0.85, tier: 'high', desc: 'Requires equipment purchase' },
    { pattern: /\b(wire\s*transfer|western\s*union|money\s*gram|moneygram)\b/i, weight: 0.85, tier: 'high', desc: 'Uses suspicious payment method' },
    { pattern: /\b(credit\s*card|debit\s*card)\s*(number|info|details)/i, weight: 0.95, tier: 'high', desc: 'Requests credit card information' },
    { pattern: /\b(bitcoin|crypto|btc|ethereum|gift\s*card)\b.*?(payment|pay|send|receive)/i, weight: 0.90, tier: 'high', desc: 'Requests crypto/gift card payment' },
    { pattern: /\b(driver\'?s?\s*license|passport|photo\s*id)\s*(number|copy|scan)/i, weight: 0.80, tier: 'medium', desc: 'Requests ID documents early' },
  ],

  // COMMUNICATION CATEGORY - Suspicious contact methods
  communication: [
    { pattern: /\bwhatsapp\b/i, weight: 0.85, tier: 'high', desc: 'Requests WhatsApp communication' },
    { pattern: /\btelegram\b.*?(contact|message|reach|chat)/i, weight: 0.80, tier: 'high', desc: 'Requests Telegram communication' },
    { pattern: /\b(text|sms)\s*me\s*(at|on)?\s*\+?\d/i, weight: 0.75, tier: 'medium', desc: 'Requests personal phone contact' },
    { pattern: /\badd\s*(me\s*)?(on\s*)?(whatsapp|telegram|signal)\b/i, weight: 0.85, tier: 'high', desc: 'Requests messaging app contact' },
    { pattern: /\bcontact\s*(us|me)\s*(via|through|at)\s*(email|phone).*?@(gmail|yahoo|hotmail|outlook)\b/i, weight: 0.55, tier: 'medium', desc: 'Uses non-company email domain' },
    { pattern: /\b(reply|respond|email)\s*(to|at)?\s*[a-z0-9._%+-]+@(gmail|yahoo|hotmail|outlook)\.com\b/i, weight: 0.40, tier: 'low', desc: 'Contact via personal email' },
    { pattern: /\b(confidential|undisclosed)\s*company\b/i, weight: 0.50, tier: 'medium', desc: 'Company identity hidden' },
  ],

  // UNREALISTIC CATEGORY - Too good to be true promises
  unrealistic: [
    { pattern: /\$\s*\d{3,},?\d{0,3}\s*(\/|per)?\s*(hr|hour)\b/i, weight: 0.75, tier: 'high', desc: 'Unusually high hourly rate' },
    { pattern: /\b(make|earn)\s*\$?\s*\d{1,3},?\d{3,}\s*(\/|per)?\s*(week|month)\s*(from\s*home|easily|guaranteed)?/i, weight: 0.65, tier: 'medium', desc: 'Unrealistic earnings promise' },
    { pattern: /\bno\s*experience\s*(needed|required|necessary)\s*.{0,30}(high|top|great)\s*(pay|salary|income)/i, weight: 0.55, tier: 'medium', desc: 'High pay with no experience' },
    { pattern: /\b(guaranteed|promise[d]?)\s*(income|salary|earnings|pay)/i, weight: 0.50, tier: 'medium', desc: 'Guaranteed income promise' },
    { pattern: /\bget\s*rich\b/i, weight: 0.60, tier: 'medium', desc: 'Get rich quick language' },
    { pattern: /\bfinancial\s*freedom\b/i, weight: 0.45, tier: 'low', desc: 'Financial freedom promise' },
    { pattern: /\bpart[- ]?time\s*.{0,15}full[- ]?time\s*(income|pay|earnings)/i, weight: 0.50, tier: 'medium', desc: 'Part-time for full-time income' },
  ],

  // URGENCY CATEGORY - Pressure tactics
  urgency: [
    { pattern: /\b(apply|respond|act)\s*(now|immediately|today|asap)\s*!+/i, weight: 0.50, tier: 'medium', desc: 'Urgent action required' },
    { pattern: /\b(limited\s*(time|spots?|positions?|opening)|only\s*\d+\s*(spots?|positions?))/i, weight: 0.45, tier: 'medium', desc: 'Limited availability pressure' },
    { pattern: /\b(don\'?t|do\s*not)\s*(miss|wait|delay)/i, weight: 0.40, tier: 'low', desc: 'Fear of missing out language' },
    { pattern: /\boffer\s*(expires?|ends?)\b/i, weight: 0.45, tier: 'medium', desc: 'Time-limited offer' },
    { pattern: /\bact\s*(fast|quick|immediately)\b/i, weight: 0.55, tier: 'medium', desc: 'Act immediately pressure' },
    { pattern: /\bno\s*(interview|resume)\s*(needed|required)/i, weight: 0.35, tier: 'low', desc: 'No interview required' },
  ]
};

const SPAM_PATTERNS = {
  // MLM CATEGORY - Multi-level marketing indicators
  mlm: [
    { pattern: /\b(downline|upline)\b/i, weight: 0.85, tier: 'high', desc: 'MLM structure language (downline/upline)' },
    { pattern: /\bmulti[- ]?level\s*marketing\b/i, weight: 0.80, tier: 'high', desc: 'Explicit MLM mention' },
    { pattern: /\bnetwork\s*marketing\b/i, weight: 0.75, tier: 'high', desc: 'Network marketing mention' },
    { pattern: /\brecruit\s*(others?|people|members?|friends?|family)\b/i, weight: 0.70, tier: 'medium', desc: 'Recruitment focus' },
    { pattern: /\b(be\s*your\s*own\s*boss|own\s*your\s*own\s*business)\b/i, weight: 0.55, tier: 'medium', desc: 'Be your own boss language' },
    { pattern: /\bunlimited\s*(earning|income)\s*potential\b/i, weight: 0.65, tier: 'medium', desc: 'Unlimited earning potential claim' },
    { pattern: /\b(residual|passive)\s*income\b/i, weight: 0.50, tier: 'medium', desc: 'Passive income promise' },
    { pattern: /\b(ground\s*floor|get\s*in\s*early)\s*(opportunity)?/i, weight: 0.60, tier: 'medium', desc: 'Ground floor opportunity' },
    { pattern: /\b(team\s*building|build\s*your?\s*team)\b/i, weight: 0.45, tier: 'low', desc: 'Team building focus' },
    { pattern: /\b(life\s*changing|change\s*your\s*life)\s*(opportunity|income)?/i, weight: 0.50, tier: 'medium', desc: 'Life changing opportunity' },
  ],

  // COMMISSION CATEGORY - Commission-only structures
  commission: [
    { pattern: /\bcommission[- ]?only\b/i, weight: 0.60, tier: 'medium', desc: 'Commission-only pay structure' },
    { pattern: /\b100%\s*commission\b/i, weight: 0.65, tier: 'medium', desc: '100% commission structure' },
    { pattern: /\bno\s*(base|salary|hourly)\s*(pay|rate|wage)/i, weight: 0.55, tier: 'medium', desc: 'No base salary' },
    { pattern: /\b(straight|pure)\s*commission\b/i, weight: 0.60, tier: 'medium', desc: 'Straight commission' },
    { pattern: /\bperformance[- ]?based\s*only\b/i, weight: 0.45, tier: 'low', desc: 'Performance-based only' },
  ]
};

// ANTI-PATTERNS - Legitimate job signals that reduce risk
const ANTI_PATTERNS = [
  { pattern: /apply\s*(at|through|via)\s*[a-z]+\.(com|org|io|co|net)\b/i, reduction: 0.10, desc: 'Professional application process' },
  { pattern: /\$[\d,]+\s*[-–]\s*\$[\d,]+/i, reduction: 0.15, desc: 'Transparent salary range' },
  { pattern: /(401k|health\s*insurance|dental|vision|pto|paid\s*time\s*off|benefits\s*package)/i, reduction: 0.15, desc: 'Standard benefits mentioned' },
  { pattern: /(reports?\s*to|team\s*of\s*\d+|department|manager|supervisor)/i, reduction: 0.10, desc: 'Corporate structure mentioned' },
  { pattern: /(\d+\+?\s*years?\s*(of)?\s*experience|bachelor|master|degree\s*required)/i, reduction: 0.10, desc: 'Specific qualifications required' },
  { pattern: /(fortune\s*500|nasdaq|nyse|publicly\s*traded)/i, reduction: 0.15, desc: 'Established company indicator' },
];

// INSTANT RED FLAGS - Patterns that set minimum risk floors
const INSTANT_RED_FLAGS = [
  { pattern: /\b(social\s*security|ssn)\s*(number)?\b/i, minRisk: 70, desc: 'SSN request is always a red flag' },
  { pattern: /\bpay\s*\$?\s*\d+.*?(upfront|before|first)\b/i, minRisk: 75, desc: 'Upfront payment is always suspicious' },
  { pattern: /\bsend\s*(money|funds|payment)\s*(via|through)\s*(western\s*union|wire)/i, minRisk: 80, desc: 'Wire transfer request' },
  { pattern: /\b(gift\s*card|crypto|bitcoin)\s*(payment|required)\b/i, minRisk: 85, desc: 'Gift card/crypto payment request' },
];

// Helper function: Calculate category score with diminishing returns
function calculateCategoryScoreEnhanced(matchedPatterns) {
  if (matchedPatterns.length === 0) return 0;

  // Sort by weight (strongest signals first)
  const sorted = [...matchedPatterns].sort((a, b) => b.weight - a.weight);

  // Apply diminishing returns: each additional signal contributes less
  let accumulator = 0;
  sorted.forEach((pattern, index) => {
    // First pattern: 100%, second: 67%, third: 50%, fourth: 40%, etc.
    const diminishingFactor = 1 / (1 + index * 0.5);
    accumulator += pattern.weight * diminishingFactor;
  });

  // Convert to percentage
  return accumulator * 100;
}

// Helper function: Apply correlation bonus for multiple categories flagged
function applyCorrelationBonus(breakdown) {
  // Count how many categories have scores >= 30%
  const significantCategories = [
    breakdown.financial,
    breakdown.communication,
    breakdown.unrealistic,
    breakdown.urgency,
    breakdown.mlm,
    breakdown.commission,
    breakdown.postingAge
  ].filter(score => score >= 30).length;

  // Correlation multiplier (now includes 7 categories)
  const multipliers = { 0: 1.0, 1: 1.0, 2: 1.15, 3: 1.30, 4: 1.45, 5: 1.55, 6: 1.65, 7: 1.75 };
  return multipliers[Math.min(significantCategories, 7)] || 1.0;
}

// Helper function: Apply anti-patterns to reduce false positives
function applyAntiPatterns(baseRisk, combined) {
  let reduction = 0;

  for (const antiPattern of ANTI_PATTERNS) {
    if (antiPattern.pattern.test(combined)) {
      reduction += antiPattern.reduction;
    }
  }

  // Cap reduction at 40%
  reduction = Math.min(0.40, reduction);
  return Math.max(0, baseRisk - (baseRisk * reduction));
}

// Helper function: Apply risk floor for extreme patterns
function applyRiskFloor(calculatedRisk, combined) {
  let minRiskFloor = 0;

  for (const flag of INSTANT_RED_FLAGS) {
    if (flag.pattern.test(combined)) {
      minRiskFloor = Math.max(minRiskFloor, flag.minRisk);
    }
  }

  return Math.max(calculatedRisk, minRiskFloor);
}

// Helper function: Calculate enhanced confidence based on pattern tier quality
// FIX 9: Adjusted formula to not always return 56% for legitimate jobs
function calculateEnhancedConfidence(jobData, matchedPatterns) {
  const tierWeights = { high: 0.25, medium: 0.15, low: 0.05 };

  // FIX: Raised base from 0.40 to 0.60 - if we have good data but no patterns,
  // that's actually HIGH confidence the job is legitimate
  let signalQuality = 0.60;

  // Pattern matches ADD to confidence (we're confident in our detection)
  matchedPatterns.forEach(p => {
    signalQuality += tierWeights[p.tier] || 0.10;
  });
  signalQuality = Math.min(0.95, signalQuality);

  // Data completeness - weight description more heavily, reduce postedDate weight
  const dataComplete = [
    // Bonus for substantial description (>100 chars)
    jobData.description && jobData.description.length > 100 ? 0.35 : (jobData.description ? 0.20 : 0),
    jobData.company ? 0.20 : 0,
    jobData.title ? 0.20 : 0,
    jobData.location ? 0.15 : 0,
    jobData.postedDate ? 0.10 : 0  // Reduced from 0.15 since often missing
  ].reduce((a, b) => a + b, 0);

  // Bonus for substantial description (>500 chars = detailed job posting)
  const descriptionBonus = jobData.description && jobData.description.length > 500 ? 0.10 : 0;

  // Adjusted formula: 55/45 split instead of 65/35, plus description bonus
  return Math.round(Math.min(95, (signalQuality * 0.55 + dataComplete * 0.45 + descriptionBonus) * 100));
}

// Helper function: Calculate posting age risk score
function calculatePostingAgeRisk(postedDate) {
  if (!postedDate) return { risk: 0, daysPosted: null, desc: null };

  // Parse the posted date to get days
  const daysPosted = parsePostingAge(postedDate);
  if (daysPosted === null) return { risk: 0, daysPosted: null, desc: null };

  // Risk scoring based on posting age
  // Older postings = higher spam risk (indicates ghost job or stale posting)
  let risk = 0;
  let desc = null;

  if (daysPosted <= 3) {
    risk = 0;
    desc = null; // Very fresh, no risk
  } else if (daysPosted <= 7) {
    risk = 5;
    desc = null; // Fresh, negligible risk
  } else if (daysPosted <= 14) {
    risk = 15;
    desc = `Posted ${daysPosted} days ago - slightly aged`;
  } else if (daysPosted <= 21) {
    risk = 30;
    desc = `Posted ${daysPosted} days ago - moderately aged`;
  } else if (daysPosted <= 30) {
    risk = 45;
    desc = `Posted ${daysPosted} days ago - aging posting`;
  } else if (daysPosted <= 45) {
    risk = 60;
    desc = `Posted ${daysPosted} days ago - stale posting`;
  } else if (daysPosted <= 60) {
    risk = 75;
    desc = `Posted ${daysPosted} days ago - very stale`;
  } else if (daysPosted <= 90) {
    risk = 85;
    desc = `Posted ${daysPosted} days ago - likely ghost job`;
  } else {
    risk = 95;
    desc = `Posted ${daysPosted}+ days ago - probable ghost/spam job`;
  }

  return { risk, daysPosted, desc };
}

// Main scam/spam analysis function
function performScamSpamAnalysis(jobData) {
  console.log('[Scanner Debug] ===== STARTING SCAM/SPAM ANALYSIS =====');
  console.log('[Scanner Debug] Job data received:', {
    title: jobData.title,
    company: jobData.company,
    descriptionLength: jobData.description?.length || 0,
    descriptionPreview: (jobData.description || '').substring(0, 200),
    postedDate: jobData.postedDate,
    platform: jobData.platform
  });

  // CRITICAL FIX: Check if description is actually populated
  if (!jobData.description || jobData.description.length < 50) {
    console.warn('[Scanner Debug] ⚠️ WARNING: Job description is empty or too short!');
    console.warn('[Scanner Debug] Description value:', jobData.description);
    console.warn('[Scanner Debug] Description length:', jobData.description?.length || 0);
    console.warn('[Scanner Debug] ⚠️ This will cause all scam/spam content risk scores to be 0%');
    console.warn('[Scanner Debug] However, posting age detection will still work if postedDate is present');
  } else {
    console.log('[Scanner Debug] ✓ Description looks good, length:', jobData.description.length);
  }

  const matchedPatterns = [];
  const breakdown = {
    financial: 0,
    communication: 0,
    unrealistic: 0,
    urgency: 0,
    mlm: 0,
    commission: 0,
    postingAge: 0  // NEW: Job posting age risk
  };

  // Combine title and description for pattern matching
  const combined = `${jobData.title || ''} ${jobData.description || ''}`.toLowerCase();
  console.log('[Scanner Debug] Combined text length:', combined.length);
  console.log('[Scanner Debug] Combined text preview (first 500 chars):', combined.substring(0, 500));

  // ===== STEP 1: Match all scam patterns =====
  for (const [category, patterns] of Object.entries(SCAM_PATTERNS)) {
    const categoryMatches = [];
    for (const patternDef of patterns) {
      if (patternDef.pattern.test(combined)) {
        categoryMatches.push(patternDef);
        matchedPatterns.push({ ...patternDef, category });
      }
    }
    breakdown[category] = calculateCategoryScoreEnhanced(categoryMatches);
  }

  // ===== STEP 2: Match all spam patterns =====
  for (const [category, patterns] of Object.entries(SPAM_PATTERNS)) {
    const categoryMatches = [];
    for (const patternDef of patterns) {
      if (patternDef.pattern.test(combined)) {
        categoryMatches.push(patternDef);
        matchedPatterns.push({ ...patternDef, category });
      }
    }
    breakdown[category] = calculateCategoryScoreEnhanced(categoryMatches);
  }

  // ===== STEP 2.5: Calculate posting age risk (SPAM indicator) =====
  console.log('[Scanner Debug] POSTING AGE INPUT:', jobData.postedDate);
  const postingAgeResult = calculatePostingAgeRisk(jobData.postedDate);
  console.log('[Scanner Debug] POSTING AGE RESULT:', postingAgeResult);
  breakdown.postingAge = postingAgeResult.risk;
  if (postingAgeResult.desc) {
    matchedPatterns.push({
      category: 'postingAge',
      weight: postingAgeResult.risk / 100,
      tier: postingAgeResult.risk >= 60 ? 'high' : postingAgeResult.risk >= 30 ? 'medium' : 'low',
      desc: postingAgeResult.desc
    });
  }

  // ===== STEP 3: Calculate Scam and Spam scores =====
  // These are 0-100 percentages, NOT decimals
  const scamScore = (
    Math.min(100, breakdown.financial) * 0.35 +
    Math.min(100, breakdown.communication) * 0.30 +
    Math.min(100, breakdown.unrealistic) * 0.20 +
    Math.min(100, breakdown.urgency) * 0.15
  );

  // Spam score now includes posting age (weighted at 25%)
  const spamScore = (
    Math.min(100, breakdown.mlm) * 0.45 +
    Math.min(100, breakdown.commission) * 0.30 +
    Math.min(100, breakdown.postingAge) * 0.25
  );

  console.log('[Scanner Debug] Calculated scores:', {
    scamScore,
    spamScore,
    breakdown,
    matchedPatterns: matchedPatterns.map(p => p.desc)
  });

  // ===== STEP 4: Calculate overall risk with correlation bonus =====
  const maxRisk = Math.max(scamScore, spamScore);
  const avgRisk = (scamScore + spamScore) / 2;
  let overallRisk = maxRisk * 0.75 + avgRisk * 0.25;

  // Apply correlation multiplier
  const correlationMultiplier = applyCorrelationBonus(breakdown);
  overallRisk = Math.min(100, overallRisk * correlationMultiplier);

  // ===== STEP 5: Apply anti-patterns (reduce false positives) =====
  overallRisk = applyAntiPatterns(overallRisk, combined);

  // ===== STEP 6: Apply risk floor for extreme patterns =====
  overallRisk = applyRiskFloor(overallRisk, combined);

  // ===== STEP 7: Calculate legitimacy and confidence =====
  const legitimacyScore = Math.max(0, Math.min(100, Math.round(100 - overallRisk)));
  const confidence = calculateEnhancedConfidence(jobData, matchedPatterns);

  // Determine primary category
  let primaryCategory = 'safe';
  if (scamScore >= 60) primaryCategory = 'scam';
  else if (spamScore >= 55) primaryCategory = 'spam';
  else if (scamScore >= 35 && spamScore >= 30) primaryCategory = 'mixed';
  else if (scamScore >= 35) primaryCategory = 'suspicious';

  return {
    legitimacyScore,
    confidence,
    scamScore: Math.round(scamScore),
    spamScore: Math.round(spamScore),
    primaryCategory,
    breakdown: {
      financial: Math.min(100, Math.round(breakdown.financial)),
      communication: Math.min(100, Math.round(breakdown.communication)),
      unrealistic: Math.min(100, Math.round(breakdown.unrealistic)),
      urgency: Math.min(100, Math.round(breakdown.urgency)),
      mlm: Math.min(100, Math.round(breakdown.mlm)),
      commission: Math.min(100, Math.round(breakdown.commission)),
      postingAge: Math.min(100, Math.round(breakdown.postingAge))
    },
    redFlags: matchedPatterns.map(p => p.desc),
    analyzedAt: Date.now()
  };
}

// Legacy function name for backward compatibility (calls new implementation)
function performLocalGhostAnalysis(jobData) {
  return performScamSpamAnalysis(jobData);
}

// Helper function to parse posting age from date string
function parsePostingAge(dateString) {
  if (!dateString) {
    console.log('[Scanner Debug] parsePostingAge: No date string provided');
    return null;
  }

  const normalized = dateString.toLowerCase().trim();
  console.log('[Scanner Debug] parsePostingAge: Input:', dateString, '-> Normalized:', normalized);

  // Handle "just posted", "today", "just now", etc.
  if (/just\s*(?:posted|now)|moments?\s*ago|posted\s*today|\btoday\b/i.test(normalized)) {
    console.log('[Scanner Debug] parsePostingAge: Matched "just posted/today/just now" -> 0 days');
    return 0;
  }

  // Handle "yesterday" or "posted yesterday"
  if (/(?:posted\s+)?yesterday/i.test(normalized)) {
    console.log('[Scanner Debug] parsePostingAge: Matched "yesterday" -> 1 day');
    return 1;
  }

  let match;

  // CRITICAL FIX: Match Indeed's "EmployerActive X days ago" or "Active X days ago" format
  // This is the PRIMARY format used by Indeed on job listings
  if ((match = normalized.match(/(?:employer\s*)?active\s*(\d+)\s*days?\s*ago/i))) {
    const days = parseInt(match[1]);
    console.log('[Scanner Debug] parsePostingAge: Matched "Active/EmployerActive X days ago" ->', match[1], '-> Days:', days);
    return days;
  }

  // Match "X minutes ago" or "Posted X minutes ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*(?:minutes?|min|m)\s*ago/i))) {
    console.log('[Scanner Debug] parsePostingAge: Matched minutes ->', match[1], '-> 0 days');
    return 0;
  }

  // Match "X hours ago" or "Posted X hours ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*(?:hours?|hr|h)\s*ago/i))) {
    console.log('[Scanner Debug] parsePostingAge: Matched hours ->', match[1], '-> 0 days');
    return 0;
  }

  // Match "X days ago" or "Posted X days ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*(?:days?|d)\s*ago/i))) {
    const days = parseInt(match[1]);
    console.log('[Scanner Debug] parsePostingAge: Matched days ->', match[1], '-> Days:', days);
    return days;
  }

  // Match "X weeks ago" or "Posted X weeks ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*(?:weeks?|wk|w)\s*ago/i))) {
    const days = parseInt(match[1]) * 7;
    console.log('[Scanner Debug] parsePostingAge: Matched weeks ->', match[1], '-> Days:', days);
    return days;
  }

  // Match "X months ago" or "Posted X months ago"
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\s*(?:months?|mo)\s*ago/i))) {
    const days = parseInt(match[1]) * 30;
    console.log('[Scanner Debug] parsePostingAge: Matched months ->', match[1], '-> Days:', days);
    return days;
  }

  // Match "30+ days ago" or "Posted 30+ days ago" (jobs older than 30 days)
  if ((match = normalized.match(/(?:posted\s+)?(\d+)\+\s*(?:days?|d)\s*ago/i))) {
    const days = parseInt(match[1]);
    console.log('[Scanner Debug] parsePostingAge: Matched "30+ days ago" ->', match[1], '-> Days:', days);
    return days;
  }

  console.log('[Scanner Debug] parsePostingAge: No pattern matched, returning null');
  console.warn('[Scanner Debug] ⚠️ Unrecognized date format:', dateString);
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

  // Determine status based on primary category and score
  let status = 'legitimate';
  let statusText = 'Appears Legitimate';
  const primaryCategory = result.primaryCategory || 'safe';

  if (score < 30) {
    status = 'danger';
    statusText = primaryCategory === 'spam' ? 'Likely Spam' : 'Likely Scam';
  } else if (score < 50) {
    status = 'danger';
    statusText = primaryCategory === 'spam' ? 'Suspicious Spam' : 'Highly Suspicious';
  } else if (score < 70) {
    status = 'warning';
    statusText = 'Suspicious';
  } else if (score < 85) {
    status = 'caution';
    statusText = 'Some Concerns';
  }

  resultIcon.className = `result-icon ${status}`;
  resultBadge.className = `result-badge ${status}`;
  resultBadge.textContent = statusText;

  // Update score bar color based on risk level
  if (scoreFill) {
    scoreFill.className = 'score-fill';
    if (score < 40) {
      scoreFill.classList.add('danger');
    } else if (score < 70) {
      scoreFill.classList.add('warning');
    } else {
      scoreFill.classList.add('safe');
    }
  }

  // Update result title
  document.getElementById('resultTitle').textContent = currentJobData?.title || 'Analysis Complete';

  // Update confidence score
  const confidenceEl = document.getElementById('confidenceValue');
  if (confidenceEl) {
    const confidence = result.confidence || 0;
    confidenceEl.textContent = `${confidence}%`;
  }

  // Show analysis info (description length analyzed)
  const analysisInfoEl = document.getElementById('analysisInfo');
  if (analysisInfoEl) {
    const descLength = currentJobData?.description?.length || 0;
    if (descLength > 0) {
      analysisInfoEl.textContent = `Analyzed ${descLength.toLocaleString()} characters`;
      analysisInfoEl.classList.remove('hidden');
    } else {
      analysisInfoEl.textContent = 'No job description found to analyze';
      analysisInfoEl.classList.remove('hidden');
      analysisInfoEl.classList.add('warning');
    }
  }

  // Helper function to get risk class based on value
  const getRiskClass = (value) => {
    if (value >= 60) return 'danger';
    if (value >= 30) return 'warning';
    if (value >= 10) return 'caution';
    return 'safe';
  };

  // Update overall Scam and Spam risk scores with colors
  const scamRiskEl = document.getElementById('scamRiskValue');
  const spamRiskEl = document.getElementById('spamRiskValue');
  if (scamRiskEl) {
    const scamScore = result.scamScore || 0;
    scamRiskEl.textContent = `${scamScore}%`;
    scamRiskEl.className = `score-value ${getRiskClass(scamScore)}`;
  }
  if (spamRiskEl) {
    const spamScore = result.spamScore || 0;
    spamRiskEl.textContent = `${spamScore}%`;
    spamRiskEl.className = `score-value ${getRiskClass(spamScore)}`;
  }

  // Helper function to capitalize first letter
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // Update breakdown percentages for NEW scam/spam categories
  if (result.breakdown) {
    const scamSpamCategories = ['financial', 'communication', 'unrealistic', 'urgency', 'mlm', 'commission', 'postingAge'];
    scamSpamCategories.forEach(cat => {
      const valueEl = document.getElementById(`breakdown${capitalize(cat)}Value`);
      const barEl = document.getElementById(`breakdown${capitalize(cat)}Bar`);
      if (valueEl && barEl) {
        const value = Math.round(result.breakdown[cat] || 0);
        const displayValue = Math.min(100, value); // Cap display at 100%
        const riskClass = getRiskClass(displayValue);

        valueEl.textContent = `${displayValue}%`;
        valueEl.className = `breakdown-value ${riskClass}`;

        barEl.style.width = `${displayValue}%`;
        barEl.className = `breakdown-bar-fill ${riskClass}`;
      }
    });

    // Also update old category elements if they exist (for backwards compatibility)
    const oldCategories = ['temporal', 'content', 'company', 'behavioral'];
    oldCategories.forEach(cat => {
      const valueEl = document.getElementById(`breakdown${capitalize(cat)}Value`);
      const barEl = document.getElementById(`breakdown${capitalize(cat)}Bar`);
      if (valueEl && barEl) {
        // Map old categories to new ones or show 0
        let value = 0;
        if (cat === 'content') value = result.breakdown.unrealistic || 0;
        else if (cat === 'company') value = result.breakdown.communication || 0;
        valueEl.textContent = `${Math.round(value)}%`;
        barEl.style.width = `${Math.round(value)}%`;
        barEl.className = `breakdown-bar-fill ${getRiskClass(value)}`;
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
          <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>${flag}</span>
      `;
      flagsList.appendChild(flagItem);
    });
  } else {
    flagsList.innerHTML = '<div class="flag-item success"><span>No red flags detected - job appears legitimate!</span></div>';
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
        <div class="history-item-right">
          <div class="history-item-datetime">
            <span class="history-item-date">${dateStr}</span>
            <span class="history-item-time">${timeStr}</span>
          </div>
          <div class="history-item-actions">
            <button class="history-item-goto" title="Go to job posting" data-url="${scan.url || ''}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="history-item-delete" title="Remove" data-index="${index}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Go to job posting
      historyItem.querySelector('.history-item-goto').addEventListener('click', (e) => {
        e.stopPropagation();
        const url = e.currentTarget.dataset.url;
        if (url) {
          chrome.tabs.create({ url });
        }
      });

      // Delete history item
      historyItem.querySelector('.history-item-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.dataset.index);
        const history = await chrome.storage.local.get('scanHistory');
        const scanHistory = history.scanHistory || [];
        scanHistory.splice(idx, 1);
        await chrome.storage.local.set({ scanHistory });
        loadScanHistory();
      });

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
      <div class="saved-job-right">
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

  // Handle LinkedIn feature auto-disable notifications
  if (message.type === 'FEATURE_AUTO_DISABLED') {
    console.warn('[Popup] LinkedIn feature auto-disabled:', message.feature, message.reason);
    showToast({
      type: 'warning',
      title: 'LinkedIn Feature Disabled',
      message: `${message.feature}: ${message.reason}`,
      duration: 10000 // 10 seconds
    });
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
    initializeTodoList();
    initializeDailyMotivation();
  }, 100);
});

// ===== DAILY MOTIVATION STATEMENTS =====

const motivationalStatements = [
  // Persistence and resilience
  "Every application you send is a step forward, even when it doesn't feel like it.",
  "The right opportunity often comes after the ones that didn't work out.",
  "Your next role is out there—today's effort brings you closer to finding it.",
  "Rejection is redirection. Each 'no' is clearing the path to your 'yes'.",
  "The job search is a marathon, not a sprint. Pace yourself and keep moving.",
  "Your skills didn't disappear because a company couldn't see them.",
  "Behind every successful hire was someone who kept going when it was hard.",
  "Today's application could be tomorrow's interview could be next month's offer.",
  "The market is tough right now, but so are you.",
  "Consistency compounds. Small daily efforts lead to big breakthroughs.",

  // Self-worth and value
  "Your worth isn't determined by how quickly you find a job.",
  "You bring unique value that the right company is searching for.",
  "A slow hiring process says nothing about your qualifications.",
  "You're not starting over—you're starting from experience.",
  "The gap on your resume tells a story of resilience, not failure.",
  "Companies that ghost you weren't the right fit anyway.",
  "Your career is a long game. This chapter doesn't define the whole story.",
  "What you offer goes beyond what fits in a job description.",
  "The right team will recognize what you bring to the table.",
  "You've overcome challenges before. This one is no different.",

  // Modern job market awareness
  "In a market full of noise, authenticity stands out.",
  "ATS systems miss great candidates every day. Keep trying different approaches.",
  "Networking isn't about asking for jobs—it's about building real connections.",
  "The hidden job market is real. Not every opportunity is posted online.",
  "Quality applications beat quantity. Focus on roles that truly fit.",
  "LinkedIn isn't the only path. Explore industry-specific communities.",
  "Remote work expanded your options. Cast a wider net.",
  "Skills-based hiring is growing. Your non-traditional path may be an asset.",
  "The best opportunities often come through unexpected channels.",
  "Companies are struggling to find the right people too. It's a two-way search.",

  // Taking action
  "Done is better than perfect. Send that application today.",
  "One meaningful connection can change your entire trajectory.",
  "Update one thing on your profile today. Small improvements add up.",
  "Reach out to someone in your field. Most people want to help.",
  "Practice your story. How you present yourself matters.",
  "Research one company deeply instead of ten superficially.",
  "Follow up on that application. Persistence is noticed.",
  "Take a skill assessment. It might reveal strengths you've overlooked.",
  "Write that thank-you note. Details differentiate candidates.",
  "Set a small goal for today and accomplish it.",

  // Mental health and balance
  "It's okay to take a day off from the search. Rest is productive.",
  "Your mental health matters more than any job title.",
  "Celebrate small wins. They keep momentum alive.",
  "Talk to someone who understands. You're not alone in this.",
  "Comparison is the thief of job search joy. Run your own race.",
  "Frustration is valid. Feel it, then refocus.",
  "This period of uncertainty is temporary.",
  "Taking care of yourself is part of the job search strategy.",
  "You're allowed to be selective. Not every job is worth your time.",
  "Step away from the screen. Clarity often comes in moments of rest.",

  // Growth mindset
  "Every interview, even the tough ones, is practice for the right one.",
  "Feedback is a gift, even when it stings.",
  "The skills you're building during this search will serve you later.",
  "Adaptability is becoming your superpower.",
  "You're learning what you really want. That's valuable.",
  "This experience is making you a better evaluator of opportunities.",
  "You're developing resilience that will benefit your entire career.",
  "Each conversation teaches you something new about the industry.",
  "You're not just finding a job—you're discovering your next chapter.",
  "The best candidates keep learning, even between roles.",

  // Industry and timing
  "Hiring cycles ebb and flow. Slow periods don't last forever.",
  "Q1 and Q4 hiring patterns are real. Adjust expectations accordingly.",
  "Budget freezes lift. Positions reopen. Stay ready.",
  "Economic uncertainty affects hiring timelines, not your abilities.",
  "Some of the best companies are still hiring, even in downturns.",
  "Industries shift. Your transferable skills open unexpected doors.",
  "Startups and established companies hire differently. Explore both.",
  "Contract roles can lead to permanent positions. Stay open.",
  "The job you land might not exist yet. Keep your skills current.",
  "Market conditions change. Your preparation ensures you're ready when they do.",

  // Practical wisdom
  "Your resume is a living document. Keep refining it.",
  "Tailor each application. Generic rarely wins.",
  "Know your salary worth. Research before you negotiate.",
  "References matter. Nurture those relationships.",
  "Your online presence is part of your application. Audit it.",
  "Industry events, even virtual ones, create real opportunities.",
  "Informational interviews often lead somewhere unexpected.",
  "Recruiters remember candidates who follow up professionally.",
  "Your cover letter is a chance to show personality. Use it.",
  "Interview prep isn't optional. Practice out loud.",

  // Encouragement
  "Someone out there needs exactly what you offer.",
  "The right job is worth waiting for.",
  "You've already survived 100% of your hardest days.",
  "Trust the process, even when progress feels invisible.",
  "Your breakthrough could be one application away.",
  "Keep going. The view from the other side of this is worth it.",
  "You are more than this job search.",
  "This season of searching will end. Hold on.",
  "Better days are coming. Keep putting in the work.",
  "You're closer than you think.",

  // Mindset shifts
  "Instead of 'Why haven't I found something?' try 'What am I learning?'",
  "Rejection means you tried. That takes courage.",
  "The job search reveals what matters to you. Pay attention.",
  "Being selective isn't being difficult. It's being strategic.",
  "Your next role should want you as much as you want it.",
  "Interviewing is a two-way street. You're evaluating them too.",
  "A 'no' today doesn't mean 'no' forever with that company.",
  "Your unconventional background might be exactly what they need.",
  "Experience isn't just years—it's what you've learned and done.",
  "The best opportunities align with both your skills and values.",

  // Additional encouragement
  "Your persistence is already setting you apart from others who gave up.",
  "Every day you show up for your search is a day closer to success.",
  "The skills you've built don't expire. They're waiting for the right role.",
  "Someone will see your potential. Keep making yourself visible.",
  "Your next opportunity might come from the most unexpected place.",
  "The companies that take too long to respond often aren't worth your time.",
  "You're not just looking for any job—you're building your career.",
  "Each application is practice. Each interview is progress.",
  "The job market rewards those who don't give up.",
  "Your story of perseverance will inspire others someday.",
  "Not every open door is meant for you, and that's okay.",
  "The right fit goes both ways. Keep searching for mutual alignment."
];

function initializeDailyMotivation() {
  const motivationText = document.getElementById('motivationText');
  if (!motivationText) return;

  // Get the current day of the year for consistent daily rotation
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Use day of year to select a statement (cycles through all statements)
  const statementIndex = dayOfYear % motivationalStatements.length;
  motivationText.textContent = `"${motivationalStatements[statementIndex]}"`;
}

// ===== TO-DO LIST FUNCTIONALITY =====

// Todo data structure
let todos = {
  active: [],
  completed: []
};

// Current active tab in todo section
let currentTodoTab = 'active';

// Dragging state
let draggedTodoItem = null;

// Initialize todo list
async function initializeTodoList() {
  await loadTodos();
  renderTodos();
  updateTodoCounts();
  setupTodoEventListeners();
}

// Load todos from storage
async function loadTodos() {
  try {
    const result = await chrome.storage.local.get('userTodos');
    if (result.userTodos) {
      todos = result.userTodos;
    }
  } catch (error) {
    console.error('Error loading todos:', error);
  }
}

// Save todos to storage
async function saveTodos() {
  try {
    await chrome.storage.local.set({ userTodos: todos });
  } catch (error) {
    console.error('Error saving todos:', error);
  }
}

// Setup event listeners for todo list
function setupTodoEventListeners() {
  // Toggle expand/collapse
  const todoSection = document.getElementById('todoSection');
  const todoHeader = document.getElementById('todoHeader');
  const todoContent = document.getElementById('todoContent');
  const todoChevron = document.querySelector('.todo-chevron');

  if (todoHeader && todoSection) {
    todoHeader.addEventListener('click', () => {
      todoContent.classList.toggle('hidden');
      todoSection.classList.toggle('expanded');
    });
  }

  // Tab switching
  const activeTab = document.getElementById('activeTasksTab');
  const completedTab = document.getElementById('completedTasksTab');

  if (activeTab) {
    activeTab.addEventListener('click', () => switchTodoTab('active'));
  }
  if (completedTab) {
    completedTab.addEventListener('click', () => switchTodoTab('completed'));
  }

  // Add task
  const addTodoBtn = document.getElementById('addTodoBtn');
  const todoInput = document.getElementById('todoInput');

  if (addTodoBtn) {
    addTodoBtn.addEventListener('click', addTodo);
  }
  if (todoInput) {
    todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addTodo();
      }
    });
  }

  // Clear all button
  const clearAllBtn = document.getElementById('clearAllTodosBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllTodos);
  }
}

// Switch between active and completed tabs
function switchTodoTab(tab) {
  currentTodoTab = tab;

  // Update tab buttons
  const activeTab = document.getElementById('activeTasksTab');
  const completedTab = document.getElementById('completedTasksTab');
  const activeList = document.getElementById('activeTodoList');
  const completedList = document.getElementById('completedTodoList');
  const clearAllText = document.getElementById('clearAllText');

  if (tab === 'active') {
    activeTab.classList.add('active');
    completedTab.classList.remove('active');
    activeList.classList.remove('hidden');
    completedList.classList.add('hidden');
    if (clearAllText) clearAllText.textContent = 'Clear All Active';
  } else {
    activeTab.classList.remove('active');
    completedTab.classList.add('active');
    activeList.classList.add('hidden');
    completedList.classList.remove('hidden');
    if (clearAllText) clearAllText.textContent = 'Clear All Completed';
  }
}

// Add a new todo
function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();

  if (!text) return;

  const todo = {
    id: Date.now().toString(),
    text: text,
    createdAt: new Date().toISOString()
  };

  todos.active.unshift(todo);
  input.value = '';

  saveTodos();
  renderTodos();
  updateTodoCounts();
}

// Toggle todo completion
function toggleTodoCompletion(todoId, isCompleted) {
  if (isCompleted) {
    // Move from active to completed
    const todoIndex = todos.active.findIndex(t => t.id === todoId);
    if (todoIndex > -1) {
      const todo = todos.active.splice(todoIndex, 1)[0];
      todo.completedAt = new Date().toISOString();
      todos.completed.unshift(todo);
    }
  } else {
    // Move from completed to active
    const todoIndex = todos.completed.findIndex(t => t.id === todoId);
    if (todoIndex > -1) {
      const todo = todos.completed.splice(todoIndex, 1)[0];
      delete todo.completedAt;
      todos.active.unshift(todo);
    }
  }

  saveTodos();
  renderTodos();
  updateTodoCounts();
}

// Delete a todo
function deleteTodo(todoId, fromCompleted = false) {
  const list = fromCompleted ? 'completed' : 'active';
  todos[list] = todos[list].filter(t => t.id !== todoId);

  saveTodos();
  renderTodos();
  updateTodoCounts();
}

// Clear all todos in current tab
function clearAllTodos() {
  const list = currentTodoTab;
  const count = todos[list].length;

  if (count === 0) return;

  todos[list] = [];
  saveTodos();
  renderTodos();
  updateTodoCounts();
}

// Render todos
function renderTodos() {
  renderActiveTodos();
  renderCompletedTodos();
}

// Render active todos
function renderActiveTodos() {
  const list = document.getElementById('activeTodoList');
  if (!list) return;

  if (todos.active.length === 0) {
    list.innerHTML = `
      <div class="todo-empty">
        <span>No active tasks</span>
      </div>
    `;
    return;
  }

  list.innerHTML = todos.active.map(todo => `
    <div class="todo-item" data-id="${todo.id}" draggable="true">
      <input type="checkbox" class="todo-checkbox" data-id="${todo.id}">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="todo-delete-btn" data-id="${todo.id}" title="Delete task">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="todo-drag-handle" title="Drag to reorder">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="16" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="18" r="1.5" fill="currentColor"/>
          <circle cx="16" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </div>
    </div>
  `).join('');

  // Setup event listeners for checkboxes and delete buttons
  setupTodoEventHandlers(list, false);

  // Setup drag and drop for active list
  setupTodoDragAndDrop(list, 'active');
}

// Render completed todos
function renderCompletedTodos() {
  const list = document.getElementById('completedTodoList');
  if (!list) return;

  if (todos.completed.length === 0) {
    list.innerHTML = `
      <div class="todo-empty">
        <span>No completed tasks yet</span>
      </div>
    `;
    return;
  }

  list.innerHTML = todos.completed.map(todo => `
    <div class="todo-item completed" data-id="${todo.id}">
      <input type="checkbox" class="todo-checkbox" checked data-id="${todo.id}">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <span class="todo-completed-time">${formatCompletedTime(todo.completedAt)}</span>
      <button class="todo-delete-btn" data-id="${todo.id}" title="Delete task">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Setup event listeners for checkboxes and delete buttons
  setupTodoEventHandlers(list, true);
}

// Setup event handlers for todo checkboxes and delete buttons
function setupTodoEventHandlers(list, isCompleted) {
  // Handle checkbox changes
  list.querySelectorAll('.todo-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const todoId = checkbox.getAttribute('data-id');
      toggleTodoCompletion(todoId, !isCompleted);
    });
  });

  // Handle delete button clicks
  list.querySelectorAll('.todo-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const todoId = btn.getAttribute('data-id');
      deleteTodo(todoId, isCompleted);
    });
  });
}

// Format completed time
function formatCompletedTime(isoString) {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Update todo counts
function updateTodoCounts() {
  const activeCount = document.getElementById('todoCount');
  const completedCount = document.getElementById('completedCount');

  if (activeCount) {
    activeCount.textContent = todos.active.length;
    activeCount.style.display = todos.active.length > 0 ? 'flex' : 'none';
  }
  if (completedCount) {
    completedCount.textContent = todos.completed.length;
    completedCount.style.display = todos.completed.length > 0 ? 'inline' : 'none';
  }
}

// Setup drag and drop for todo items
function setupTodoDragAndDrop(list, listType) {
  const items = list.querySelectorAll('.todo-item');

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedTodoItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedTodoItem = null;

      // Update todos array order based on DOM order
      const newOrder = [];
      list.querySelectorAll('.todo-item').forEach(el => {
        const id = el.dataset.id;
        const todo = todos[listType].find(t => t.id === id);
        if (todo) newOrder.push(todo);
      });
      todos[listType] = newOrder;
      saveTodos();
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!draggedTodoItem || draggedTodoItem === item) return;

      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (e.clientY < midY) {
        item.parentNode.insertBefore(draggedTodoItem, item);
      } else {
        item.parentNode.insertBefore(draggedTodoItem, item.nextSibling);
      }
    });
  });
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
