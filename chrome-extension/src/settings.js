// Settings page JavaScript

// Default Convex URL
const DEFAULT_CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

// Admin emails that can see backend section
const ADMIN_EMAILS = [
  'isaiah.e.malone@gmail.com',
  'support@jobfiltr.app',
  'hello@jobfiltr.app'
];

// Current user state
let currentUser = null;

// DOM Elements
const convexUrlInput = document.getElementById('convexUrl');
const autoScanToggle = document.getElementById('autoScanToggle');
const notificationsToggle = document.getElementById('notificationsToggle');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const successMessage = document.getElementById('successMessage');
const themeToggle = document.getElementById('themeToggle');

// Account Elements
const accountSection = document.getElementById('accountSection');
const backendSection = document.getElementById('backendSection');
const profileCard = document.getElementById('profileCard');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileNameDisplay = document.getElementById('profileNameDisplay');
const profileNameEdit = document.getElementById('profileNameEdit');
const profileNameInput = document.getElementById('profileNameInput');
const editNameBtn = document.getElementById('editNameBtn');
const saveNameBtn = document.getElementById('saveNameBtn');
const cancelNameBtn = document.getElementById('cancelNameBtn');
const notSignedInMessage = document.getElementById('notSignedInMessage');
const openExtensionLink = document.getElementById('openExtensionLink');

// Initialize theme, auth, and load settings on page load
initTheme();
initAuth();
loadSettings();

// Theme Management
function initTheme() {
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme) {
      setTheme(result.theme);
    } else {
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

// Auth Management
async function initAuth() {
  try {
    const result = await chrome.storage.local.get(['authToken', 'userEmail', 'userName', 'authExpiry']);

    if (result.authToken && result.userEmail) {
      // Check if token is still valid
      const now = Date.now();
      if (result.authExpiry && now < result.authExpiry) {
        currentUser = {
          email: result.userEmail,
          name: result.userName || ''
        };
        showAuthenticatedProfile();
        return;
      }
    }

    // Not signed in or expired
    showNotSignedIn();
  } catch (error) {
    console.error('Error checking auth state:', error);
    showNotSignedIn();
  }
}

function showAuthenticatedProfile() {
  if (!currentUser) return;

  // Show profile card, hide not signed in message
  profileCard.classList.remove('hidden');
  notSignedInMessage.classList.add('hidden');

  // Set avatar initial
  const initial = currentUser.name
    ? currentUser.name.charAt(0).toUpperCase()
    : currentUser.email.charAt(0).toUpperCase();
  profileAvatar.textContent = initial;

  // Set name and email
  profileName.textContent = currentUser.name || 'No display name set';
  profileEmail.textContent = currentUser.email;

  // Check if admin email - show backend section
  if (ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
    backendSection.classList.remove('hidden');
  } else {
    backendSection.classList.add('hidden');
  }
}

function showNotSignedIn() {
  profileCard.classList.add('hidden');
  notSignedInMessage.classList.remove('hidden');
  backendSection.classList.add('hidden');
}

function startEditName() {
  profileNameDisplay.classList.add('hidden');
  profileNameEdit.classList.remove('hidden');
  profileNameInput.value = currentUser?.name || '';
  profileNameInput.focus();
}

function cancelEditName() {
  profileNameEdit.classList.add('hidden');
  profileNameDisplay.classList.remove('hidden');
}

async function saveDisplayName() {
  const newName = profileNameInput.value.trim();

  try {
    // Save to storage
    await chrome.storage.local.set({ userName: newName });

    // Update current user
    if (currentUser) {
      currentUser.name = newName;
    }

    // Update UI
    profileName.textContent = newName || 'No display name set';
    const initial = newName
      ? newName.charAt(0).toUpperCase()
      : currentUser.email.charAt(0).toUpperCase();
    profileAvatar.textContent = initial;

    // Hide edit mode
    cancelEditName();

    // Show success
    showSuccessMessage();
  } catch (error) {
    console.error('Error saving display name:', error);
    alert('Failed to save display name. Please try again.');
  }
}

// Close button
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

// Event listeners
saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetToDefaults);
autoScanToggle.addEventListener('click', toggleAutoScan);
notificationsToggle.addEventListener('click', toggleNotifications);
themeToggle.addEventListener('click', toggleTheme);
closeSettingsBtn.addEventListener('click', closeSettingsPage);

// Profile editing listeners
editNameBtn.addEventListener('click', startEditName);
saveNameBtn.addEventListener('click', saveDisplayName);
cancelNameBtn.addEventListener('click', cancelEditName);
profileNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveDisplayName();
  if (e.key === 'Escape') cancelEditName();
});
openExtensionLink.addEventListener('click', () => {
  // Can't directly open popup, but can show instructions
  alert('Click the JobFiltr icon in your browser toolbar to sign in.');
});

// Load current settings
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      convexUrl: DEFAULT_CONVEX_URL,
      autoScan: false,
      notifications: true
    });

    // Populate form fields
    convexUrlInput.value = settings.convexUrl || DEFAULT_CONVEX_URL;

    // Update toggles
    if (settings.autoScan) {
      autoScanToggle.classList.add('active');
    }

    if (settings.notifications) {
      notificationsToggle.classList.add('active');
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings
async function saveSettings() {
  try {
    const settings = {
      convexUrl: convexUrlInput.value.trim() || DEFAULT_CONVEX_URL,
      autoScan: autoScanToggle.classList.contains('active'),
      notifications: notificationsToggle.classList.contains('active')
    };

    // Validate Convex URL
    if (!isValidUrl(settings.convexUrl)) {
      alert('Please enter a valid Convex URL (e.g., https://your-deployment.convex.cloud)');
      convexUrlInput.focus();
      return;
    }

    // Save to storage
    await chrome.storage.sync.set(settings);

    // Show success message
    showSuccessMessage();

    console.log('Settings saved:', settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Failed to save settings. Please try again.');
  }
}

// Reset to defaults
async function resetToDefaults() {
  if (!confirm('Reset all settings to default values?')) {
    return;
  }

  try {
    const defaultSettings = {
      convexUrl: DEFAULT_CONVEX_URL,
      autoScan: false,
      notifications: true
    };

    await chrome.storage.sync.set(defaultSettings);

    // Reload the page to reflect changes
    window.location.reload();
  } catch (error) {
    console.error('Error resetting settings:', error);
    alert('Failed to reset settings. Please try again.');
  }
}

// Toggle auto-scan
function toggleAutoScan() {
  autoScanToggle.classList.toggle('active');
}

// Toggle notifications
function toggleNotifications() {
  notificationsToggle.classList.toggle('active');
}

// Show success message
function showSuccessMessage() {
  successMessage.classList.add('show');

  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 3000);
}

// Validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Close the settings page
function closeSettingsPage() {
  // Try to close using Chrome tabs API first (works for extension-opened tabs)
  chrome.tabs.getCurrent((tab) => {
    if (tab && tab.id) {
      chrome.tabs.remove(tab.id);
    } else {
      // Fallback to window.close() for popup mode
      window.close();
    }
  });
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }

  // Escape to close
  if (e.key === 'Escape') {
    closeSettingsPage();
  }
});
