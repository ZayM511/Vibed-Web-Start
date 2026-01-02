/**
 * Supabase Client for Chrome Extension
 * Uses chrome.storage.local for session persistence
 */

// Supabase configuration - these should be set in the extension's options page
// or loaded from chrome.storage.sync
const SUPABASE_CONFIG_KEY = 'supabaseConfig';

/**
 * Custom storage adapter for Chrome extension
 */
const chromeStorageAdapter = {
  getItem: async (key) => {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },
  setItem: async (key, value) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key) => {
    await chrome.storage.local.remove(key);
  }
};

/**
 * Initialize Supabase client
 * Returns null if not configured
 */
async function createSupabaseClient() {
  const config = await chrome.storage.sync.get(SUPABASE_CONFIG_KEY);
  const { supabaseUrl, supabaseAnonKey } = config[SUPABASE_CONFIG_KEY] || {};

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase not configured');
    return null;
  }

  // Import Supabase from CDN or bundled version
  // For MV3, you'll need to bundle this or use importScripts
  if (typeof supabase === 'undefined') {
    console.warn('Supabase library not loaded');
    return null;
  }

  return supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: chromeStorageAdapter
    }
  });
}

/**
 * Free tier limits
 */
const FREE_LIMITS = {
  excludeKeywords: 3,
  excludeCompanies: 1,
  monthlyAnalyses: 30
};

/**
 * Pro status cache
 */
let proStatusCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached pro status or fetch from Supabase
 */
async function getProStatus(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && proStatusCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return proStatusCache;
  }

  // Check chrome storage cache
  if (!forceRefresh) {
    const cached = await chrome.storage.local.get('proStatus');
    if (cached.proStatus && Date.now() - cached.proStatus.cachedAt < CACHE_DURATION) {
      proStatusCache = cached.proStatus;
      cacheTimestamp = cached.proStatus.cachedAt;
      return proStatusCache;
    }
  }

  const client = await createSupabaseClient();
  if (!client) {
    return { isPro: false, tier: 'free', isLoading: false, expiresAt: null };
  }

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { isPro: false, tier: 'free', isLoading: false, expiresAt: null };
    }

    const { data } = await client
      .from('user_tiers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const isPro = data?.tier === 'pro' && (
      data?.subscription_status === 'active' ||
      (data?.current_period_end && new Date(data.current_period_end) > new Date())
    );

    const status = {
      isPro,
      tier: data?.tier || 'free',
      isLoading: false,
      expiresAt: data?.current_period_end || null,
      cachedAt: Date.now()
    };

    // Update cache
    proStatusCache = status;
    cacheTimestamp = Date.now();
    await chrome.storage.local.set({ proStatus: status });

    return status;
  } catch (error) {
    console.error('Error fetching pro status:', error);
    return { isPro: false, tier: 'free', isLoading: false, expiresAt: null };
  }
}

/**
 * Check if user can use include keywords (Pro only)
 */
async function canUseIncludeKeywords() {
  const status = await getProStatus();
  return status.isPro;
}

/**
 * Check if user can use saved templates (Pro only)
 */
async function canUseSavedTemplates() {
  const status = await getProStatus();
  return status.isPro;
}

/**
 * Get the exclude keyword limit for current tier
 */
async function getExcludeKeywordLimit() {
  const status = await getProStatus();
  return status.isPro ? Infinity : FREE_LIMITS.excludeKeywords;
}

/**
 * Get the exclude company limit for current tier
 */
async function getExcludeCompanyLimit() {
  const status = await getProStatus();
  return status.isPro ? Infinity : FREE_LIMITS.excludeCompanies;
}

/**
 * Get remaining monthly analyses
 */
async function getRemainingAnalyses() {
  const status = await getProStatus();
  if (status.isPro) return Infinity;

  const client = await createSupabaseClient();
  if (!client) return FREE_LIMITS.monthlyAnalyses;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return FREE_LIMITS.monthlyAnalyses;

    const { data } = await client.rpc('get_analysis_count', {
      p_user_id: user.id
    });

    const used = data ?? 0;
    return Math.max(0, FREE_LIMITS.monthlyAnalyses - used);
  } catch {
    return FREE_LIMITS.monthlyAnalyses;
  }
}

/**
 * Get community blocklist
 */
async function getCommunityBlocklist() {
  const client = await createSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('community_blocklist')
      .select('*')
      .eq('verified', true);

    if (error) {
      console.error('Error fetching blocklist:', error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get user settings from Supabase
 */
async function getUserSettings() {
  const client = await createSupabaseClient();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user settings:', error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Save user settings to Supabase
 */
async function saveUserSettings(settings) {
  const client = await createSupabaseClient();
  if (!client) return false;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return false;

    const { error } = await client
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving user settings:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Export for use in other extension scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSupabaseClient,
    getProStatus,
    canUseIncludeKeywords,
    canUseSavedTemplates,
    getExcludeKeywordLimit,
    getExcludeCompanyLimit,
    getRemainingAnalyses,
    getCommunityBlocklist,
    getUserSettings,
    saveUserSettings,
    FREE_LIMITS
  };
}

// Make available globally in service worker context
if (typeof self !== 'undefined') {
  self.SupabaseExtension = {
    createSupabaseClient,
    getProStatus,
    canUseIncludeKeywords,
    canUseSavedTemplates,
    getExcludeKeywordLimit,
    getExcludeCompanyLimit,
    getRemainingAnalyses,
    getCommunityBlocklist,
    getUserSettings,
    saveUserSettings,
    FREE_LIMITS
  };
}
