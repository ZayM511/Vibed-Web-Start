// Settings page JavaScript

// Default Convex URL
const DEFAULT_CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

// DOM Elements
const convexUrlInput = document.getElementById('convexUrl');
const autoScanToggle = document.getElementById('autoScanToggle');
const notificationsToggle = document.getElementById('notificationsToggle');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const successMessage = document.getElementById('successMessage');

// Load settings on page load
loadSettings();

// Event listeners
saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetToDefaults);
autoScanToggle.addEventListener('click', toggleAutoScan);
notificationsToggle.addEventListener('click', toggleNotifications);

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

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }

  // Escape to close
  if (e.key === 'Escape') {
    window.close();
  }
});
