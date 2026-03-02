// JobFiltr Per-User Storage Scoping Utility
// Namespaces user-specific storage keys with the user's email address
// to ensure complete data isolation between different accounts.

(function() {
  'use strict';

  // Keys that must be namespaced per-user
  const USER_SCOPED_KEYS = new Set([
    'filterSettings',
    'jobfiltr_templates',
    'userDocuments',
    'savedJobs',
    'scanHistory',
    'userTodos',
    'cloudSyncEnabled',
    'templatesCollapsed'
  ]);

  // Cache the user email to avoid repeated storage reads
  let _cachedUserEmail = null;
  let _cacheTimestamp = 0;
  const CACHE_TTL = 30000; // 30 seconds

  /**
   * Get the current user's email from storage.
   * Returns null if no user is signed in.
   */
  async function getCurrentUserEmail() {
    if (_cachedUserEmail && (Date.now() - _cacheTimestamp < CACHE_TTL)) {
      return _cachedUserEmail;
    }
    try {
      const { userEmail } = await chrome.storage.local.get('userEmail');
      _cachedUserEmail = userEmail || null;
      _cacheTimestamp = Date.now();
      return _cachedUserEmail;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear the cached email (call on sign-in/sign-out)
   */
  function clearUserEmailCache() {
    _cachedUserEmail = null;
    _cacheTimestamp = 0;
  }

  /**
   * Generate a user-scoped storage key.
   * Format: "key__user@email.com"
   * Falls back to the bare key if no user is logged in or key isn't user-scoped.
   */
  function scopedKey(baseKey, email) {
    if (!email || !USER_SCOPED_KEYS.has(baseKey)) return baseKey;
    return `${baseKey}__${email}`;
  }

  /**
   * Get user-scoped values from chrome.storage.local.
   * Accepts a single key string or array of keys.
   * Returns object with ORIGINAL (unscoped) key names.
   */
  async function getUserStorage(keys) {
    const email = await getCurrentUserEmail();
    const keyArray = Array.isArray(keys) ? keys : [keys];

    // Build map: scopedKey -> originalKey
    const keyMap = {};
    for (const key of keyArray) {
      keyMap[scopedKey(key, email)] = key;
    }

    const result = await chrome.storage.local.get(Object.keys(keyMap));

    // Remap scoped keys back to original keys
    const output = {};
    for (const [scoped, original] of Object.entries(keyMap)) {
      if (result[scoped] !== undefined) {
        output[original] = result[scoped];
      }
    }
    return output;
  }

  /**
   * Set user-scoped values in chrome.storage.local.
   * Accepts object with original key names, automatically scopes them.
   */
  async function setUserStorage(items) {
    const email = await getCurrentUserEmail();
    const scopedItems = {};
    for (const [key, value] of Object.entries(items)) {
      scopedItems[scopedKey(key, email)] = value;
    }
    return chrome.storage.local.set(scopedItems);
  }

  /**
   * Migrate global (unscoped) data to the current user's namespace.
   * Only migrates if:
   * 1. User is logged in
   * 2. The global key has data
   * 3. The scoped key does NOT yet have data
   * After migration, removes the global key to prevent stale data.
   * Idempotent — uses a per-user migration flag.
   */
  async function migrateGlobalToUser() {
    const email = await getCurrentUserEmail();
    if (!email) return { migrated: false, reason: 'no user' };

    // Check if already migrated
    const flagKey = `_migration_v1__${email}`;
    const flag = await chrome.storage.local.get(flagKey);
    if (flag[flagKey]) return { migrated: false, reason: 'already done' };

    const migrated = [];
    for (const key of USER_SCOPED_KEYS) {
      const scoped = scopedKey(key, email);
      if (scoped === key) continue; // Not actually scoped

      // Check if scoped version already exists
      const existing = await chrome.storage.local.get(scoped);
      if (existing[scoped] !== undefined) continue; // Already migrated

      // Check if global version exists
      const global = await chrome.storage.local.get(key);
      if (global[key] === undefined) continue; // Nothing to migrate

      // Migrate: copy global -> scoped, then remove global
      await chrome.storage.local.set({ [scoped]: global[key] });
      await chrome.storage.local.remove(key);
      migrated.push(key);
    }

    // Set migration flag
    await chrome.storage.local.set({ [flagKey]: Date.now() });
    return { migrated: true, keys: migrated };
  }

  // Expose globally (works in content scripts, popup, and service worker)
  globalThis.JobFiltrStorage = {
    getCurrentUserEmail,
    clearUserEmailCache,
    scopedKey,
    getUserStorage,
    setUserStorage,
    migrateGlobalToUser,
    USER_SCOPED_KEYS
  };
})();
