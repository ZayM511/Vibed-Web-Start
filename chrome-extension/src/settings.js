// Settings page JavaScript
// Handles settings, founder greeting, and analytics dashboard

// Default Convex URL
const DEFAULT_CONVEX_URL = 'https://reminiscent-goldfish-690.convex.cloud';

// Founder emails that can see analytics dashboard
const FOUNDER_EMAILS = [
  'isaiah.e.malone@gmail.com',
  'support@jobfiltr.app',
  'hello@jobfiltr.app'
];

// Current user state
let currentUser = null;
let analyticsData = null;
let growthChart = null;
let detectionChart = null;
let mrrChart = null;

// DOM Elements
const convexUrlInput = document.getElementById('convexUrl');
const autoScanToggle = document.getElementById('autoScanToggle');
const notificationsToggle = document.getElementById('notificationsToggle');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');
const successMessage = document.getElementById('successMessage');
const themeToggle = document.getElementById('themeToggle');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

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

// Greeting Elements
const greetingMessage = document.getElementById('greetingMessage');
const greetingSubtext = document.getElementById('greetingSubtext');
const greetingIcon = document.getElementById('greetingIcon');

// Analytics Elements
const analyticsLoading = document.getElementById('analyticsLoading');
const analyticsContent = document.getElementById('analyticsContent');
const refreshAnalytics = document.getElementById('refreshAnalytics');
const lastUpdated = document.getElementById('lastUpdated');

// Initialize theme, auth, and load settings on page load
initTheme();
initAuth();
loadSettings();

// ===== PERSONALIZED GREETING SYSTEM =====
function generateFounderGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth();
  const day = now.getDate();
  const dayOfWeek = now.getDay();

  // Time-based greeting
  let timeGreeting = '';
  let icon = '👋';
  let subtext = 'Your dashboard is ready with live analytics.';

  // Late night (12am - 5am)
  if (hour >= 0 && hour < 5) {
    timeGreeting = 'Up Late Tonight, Founder!';
    icon = '🌙';
    subtext = 'Burning the midnight oil? Here\'s your data.';
  }
  // Early morning (5am - 8am)
  else if (hour >= 5 && hour < 8) {
    timeGreeting = 'Early Bird, Founder!';
    icon = '🌅';
    subtext = 'Starting the day strong with your analytics.';
  }
  // Morning (8am - 12pm)
  else if (hour >= 8 && hour < 12) {
    timeGreeting = 'Good Morning, Founder!';
    icon = '☀️';
    subtext = 'Fresh day, fresh data. Let\'s grow!';
  }
  // Afternoon (12pm - 5pm)
  else if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good Afternoon, Founder!';
    icon = '🚀';
    subtext = 'Midday check-in on your metrics.';
  }
  // Evening (5pm - 9pm)
  else if (hour >= 17 && hour < 21) {
    timeGreeting = 'Good Evening, Founder!';
    icon = '🌆';
    subtext = 'Wrapping up? Here\'s today\'s progress.';
  }
  // Night (9pm - 12am)
  else {
    timeGreeting = 'Evening, Founder!';
    icon = '🌃';
    subtext = 'Night owl mode activated. Your stats await.';
  }

  // Day of week special messages
  if (dayOfWeek === 1) { // Monday
    timeGreeting = 'Happy Monday, Founder!';
    icon = '💪';
    subtext = 'New week, new opportunities. Let\'s crush it!';
  } else if (dayOfWeek === 5) { // Friday
    timeGreeting = 'Happy Friday, Founder!';
    icon = '🎉';
    subtext = 'End of week stats looking good?';
  } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    timeGreeting = 'Weekend Mode, Founder!';
    icon = '☕';
    subtext = 'Building on the weekend? That\'s dedication.';
  }

  // Holiday overrides
  const holidays = getHolidayGreeting(month, day);
  if (holidays) {
    timeGreeting = holidays.greeting;
    icon = holidays.icon;
    subtext = holidays.subtext;
  }

  return { greeting: timeGreeting, icon, subtext };
}

function getHolidayGreeting(month, day) {
  // Major US holidays and special days
  const holidays = {
    // January
    '0-1': { greeting: 'Happy New Year, Founder!', icon: '🎊', subtext: 'New year, new metrics, new growth!' },
    '0-15': { greeting: 'Happy MLK Day, Founder!', icon: '✊', subtext: 'Dream big, build bigger.' },
    // February
    '1-14': { greeting: 'Happy Valentine\'s Day, Founder!', icon: '❤️', subtext: 'Love your product, love your users.' },
    '1-17': { greeting: 'Happy Presidents\' Day, Founder!', icon: '🇺🇸', subtext: 'Leading your product to greatness.' },
    // March
    '2-17': { greeting: 'Happy St. Patrick\'s Day, Founder!', icon: '🍀', subtext: 'Feeling lucky with these metrics?' },
    // April
    '3-1': { greeting: 'Happy April Fools\', Founder!', icon: '🃏', subtext: 'These numbers are no joke!' },
    // May
    '4-5': { greeting: 'Happy Cinco de Mayo, Founder!', icon: '🎊', subtext: 'Celebrating growth and tacos!' },
    '4-12': { greeting: 'Happy Mother\'s Day, Founder!', icon: '💐', subtext: 'Nurturing your product like family.' },
    '4-27': { greeting: 'Happy Memorial Day, Founder!', icon: '🇺🇸', subtext: 'Honoring those who served.' },
    // June
    '5-16': { greeting: 'Happy Father\'s Day, Founder!', icon: '👔', subtext: 'Building a legacy, one feature at a time.' },
    '5-19': { greeting: 'Happy Juneteenth, Founder!', icon: '✊', subtext: 'Celebrating freedom and progress.' },
    // July
    '6-4': { greeting: 'Happy Independence Day, Founder!', icon: '🎆', subtext: 'Freedom to build, freedom to grow!' },
    // September
    '8-2': { greeting: 'Happy Labor Day, Founder!', icon: '⚒️', subtext: 'Your hard work is paying off!' },
    // October
    '9-31': { greeting: 'Happy Halloween, Founder!', icon: '🎃', subtext: 'No scary surprises in your data!' },
    // November
    '10-11': { greeting: 'Happy Veterans Day, Founder!', icon: '🎖️', subtext: 'Honoring our heroes.' },
    '10-28': { greeting: 'Happy Thanksgiving, Founder!', icon: '🦃', subtext: 'Grateful for your users and growth!' },
    // December
    '11-24': { greeting: 'Merry Christmas Eve, Founder!', icon: '🎄', subtext: 'The gift of good metrics!' },
    '11-25': { greeting: 'Merry Christmas, Founder!', icon: '🎁', subtext: 'Unwrapping your year-end stats!' },
    '11-31': { greeting: 'Happy New Year\'s Eve, Founder!', icon: '🥂', subtext: 'Cheers to another year of growth!' },
  };

  const key = `${month}-${day}`;
  return holidays[key] || null;
}

function updateGreeting() {
  const { greeting, icon, subtext } = generateFounderGreeting();

  if (greetingMessage) greetingMessage.textContent = greeting;
  if (greetingIcon) greetingIcon.textContent = icon;
  if (greetingSubtext) greetingSubtext.textContent = subtext;
}

// ===== ANALYTICS DASHBOARD =====
async function loadAnalytics() {
  if (!currentUser || !isFounder(currentUser.email)) return;

  try {
    // Show loading state
    if (analyticsLoading) analyticsLoading.classList.remove('hidden');
    if (analyticsContent) analyticsContent.classList.add('hidden');
    if (refreshAnalytics) refreshAnalytics.classList.add('loading');

    // Fetch analytics from Convex
    const convexUrl = await getConvexUrl();
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: 'analytics:getFounderDashboard',
        args: { userEmail: currentUser.email }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }

    const result = await response.json();
    analyticsData = result.value;

    if (analyticsData) {
      updateAnalyticsDashboard(analyticsData);
    }

  } catch (error) {
    console.error('Error loading analytics:', error);
    // Show placeholder data for demo
    showDemoAnalytics();
  } finally {
    if (analyticsLoading) analyticsLoading.classList.add('hidden');
    if (analyticsContent) analyticsContent.classList.remove('hidden');
    if (refreshAnalytics) refreshAnalytics.classList.remove('loading');
    updateLastUpdated();
  }
}

async function getConvexUrl() {
  const settings = await chrome.storage.sync.get({ convexUrl: DEFAULT_CONVEX_URL });
  return settings.convexUrl || DEFAULT_CONVEX_URL;
}

function showDemoAnalytics() {
  // Demo data for when API is unavailable
  const demoData = {
    totalUsers: 0,
    newUsers24h: 0,
    newUsers7d: 0,
    activeUsers24h: 0,
    activeUsers7d: 0,
    totalScans: 0,
    scans24h: 0,
    avgScansPerUser: 0,
    legitimateJobs: 0,
    scamDetected: 0,
    ghostDetected: 0,
    spamDetected: 0,
    totalDocuments: 0,
    totalFeedback: 0,
    totalReviews: 0,
    proUsers: 0,
    chromeExtScans: 0,
    growthData: [],
    detectionBreakdown: []
  };
  updateAnalyticsDashboard(demoData);
}

function updateAnalyticsDashboard(data) {
  // Update user tracking cards at top
  animateNumber('metricFreeUsers', data.freeUsers || 0);
  animateNumber('metricProSubs', data.proUsers || 0);

  // Update metric cards with animation
  animateNumber('metricTotalUsers', data.totalUsers);
  animateNumber('metricActiveUsers', data.activeUsers24h);
  animateNumber('metricTotalScans', data.totalScans);

  // Update MRR with currency animation
  animateCurrency('metricMRR', data.monthlyMRR || 0);
  animateCurrency('metricARR', data.projectedARR || 0);

  // Update Pro subscriber count
  const metricProCount = document.getElementById('metricProCount');
  if (metricProCount) metricProCount.textContent = data.proUsers || 0;

  // Update sub-values
  const newUsers24h = document.getElementById('metricNewUsers24h');
  const activeUsers7d = document.getElementById('metricActiveUsers7d');
  const scans24h = document.getElementById('metricScans24h');
  const avgScans = document.getElementById('metricAvgScans');

  if (newUsers24h) newUsers24h.textContent = data.newUsers24h;
  if (activeUsers7d) activeUsers7d.textContent = data.activeUsers7d;
  if (scans24h) scans24h.textContent = data.scans24h;
  if (avgScans) avgScans.textContent = data.avgScansPerUser;

  // Update detection breakdown
  const detLegitimate = document.getElementById('detLegitimate');
  const detScam = document.getElementById('detScam');
  const detGhost = document.getElementById('detGhost');
  const detSpam = document.getElementById('detSpam');

  if (detLegitimate) detLegitimate.textContent = data.legitimateJobs;
  if (detScam) detScam.textContent = data.scamDetected;
  if (detGhost) detGhost.textContent = data.ghostDetected;
  if (detSpam) detSpam.textContent = data.spamDetected;

  // Update platform stats
  const statDocuments = document.getElementById('statDocuments');
  const statAvgTemplates = document.getElementById('statAvgTemplates');
  const statFeedback = document.getElementById('statFeedback');
  const statReviews = document.getElementById('statReviews');
  const statProUsers = document.getElementById('statProUsers');
  const statChromeDownloadsTotal = document.getElementById('statChromeDownloadsTotal');
  const statChromeDownloadsToday = document.getElementById('statChromeDownloadsToday');

  if (statDocuments) statDocuments.textContent = data.totalDocuments;
  if (statAvgTemplates) statAvgTemplates.textContent = data.avgTemplatesPerUser || 0;
  if (statFeedback) statFeedback.textContent = data.totalFeedback;
  if (statReviews) statReviews.textContent = data.totalReviews;
  if (statProUsers) statProUsers.textContent = data.proUsers;
  if (statChromeDownloadsTotal) statChromeDownloadsTotal.textContent = data.chromeExtDownloadsTotal || 0;
  if (statChromeDownloadsToday) statChromeDownloadsToday.textContent = data.chromeExtDownloadsToday || 0;

  // Update charts
  updateGrowthChart(data.growthData || []);
  updateDetectionChart(data.detectionBreakdown || []);

  // Update MRR chart and projections
  if (data.mrrProjection) {
    updateMRRChart(data.mrrProjection);
    updateMRRProjection(data.mrrProjection);
  }
}

function animateNumber(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const startValue = parseInt(element.textContent) || 0;
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut);
    element.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function animateCurrency(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Parse current value (remove $ and parse as float)
  const currentText = element.textContent.replace(/[$,]/g, '');
  const startValue = parseFloat(currentText) || 0;
  const duration = 1200;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * easeOut;
    element.textContent = '$' + currentValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function updateGrowthChart(data) {
  const ctx = document.getElementById('growthChart');
  if (!ctx) return;

  const labels = data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const users = data.map(d => d.users);
  const scans = data.map(d => d.scans);

  // Destroy existing chart if it exists
  if (growthChart) {
    growthChart.destroy();
  }

  // Get computed styles for theming
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';

  growthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Active Users',
          data: users,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Scans',
          data: scans,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 15,
            color: textColor,
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#000000',
          bodyColor: isDark ? '#d1d5db' : '#6b7280',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            maxRotation: 0,
            maxTicksLimit: 7
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 }
          },
          beginAtZero: true
        }
      }
    }
  });
}

function updateDetectionChart(data) {
  const ctx = document.getElementById('detectionChart');
  if (!ctx) return;

  // Destroy existing chart if it exists
  if (detectionChart) {
    detectionChart.destroy();
  }

  const labels = data.map(d => d.type);
  const values = data.map(d => d.count);
  const colors = data.map(d => d.color);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  detectionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#000000',
          bodyColor: isDark ? '#d1d5db' : '#6b7280',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderWidth: 1,
          padding: 12,
        }
      }
    }
  });
}

function updateMRRChart(projection) {
  const ctx = document.getElementById('mrrChart');
  if (!ctx) return;

  // Destroy existing chart if it exists
  if (mrrChart) {
    mrrChart.destroy();
  }

  const data = projection.monthlyData || [];
  const labels = data.map(d => d.month);
  const actualData = data.map(d => d.isProjected ? null : d.mrr);
  const projectedData = data.map(d => d.isProjected ? d.mrr : null);
  // For continuity, include last actual point in projected line
  const lastActualIndex = data.findIndex(d => d.isProjected) - 1;
  if (lastActualIndex >= 0 && lastActualIndex < data.length - 1) {
    projectedData[lastActualIndex] = data[lastActualIndex].mrr;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';

  // Update year display
  const yearEl = document.getElementById('mrrChartYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  mrrChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual MRR',
          data: actualData,
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.7,
        },
        {
          label: 'Projected MRR',
          data: projectedData,
          backgroundColor: 'rgba(16, 185, 129, 0.3)',
          borderColor: 'rgba(16, 185, 129, 0.5)',
          borderWidth: 1,
          borderRadius: 6,
          borderDash: [5, 5],
          barPercentage: 0.7,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 15,
            color: textColor,
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#000000',
          bodyColor: isDark ? '#d1d5db' : '#6b7280',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              const value = context.raw;
              if (value === null) return null;
              return context.dataset.label + ': $' + value.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { size: 10 }
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: function(value) {
              return '$' + value;
            }
          },
          beginAtZero: true
        }
      }
    }
  });
}

function updateMRRProjection(projection) {
  // Update MRR stats
  const totalRevenue = document.getElementById('mrrTotalRevenue');
  const avgMonthly = document.getElementById('mrrAvgMonthly');
  const peak = document.getElementById('mrrPeak');
  const growthRate = document.getElementById('mrrGrowthRate');

  if (totalRevenue) totalRevenue.textContent = '$' + (projection.totalYearRevenue || 0).toFixed(2);
  if (avgMonthly) avgMonthly.textContent = '$' + (projection.avgMRR || 0).toFixed(2);
  if (peak) peak.textContent = '$' + (projection.peakMRR || 0).toFixed(2);
  if (growthRate) {
    const rate = projection.avgMonthlyGrowthRate || 0;
    growthRate.textContent = (rate >= 0 ? '+' : '') + rate.toFixed(1) + '%';
    growthRate.style.color = rate >= 0 ? '#10B981' : '#EF4444';
  }

  // Update projection summary
  const summary = document.getElementById('projectionSummary');
  if (summary) {
    const yearEndMRR = projection.yearEndProjectedMRR || 0;
    const currentMRR = projection.currentMRR || 0;
    const growthPercent = currentMRR > 0 ? Math.round((yearEndMRR - currentMRR) / currentMRR * 100) : 0;

    if (yearEndMRR > 0) {
      summary.textContent = `Based on current growth trends, you're projected to reach $${yearEndMRR.toFixed(2)} MRR by December${growthPercent > 0 ? ` (+${growthPercent}% growth)` : ''}.`;
    } else {
      summary.textContent = 'Start acquiring Pro subscribers to see MRR projections.';
    }
  }

  // Update detailed projection
  const yearEndMRR = document.getElementById('projYearEndMRR');
  const yearEndARR = document.getElementById('projYearEndARR');
  const peakMonth = document.getElementById('projPeakMonth');
  const monthsTracked = document.getElementById('projMonthsTracked');

  if (yearEndMRR) yearEndMRR.textContent = '$' + (projection.yearEndProjectedMRR || 0).toFixed(2);
  if (yearEndARR) yearEndARR.textContent = '$' + (projection.yearEndProjectedARR || 0).toFixed(2);
  if (peakMonth) peakMonth.textContent = projection.peakMonth || '--';
  if (monthsTracked) monthsTracked.textContent = projection.monthsWithData || 0;

  // Update insight text
  const insightText = document.getElementById('projectionInsightText');
  if (insightText) {
    const rate = projection.avgMonthlyGrowthRate || 0;
    const months = projection.monthsWithData || 0;

    if (months < 2) {
      insightText.textContent = 'Need at least 2 months of data to calculate growth trends. Keep tracking!';
    } else if (rate > 20) {
      insightText.textContent = `Excellent growth! You're averaging ${rate.toFixed(1)}% monthly growth. At this pace, you'll see significant revenue expansion.`;
    } else if (rate > 5) {
      insightText.textContent = `Healthy growth of ${rate.toFixed(1)}% per month. Focus on reducing churn to accelerate your MRR.`;
    } else if (rate > 0) {
      insightText.textContent = `Modest growth of ${rate.toFixed(1)}% per month. Consider optimizing your conversion funnel.`;
    } else if (rate === 0) {
      insightText.textContent = 'MRR is stable. Focus on acquisition strategies to drive growth.';
    } else {
      insightText.textContent = `MRR is declining ${Math.abs(rate).toFixed(1)}% monthly. Prioritize retention and churn reduction.`;
    }
  }

  // Update last updated
  const lastUpdatedEl = document.getElementById('mrrLastUpdated');
  if (lastUpdatedEl && projection.lastUpdated) {
    const date = new Date(projection.lastUpdated);
    lastUpdatedEl.textContent = 'Last updated: ' + date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Setup projection details toggle
function setupProjectionToggle() {
  const expandBtn = document.getElementById('projectionExpandBtn');
  const details = document.getElementById('projectionDetails');
  const header = document.querySelector('.projection-header');

  if (expandBtn && details && header) {
    const toggleDetails = () => {
      const isHidden = details.classList.contains('hidden');
      if (isHidden) {
        details.classList.remove('hidden');
        expandBtn.classList.add('expanded');
      } else {
        details.classList.add('hidden');
        expandBtn.classList.remove('expanded');
      }
    };

    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDetails();
    });

    header.addEventListener('click', toggleDetails);
  }
}

// Initialize projection toggle when DOM is ready
document.addEventListener('DOMContentLoaded', setupProjectionToggle);
// Also try immediately in case DOM is already loaded
if (document.readyState !== 'loading') {
  setupProjectionToggle();
}

function updateLastUpdated() {
  if (lastUpdated) {
    lastUpdated.textContent = 'Updated just now';

    // Update the "ago" time every minute
    let minutes = 0;
    const interval = setInterval(() => {
      minutes++;
      if (minutes === 1) {
        lastUpdated.textContent = '1 minute ago';
      } else if (minutes < 60) {
        lastUpdated.textContent = `${minutes} minutes ago`;
      } else {
        clearInterval(interval);
      }
    }, 60000);
  }
}

// ===== FOUNDER MODE =====
function isFounder(email) {
  return email && FOUNDER_EMAILS.includes(email.toLowerCase());
}

function enableFounderMode() {
  document.body.classList.add('founder-mode');
  updateGreeting();
  loadAnalytics();
}

function disableFounderMode() {
  document.body.classList.remove('founder-mode');
}

// ===== THEME MANAGEMENT =====
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

  // Update charts if they exist
  if (analyticsData) {
    updateGrowthChart(analyticsData.growthData || []);
    updateDetectionChart(analyticsData.detectionBreakdown || []);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// ===== AUTH MANAGEMENT =====
async function initAuth() {
  try {
    const result = await chrome.storage.local.get(['authToken', 'userEmail', 'userName', 'authExpiry']);

    if (result.authToken && result.userEmail) {
      const now = Date.now();
      if (result.authExpiry && now < result.authExpiry) {
        currentUser = {
          email: result.userEmail,
          name: result.userName || ''
        };
        showAuthenticatedProfile();

        // Check if founder
        if (isFounder(currentUser.email)) {
          enableFounderMode();
        }
        return;
      }
    }

    showNotSignedIn();
  } catch (error) {
    console.error('Error checking auth state:', error);
    showNotSignedIn();
  }
}

function showAuthenticatedProfile() {
  if (!currentUser) return;

  profileCard.classList.remove('hidden');
  notSignedInMessage.classList.add('hidden');

  const initial = currentUser.name
    ? currentUser.name.charAt(0).toUpperCase()
    : currentUser.email.charAt(0).toUpperCase();
  profileAvatar.textContent = initial;

  profileName.textContent = currentUser.name || 'No display name set';
  profileEmail.textContent = currentUser.email;

  // Check if founder - show backend section and crown
  const founderCrown = document.getElementById('founderCrown');
  if (isFounder(currentUser.email)) {
    backendSection.classList.remove('hidden');
    if (founderCrown) founderCrown.classList.remove('hidden');
  } else {
    backendSection.classList.add('hidden');
    if (founderCrown) founderCrown.classList.add('hidden');
  }
}

function showNotSignedIn() {
  profileCard.classList.add('hidden');
  notSignedInMessage.classList.remove('hidden');
  backendSection.classList.add('hidden');
  // Hide founder crown when not signed in
  const founderCrown = document.getElementById('founderCrown');
  if (founderCrown) founderCrown.classList.add('hidden');
  disableFounderMode();
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
    await chrome.storage.local.set({ userName: newName });

    if (currentUser) {
      currentUser.name = newName;
    }

    profileName.textContent = newName || 'No display name set';
    const initial = newName
      ? newName.charAt(0).toUpperCase()
      : currentUser.email.charAt(0).toUpperCase();
    profileAvatar.textContent = initial;

    cancelEditName();
    showSuccessMessage();
  } catch (error) {
    console.error('Error saving display name:', error);
    alert('Failed to save display name. Please try again.');
  }
}

// ===== CLOSE SETTINGS =====
function closeSettingsPage() {
  chrome.tabs.getCurrent((tab) => {
    if (tab && tab.id) {
      chrome.tabs.remove(tab.id);
    } else {
      window.close();
    }
  });
}

// ===== EVENT LISTENERS =====
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
  alert('Click the JobFiltr icon in your browser toolbar to sign in.');
});

// Analytics refresh listener
if (refreshAnalytics) {
  refreshAnalytics.addEventListener('click', loadAnalytics);
}

// ===== SETTINGS FUNCTIONS =====
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      convexUrl: DEFAULT_CONVEX_URL,
      autoScan: false,
      notifications: true
    });

    convexUrlInput.value = settings.convexUrl || DEFAULT_CONVEX_URL;

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

async function saveSettings() {
  try {
    const settings = {
      convexUrl: convexUrlInput.value.trim() || DEFAULT_CONVEX_URL,
      autoScan: autoScanToggle.classList.contains('active'),
      notifications: notificationsToggle.classList.contains('active')
    };

    if (!isValidUrl(settings.convexUrl)) {
      alert('Please enter a valid Convex URL (e.g., https://your-deployment.convex.cloud)');
      convexUrlInput.focus();
      return;
    }

    await chrome.storage.sync.set(settings);
    showSuccessMessage();
    console.log('Settings saved:', settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Failed to save settings. Please try again.');
  }
}

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
    window.location.reload();
  } catch (error) {
    console.error('Error resetting settings:', error);
    alert('Failed to reset settings. Please try again.');
  }
}

function toggleAutoScan() {
  autoScanToggle.classList.toggle('active');
}

function toggleNotifications() {
  notificationsToggle.classList.toggle('active');
}

function showSuccessMessage() {
  successMessage.classList.add('show');
  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 3000);
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }

  if (e.key === 'Escape') {
    closeSettingsPage();
  }
});
