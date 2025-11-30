# Chrome Extension Developer Skill

## Skill Metadata
- **Name**: extension-developer
- **Description**: Master Chrome extension developer with deep expertise in job board integrations and filtering systems. Use when creating, modifying, or debugging Chrome extensions, especially for job-seeking platforms like LinkedIn, Indeed, and Google Jobs. Provides comprehensive development workflows including manifest v3 implementation, content script injection, background service workers, popup interfaces, storage management, cross-origin communication, Chrome Web Store publishing requirements, and advanced filtering capabilities for job postings. Ensures modern 2025+ standards with security best practices, performance optimization, and seamless user experience.
- **Version**: 1.0.0
- **Last Updated**: 2025-11-18

---

# Extension Developer

Expert Chrome extension development with specialized knowledge in job board filtering and optimization.

## Core Development Workflow

### 1. Project Initialization

Create extension structure with modern standards:

```bash
# Initialize project
mkdir -p {extension-name}/{src,public,dist}
cd {extension-name}

# Create manifest.json (Manifest V3)
cat > src/manifest.json << 'EOF'
{
  "manifest_version": 3,
  "name": "Extension Name",
  "version": "1.0.0",
  "description": "Professional description",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["*://*.linkedin.com/*", "*://*.indeed.com/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["*://*.linkedin.com/*", "*://*.indeed.com/*"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
EOF
```

### 2. Job Board Integration Patterns

#### LinkedIn Detection Patterns

```javascript
// Detect staffing firms
const staffingIndicators = [
  /staffing|recruiting|talent|solutions|workforce/i,
  /\b(tek|pro|consulting|systems|global|services)\b/i,
  'Recruiting Agency', 'Staffing Firm'
];

// Extract true applicant count
const getApplicantCount = () => {
  const elem = document.querySelector('[class*="applicant-count"]');
  return elem?.innerText.match(/\d+/)?.[0] || 'Unknown';
};

// Verify remote status
const isGenuineRemote = (jobCard) => {
  const location = jobCard.querySelector('[class*="job-location"]')?.innerText || '';
  const suspicious = ['hybrid', 'occasional', 'flexible', 'some remote'];
  return !suspicious.some(term => location.toLowerCase().includes(term));
};
```

#### Indeed Integration

```javascript
// Remove sponsored posts
document.querySelectorAll('[data-testid*="sponsored"]').forEach(el => {
  el.closest('.jobsearch-ResultsList > li')?.remove();
});

// Filter by true remote
const filterRemoteJobs = () => {
  document.querySelectorAll('.job_seen_beacon').forEach(job => {
    const location = job.querySelector('[data-testid="job-location"]')?.innerText;
    if (!location?.includes('Remote') || location.includes('Hybrid')) {
      job.style.display = 'none';
    }
  });
};
```

### 3. Performance Optimization

#### Efficient DOM Manipulation

```javascript
// Use MutationObserver for dynamic content
const observer = new MutationObserver((mutations) => {
  // Batch DOM updates
  requestAnimationFrame(() => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        processNewJobs(mutation.addedNodes);
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false // Minimize observation overhead
});
```

#### Memory Management

```javascript
// Clean up resources
const cleanup = () => {
  observer.disconnect();
  chrome.storage.local.clear(['tempData']);
  document.removeEventListener('scroll', scrollHandler);
};

// Implement in service worker lifecycle
chrome.runtime.onSuspend.addListener(cleanup);
```

### 4. Storage & State Management

```javascript
// Efficient storage patterns
class ExtensionStorage {
  static async get(keys) {
    return chrome.storage.local.get(keys);
  }
  
  static async set(data) {
    // Batch updates
    return chrome.storage.local.set(data);
  }
  
  static async getFilters() {
    const { filters = {} } = await this.get('filters');
    return {
      excludeStaffing: filters.excludeStaffing ?? true,
      hideSponsored: filters.hideSponsored ?? true,
      remoteOnly: filters.remoteOnly ?? false,
      minApplicants: filters.minApplicants ?? 0,
      maxApplicants: filters.maxApplicants ?? 1000
    };
  }
}
```

### 5. User Interface Development

#### Modern Popup Design

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>JobFiltr</h1>
      <span class="version">v1.0.0</span>
    </header>
    
    <section class="filters">
      <div class="filter-group">
        <label class="toggle">
          <input type="checkbox" id="staffing-filter">
          <span>Hide Staffing Firms</span>
        </label>
      </div>
      
      <div class="filter-group">
        <label class="slider">
          <span>Max Applicants</span>
          <input type="range" id="applicant-range" min="0" max="500">
          <output>100</output>
        </label>
      </div>
    </section>
    
    <footer>
      <button id="apply-filters" class="primary">Apply Filters</button>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### 6. Security Implementation

#### Content Security Policy

```javascript
// Secure communication pattern
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate sender
  if (!sender.tab || !sender.url.match(/^https:\/\/(www\.)?(linkedin|indeed)\.com/)) {
    return false;
  }
  
  // Sanitize data
  const sanitized = DOMPurify.sanitize(request.data);
  
  // Process request
  processSecureRequest(sanitized).then(sendResponse);
  return true; // Keep channel open for async response
});
```

#### Permission Management

```javascript
// Request permissions only when needed
async function requestPermission(origin) {
  const granted = await chrome.permissions.request({
    origins: [origin]
  });
  
  if (!granted) {
    throw new Error('Permission denied');
  }
}
```

### 7. Testing Framework

Use scripts/test_extension.js for comprehensive testing:

```javascript
// Run Playwright tests
await runPlaywrightTests();

// Validate manifest
await validateManifest();

// Check performance metrics
await measurePerformance();
```

### 8. Chrome Web Store Publishing

#### Pre-submission Checklist

1. **Privacy Policy**: Include clear data handling practices
2. **Screenshots**: 1280x800 or 640x400, showing key features
3. **Description**: 132 chars short, detailed description with features
4. **Permissions Justification**: Document each permission usage
5. **Testing**: Complete testing on multiple job sites
6. **Icon Assets**: 128x128 PNG with transparency
7. **Version Control**: Semantic versioning (1.0.0)

#### Submission Package

```bash
# Build production bundle
npm run build

# Create ZIP for submission
zip -r extension.zip dist/ -x "*.DS_Store" "*__MACOSX*"

# Verify package
scripts/verify_submission.py extension.zip
```

## Advanced Features

### Dynamic Filter Engine

See references/filter-engine.md for complex filtering logic

### API Integration

See references/api-integration.md for external service connections

### Analytics Implementation

See references/analytics.md for usage tracking patterns

## Resource Integration

### Context7 MCP Usage

```javascript
// Retrieve latest Chrome extension APIs
await context7.fetch('chrome.storage API latest changes 2025');
```

### Perplexity AI Integration

```javascript
// Get current job board patterns
await perplexityAI.search('LinkedIn job posting DOM structure 2025');
```

### Shadcn Components

```javascript
// Import modern UI components
import { Button, Toggle, Slider } from '@shadcn/ui';
```

## Error Handling & Debugging

### Common Issues Resolution

1. **Content script injection failures**: Check manifest permissions and matches patterns
2. **Storage quota exceeded**: Implement data pruning and compression
3. **Performance degradation**: Profile with Chrome DevTools Performance tab
4. **Cross-origin errors**: Verify host_permissions in manifest

### Debug Workflow

```javascript
// Enhanced logging for development
const debug = {
  log: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[JobFiltr]', ...args);
    }
  },
  error: (error) => {
    console.error('[JobFiltr Error]', error);
    // Send to error tracking service
    trackError(error);
  }
};
```

## Performance Benchmarks

Target metrics for 2025+ standards:

- Initial load: < 50ms
- Filter application: < 100ms
- Memory usage: < 50MB
- CPU usage: < 5% idle
- Storage size: < 5MB

## Deployment Strategy

1. Test on dev channel first
2. Gradual rollout to 5% → 25% → 100%
3. Monitor crash reports and user feedback
4. Implement feature flags for safe updates
5. Maintain backward compatibility

## Critical Success Factors

1. **Zero false positives**: Never hide legitimate jobs
2. **Privacy first**: No external data transmission without consent
3. **Performance**: Imperceptible to user workflow
4. **Reliability**: Work across site updates
5. **User control**: All filters toggleable

---

## Reference: Filter Engine

### Advanced Filtering Logic Implementation

This section provides comprehensive filtering patterns and algorithms for job board content manipulation.

#### Multi-Stage Filtering Pipeline

```javascript
class FilterEngine {
  constructor(config) {
    this.config = config;
    this.stages = [
      this.preFilter,
      this.mainFilter,
      this.postFilter,
      this.visualUpdate
    ];
  }
  
  async process(jobElements) {
    let results = jobElements;
    for (const stage of this.stages) {
      results = await stage.call(this, results);
    }
    return results;
  }
  
  preFilter(elements) {
    // Remove invalid elements
    return Array.from(elements).filter(el => {
      return el && el.querySelector('[data-job-id]');
    });
  }
  
  mainFilter(elements) {
    return elements.filter(job => {
      const score = this.calculateJobScore(job);
      return score >= this.config.minScore;
    });
  }
  
  calculateJobScore(job) {
    let score = 100;
    
    // Staffing firm detection (-50 points)
    if (this.isStaffingFirm(job)) score -= 50;
    
    // Sponsored post (-30 points)
    if (this.isSponsored(job)) score -= 30;
    
    // Location mismatch (-40 points)
    if (!this.matchesLocationPreference(job)) score -= 40;
    
    // Applicant count scoring
    const applicants = this.getApplicantCount(job);
    if (applicants > this.config.maxApplicants) score -= 25;
    
    return Math.max(0, score);
  }
  
  postFilter(elements) {
    // Apply visual indicators
    elements.forEach(job => {
      const score = job.dataset.filterScore;
      if (score < 50) {
        job.style.opacity = '0.5';
        job.dataset.filterReason = this.getFilterReason(job);
      }
    });
    return elements;
  }
  
  visualUpdate(elements) {
    // Add filter badges
    elements.forEach(job => {
      if (job.dataset.filterReason) {
        this.addFilterBadge(job, job.dataset.filterReason);
      }
    });
    return elements;
  }
  
  addFilterBadge(element, reason) {
    const badge = document.createElement('div');
    badge.className = 'filter-badge';
    badge.textContent = reason;
    badge.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: #ff6b6b;
      color: white;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      z-index: 1000;
    `;
    element.style.position = 'relative';
    element.appendChild(badge);
  }
}
```

#### Intelligent Pattern Matching

```javascript
class PatternMatcher {
  constructor() {
    this.patterns = {
      staffingFirms: this.loadStaffingPatterns(),
      genuineRemote: this.loadRemotePatterns(),
      salaryRanges: this.loadSalaryPatterns()
    };
  }
  
  loadStaffingPatterns() {
    return {
      // Company name patterns
      companyNames: [
        /\b(tek|sys|pro|soft|cyber|net|data|cloud)\s*(systems?|solutions?|tek|pro|corp)?\b/i,
        /\b(consulting|staffing|recruiting|talent|workforce)\b/i,
        /\b(robert\s*half|randstad|adecco|manpower|kelly\s*services)\b/i,
        /\b(apex|insight|cybercoders|kforce|modis|judge)\b/i
      ],
      // Description patterns
      descriptions: [
        /our client is (seeking|looking|hiring)/i,
        /on behalf of our client/i,
        /working with a (leading|top|fortune)/i,
        /partnered with a client/i
      ],
      // URL patterns
      urls: [
        /careers\.(tek|pro|staff|talent)/i,
        /recruiting|staffing|consultancy/i
      ]
    };
  }
  
  loadRemotePatterns() {
    return {
      genuine: [
        /fully\s*remote/i,
        /100%\s*remote/i,
        /remote\s*first/i,
        /distributed\s*team/i
      ],
      fake: [
        /remote\s*possible/i,
        /occasionally\s*remote/i,
        /hybrid/i,
        /flexible\s*work/i,
        /remote\s*days?\s*available/i
      ]
    };
  }
  
  loadSalaryPatterns() {
    return {
      extraction: [
        /\$\s*(\d{1,3})[,.]?(\d{3})\s*[-–]\s*\$?\s*(\d{1,3})[,.]?(\d{3})/,
        /(\d{2,3})k\s*[-–]\s*(\d{2,3})k/i,
        /\$\s*(\d{2,3})\s*(?:k|thousand)/i
      ],
      normalization: (match) => {
        // Convert to standard range format
        const numbers = match.match(/\d+/g);
        if (numbers.length >= 2) {
          const min = parseInt(numbers[0]) * (match.includes('k') ? 1000 : 1);
          const max = parseInt(numbers[1]) * (match.includes('k') ? 1000 : 1);
          return { min, max };
        }
        return null;
      }
    };
  }
  
  match(text, patternType) {
    const patterns = this.patterns[patternType];
    if (Array.isArray(patterns)) {
      return patterns.some(pattern => pattern.test(text));
    }
    
    // Complex matching logic for objects
    if (typeof patterns === 'object') {
      for (const [key, patternList] of Object.entries(patterns)) {
        if (Array.isArray(patternList)) {
          const matches = patternList.some(p => p.test(text));
          if (matches) return { type: key, matched: true };
        }
      }
    }
    return false;
  }
}
```

#### Contextual Analysis Engine

```javascript
class ContextAnalyzer {
  constructor() {
    this.nlpProcessor = new SimpleNLP();
  }
  
  analyzeJobContext(jobElement) {
    const context = {
      title: this.extractTitle(jobElement),
      company: this.extractCompany(jobElement),
      description: this.extractDescription(jobElement),
      metadata: this.extractMetadata(jobElement)
    };
    
    return {
      legitimacy: this.calculateLegitimacy(context),
      relevance: this.calculateRelevance(context),
      quality: this.calculateQuality(context)
    };
  }
  
  calculateLegitimacy(context) {
    let score = 100;
    
    // Check for staffing indicators
    const staffingKeywords = ['client', 'behalf', 'partnering', 'consulting firm'];
    const descLower = context.description.toLowerCase();
    
    staffingKeywords.forEach(keyword => {
      if (descLower.includes(keyword)) score -= 15;
    });
    
    // Check company verification
    if (!this.isVerifiedCompany(context.company)) score -= 20;
    
    // Check for vague descriptions
    if (this.isVagueDescription(context.description)) score -= 25;
    
    return Math.max(0, score);
  }
  
  calculateRelevance(context) {
    // Match against user preferences
    const userSkills = this.getUserSkills();
    const jobSkills = this.extractSkills(context.description);
    
    const overlap = jobSkills.filter(skill => 
      userSkills.includes(skill)
    ).length;
    
    return (overlap / userSkills.length) * 100;
  }
  
  calculateQuality(context) {
    const factors = {
      hasDetailedDescription: context.description.length > 500,
      hasSalaryInfo: /\$\d+/.test(context.description),
      hasRequirements: /requirements?|qualifications?/i.test(context.description),
      hasResponsibilities: /responsibilities|duties/i.test(context.description),
      hasBenefits: /benefits?|perks?/i.test(context.description)
    };
    
    const score = Object.values(factors).filter(Boolean).length * 20;
    return score;
  }
  
  isVerifiedCompany(companyName) {
    // Check against known companies database
    return !this.isLikelyStaffingFirm(companyName);
  }
  
  isLikelyStaffingFirm(companyName) {
    const patterns = [
      /consulting/i,
      /staffing/i,
      /solutions/i,
      /systems/i,
      /technologies/i,
      /global.*services/i
    ];
    
    return patterns.some(p => p.test(companyName));
  }
  
  isVagueDescription(description) {
    const vagueIndicators = [
      description.length < 200,
      !/\b(you will|your|responsibilities)\b/i.test(description),
      /exciting opportunity/i.test(description),
      /our client/i.test(description)
    ];
    
    return vagueIndicators.filter(Boolean).length >= 2;
  }
  
  extractSkills(description) {
    // Simple skill extraction
    const techStack = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue',
      'node', 'django', 'spring', 'aws', 'azure', 'docker',
      'kubernetes', 'sql', 'nosql', 'mongodb', 'postgresql'
    ];
    
    const found = [];
    const descLower = description.toLowerCase();
    
    techStack.forEach(tech => {
      if (descLower.includes(tech)) found.push(tech);
    });
    
    return found;
  }
  
  getUserSkills() {
    // Retrieve from storage
    return JSON.parse(localStorage.getItem('userSkills') || '[]');
  }
}
```

#### Performance-Optimized Batch Processing

```javascript
class BatchProcessor {
  constructor(batchSize = 10) {
    this.batchSize = batchSize;
    this.queue = [];
    this.processing = false;
  }
  
  async addJobs(jobs) {
    this.queue.push(...jobs);
    if (!this.processing) {
      await this.process();
    }
  }
  
  async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      await new Promise(resolve => {
        requestIdleCallback(() => {
          this.processBatch(batch);
          resolve();
        }, { timeout: 50 });
      });
    }
    
    this.processing = false;
  }
  
  processBatch(batch) {
    batch.forEach(job => {
      this.filterJob(job);
    });
  }
  
  filterJob(job) {
    // Apply filters with minimal DOM manipulation
    const shouldHide = this.evaluateFilters(job);
    
    if (shouldHide) {
      // Batch DOM updates
      job.style.display = 'none';
      job.dataset.filtered = 'true';
    }
  }
  
  evaluateFilters(job) {
    // Cached filter evaluation
    const cacheKey = job.dataset.jobId;
    const cached = this.filterCache?.get(cacheKey);
    
    if (cached !== undefined) return cached;
    
    const result = this.runFilters(job);
    this.filterCache?.set(cacheKey, result);
    
    return result;
  }
}
```

---

## Reference: API Integration

### External Service Connections and Data Synchronization

This section covers integration patterns for connecting the extension with external APIs and services.

#### Authentication Management

```javascript
class AuthManager {
  constructor() {
    this.tokenKey = 'auth_token';
    this.refreshKey = 'refresh_token';
    this.expiryKey = 'token_expiry';
  }
  
  async authenticate(credentials) {
    try {
      const response = await fetch('https://api.jobfiltr.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) throw new Error('Authentication failed');
      
      const { access_token, refresh_token, expires_in } = await response.json();
      
      await this.storeTokens(access_token, refresh_token, expires_in);
      return { success: true };
      
    } catch (error) {
      console.error('Auth error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async storeTokens(accessToken, refreshToken, expiresIn) {
    const expiry = Date.now() + (expiresIn * 1000);
    
    await chrome.storage.local.set({
      [this.tokenKey]: accessToken,
      [this.refreshKey]: refreshToken,
      [this.expiryKey]: expiry
    });
  }
  
  async getValidToken() {
    const stored = await chrome.storage.local.get([
      this.tokenKey, 
      this.refreshKey, 
      this.expiryKey
    ]);
    
    if (!stored[this.tokenKey]) {
      throw new Error('No authentication token');
    }
    
    // Check if token expired
    if (Date.now() >= stored[this.expiryKey]) {
      return await this.refreshToken(stored[this.refreshKey]);
    }
    
    return stored[this.tokenKey];
  }
  
  async refreshToken(refreshToken) {
    const response = await fetch('https://api.jobfiltr.com/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const { access_token, expires_in } = await response.json();
    await this.storeTokens(access_token, refreshToken, expires_in);
    
    return access_token;
  }
  
  async logout() {
    await chrome.storage.local.remove([
      this.tokenKey, 
      this.refreshKey, 
      this.expiryKey
    ]);
  }
}
```

#### API Client Implementation

```javascript
class APIClient {
  constructor(baseURL = 'https://api.jobfiltr.com') {
    this.baseURL = baseURL;
    this.authManager = new AuthManager();
  }
  
  async request(endpoint, options = {}) {
    const token = await this.authManager.getValidToken();
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Extension-Version': chrome.runtime.getManifest().version
      }
    };
    
    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, finalOptions);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  handleError(error) {
    // Log to error tracking service
    if (error.message.includes('401')) {
      // Unauthorized - trigger re-authentication
      chrome.runtime.sendMessage({ type: 'AUTH_REQUIRED' });
    }
  }
  
  // Specific API methods
  async syncFilters(filters) {
    return this.request('/filters/sync', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  }
  
  async getFilterPresets() {
    return this.request('/filters/presets');
  }
  
  async reportJob(jobId, reason) {
    return this.request('/jobs/report', {
      method: 'POST',
      body: JSON.stringify({ jobId, reason })
    });
  }
  
  async getUserPreferences() {
    return this.request('/user/preferences');
  }
  
  async updateUserPreferences(preferences) {
    return this.request('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  }
}
```

#### WebSocket Connection for Real-time Updates

```javascript
class WebSocketManager {
  constructor(url = 'wss://api.jobfiltr.com/ws') {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }
  
  async connect() {
    const token = await new AuthManager().getValidToken();
    
    this.ws = new WebSocket(`${this.url}?token=${token}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected');
      this.attemptReconnect();
    };
  }
  
  handleMessage(data) {
    switch (data.type) {
      case 'FILTER_UPDATE':
        this.handleFilterUpdate(data.payload);
        break;
      case 'JOB_ALERT':
        this.handleJobAlert(data.payload);
        break;
      case 'SYSTEM_MESSAGE':
        this.handleSystemMessage(data.payload);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }
  
  handleFilterUpdate(filters) {
    // Update local filters
    chrome.storage.local.set({ filters });
    
    // Notify content scripts
    chrome.tabs.query({ active: true }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'FILTER_UPDATE',
          filters
        });
      });
    });
  }
  
  handleJobAlert(job) {
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'New Job Match!',
      message: `${job.title} at ${job.company}`
    });
  }
  
  handleSystemMessage(message) {
    console.log('System message:', message);
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }
  
  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket not connected');
    }
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

#### Rate Limiting and Request Queue

```javascript
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
    this.queue = [];
  }
  
  async execute(fn) {
    // Clean old requests
    const now = Date.now();
    this.requests = this.requests.filter(time => 
      now - time < this.timeWindow
    );
    
    // Check if we can make request immediately
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return await fn();
    }
    
    // Queue the request
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    const now = Date.now();
    const oldestRequest = this.requests[0];
    const timeToWait = this.timeWindow - (now - oldestRequest);
    
    setTimeout(() => {
      const { fn, resolve, reject } = this.queue.shift();
      
      this.execute(fn)
        .then(resolve)
        .catch(reject);
        
    }, Math.max(0, timeToWait));
  }
}
```

#### Data Synchronization Engine

```javascript
class SyncEngine {
  constructor() {
    this.api = new APIClient();
    this.lastSync = null;
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.syncInProgress = false;
  }
  
  async startSync() {
    // Initial sync
    await this.performSync();
    
    // Set up periodic sync
    setInterval(() => {
      this.performSync();
    }, this.syncInterval);
    
    // Listen for changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && !this.syncInProgress) {
        this.handleLocalChange(changes);
      }
    });
  }
  
  async performSync() {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      // Get local data
      const localData = await chrome.storage.local.get(null);
      
      // Get server data
      const serverData = await this.api.request('/sync/pull', {
        method: 'POST',
        body: JSON.stringify({
          lastSync: this.lastSync,
          checksum: this.calculateChecksum(localData)
        })
      });
      
      // Merge data
      const merged = await this.mergeData(localData, serverData);
      
      // Update local storage
      await chrome.storage.local.set(merged);
      
      // Push changes to server
      await this.api.request('/sync/push', {
        method: 'POST',
        body: JSON.stringify(merged)
      });
      
      this.lastSync = Date.now();
      
    } catch (error) {
      console.error('Sync failed:', error);
      
    } finally {
      this.syncInProgress = false;
    }
  }
  
  async mergeData(local, server) {
    const merged = { ...local };
    
    // Server data takes precedence for certain fields
    const serverPriority = ['filters', 'preferences'];
    
    serverPriority.forEach(key => {
      if (server[key]) {
        merged[key] = server[key];
      }
    });
    
    // Merge arrays without duplicates
    if (local.blockedCompanies && server.blockedCompanies) {
      merged.blockedCompanies = [
        ...new Set([...local.blockedCompanies, ...server.blockedCompanies])
      ];
    }
    
    return merged;
  }
  
  calculateChecksum(data) {
    // Simple checksum for change detection
    return JSON.stringify(data).length;
  }
  
  async handleLocalChange(changes) {
    // Debounce rapid changes
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }
    
    this.changeTimeout = setTimeout(() => {
      this.pushChanges(changes);
    }, 1000);
  }
  
  async pushChanges(changes) {
    const updates = {};
    
    for (const [key, change] of Object.entries(changes)) {
      updates[key] = change.newValue;
    }
    
    try {
      await this.api.request('/sync/update', {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to push changes:', error);
    }
  }
}
```

#### Third-Party Service Integration

```javascript
class ThirdPartyIntegration {
  constructor() {
    this.services = {
      glassdoor: new GlassdoorAPI(),
      clearbit: new ClearbitAPI(),
      hunterIO: new HunterAPI()
    };
  }
  
  async enrichCompanyData(companyName) {
    const enriched = {
      name: companyName,
      glassdoor: null,
      clearbit: null,
      employees: null
    };
    
    // Parallel API calls with error handling
    const promises = [
      this.services.glassdoor.getCompanyRating(companyName)
        .catch(err => ({ error: err.message })),
      this.services.clearbit.getCompanyInfo(companyName)
        .catch(err => ({ error: err.message })),
      this.services.hunterIO.getEmployeeCount(companyName)
        .catch(err => ({ error: err.message }))
    ];
    
    const [glassdoor, clearbit, employees] = await Promise.all(promises);
    
    enriched.glassdoor = glassdoor;
    enriched.clearbit = clearbit;
    enriched.employees = employees;
    
    return enriched;
  }
}

class GlassdoorAPI {
  async getCompanyRating(company) {
    // Implementation for Glassdoor API
    const response = await fetch(`https://api.glassdoor.com/companies/${encodeURIComponent(company)}`);
    return response.json();
  }
}

class ClearbitAPI {
  async getCompanyInfo(company) {
    // Implementation for Clearbit API
    const response = await fetch(`https://company.clearbit.com/v2/companies/find?name=${encodeURIComponent(company)}`);
    return response.json();
  }
}

class HunterAPI {
  async getEmployeeCount(company) {
    // Implementation for Hunter.io API
    const response = await fetch(`https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company)}`);
    return response.json();
  }
}
```

---

## Supporting Scripts

### Test Extension Script (test_extension.js)

The skill includes a comprehensive testing script for validating extension functionality:

- Playwright-based end-to-end testing
- Manifest validation
- Performance metrics measurement
- Cross-browser compatibility checks
- DOM manipulation verification

### Boilerplate Generator (generate_boilerplate.js)

Automated project scaffolding tool that creates:

- Complete extension file structure
- Pre-configured manifest.json
- Base content scripts and service workers
- Popup interface templates
- Icon placeholders
- Build configuration

### Submission Verifier (verify_submission.py)

Python script for pre-submission validation:

- Checks manifest requirements
- Validates icon dimensions
- Verifies permission declarations
- Ensures CSP compliance
- Validates version numbering
- Checks for required files

---

## Usage in Claude Code

To use this skill in Claude Code via Cursor:

1. **Import the skill**: Save this markdown file in your project's `.cursorrules` or reference it in your Claude Code configuration.

2. **Activate for extension development**: When working on Chrome extensions, especially JobFiltr or similar job board filtering extensions, this skill will provide:
   - Contextual code suggestions
   - Best practices enforcement
   - Security recommendations
   - Performance optimizations
   - Publishing guidance

3. **Key Commands**: 
   - Generate boilerplate: Creates complete extension structure
   - Test extension: Runs comprehensive test suite
   - Verify submission: Pre-flight check for Chrome Web Store

4. **Integration Points**:
   - Connects with Context7 MCP for latest Chrome APIs
   - Uses Perplexity AI for current job board DOM structures
   - Implements shadcn/ui components for modern interfaces

This skill ensures your Chrome extension development follows 2025+ standards with security, performance, and user experience as top priorities.
