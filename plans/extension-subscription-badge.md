# Extension Subscription Badge Implementation Plan

## Overview
Add a subscription tier badge to the Chrome extension popup that shows whether the user has a Free or Pro account, with an upgrade option for Free users.

## Design Requirements
- **Free Badge**: Green color, displays "Free Plan"
- **Pro Badge**: Gold color, displays "Pro Member"
- **Upgrade Button**: Visible only for Free users, navigates to dashboard subscription section

## Location
The badge will be placed in the **user dropdown menu** (visible when user clicks their account icon), positioned between the user info and the Sign Out button.

---

## Implementation Steps

### 1. HTML Changes (`popup-v2.html`)
Add subscription badge container in the user dropdown (after line 109, inside `#userDropdown`):

```html
<div class="subscription-badge-container" id="subscriptionBadgeContainer">
  <div class="subscription-badge free" id="subscriptionBadge">
    <svg class="badge-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
    </svg>
    <span id="subscriptionText">Free Plan</span>
  </div>
  <button class="upgrade-btn" id="upgradeBtn">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Upgrade to Pro
  </button>
</div>
```

### 2. CSS Changes (`styles/popup-v2.css`)
Add styles for the subscription badge:

```css
/* Subscription Badge Container */
.subscription-badge-container {
  padding: 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Subscription Badge */
.subscription-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

/* Free Plan - Green */
.subscription-badge.free {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15));
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* Pro Plan - Gold */
.subscription-badge.pro {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15));
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.subscription-badge .badge-icon {
  width: 14px;
  height: 14px;
}

/* Upgrade Button */
.upgrade-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;
}

.upgrade-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

/* Hide upgrade button for Pro users */
.subscription-badge-container.pro .upgrade-btn {
  display: none;
}
```

### 3. JavaScript Changes (`src/popup-v2.js`)

#### 3a. Add function to fetch subscription status
```javascript
async function fetchSubscriptionStatus() {
  try {
    const convexUrl = 'https://reminiscent-goldfish-690.convex.cloud';
    const { authToken } = await chrome.storage.local.get(['authToken']);

    if (!authToken) return null;

    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'subscriptions:getSubscriptionStatus',
        args: {}
      })
    });

    if (!response.ok) return null;
    const result = await response.json();
    return result.value;
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return null;
  }
}
```

#### 3b. Add function to update subscription badge UI
```javascript
function updateSubscriptionBadge(subscriptionStatus) {
  const container = document.getElementById('subscriptionBadgeContainer');
  const badge = document.getElementById('subscriptionBadge');
  const badgeText = document.getElementById('subscriptionText');
  const upgradeBtn = document.getElementById('upgradeBtn');

  if (!container || !badge || !badgeText) return;

  const isPro = subscriptionStatus?.plan === 'pro' && subscriptionStatus?.isActive;

  if (isPro) {
    badge.classList.remove('free');
    badge.classList.add('pro');
    badgeText.textContent = 'Pro Member';
    container.classList.add('pro');
  } else {
    badge.classList.remove('pro');
    badge.classList.add('free');
    badgeText.textContent = 'Free Plan';
    container.classList.remove('pro');
  }
}
```

#### 3c. Call on authentication
In `showAuthenticatedUI()`, after setting user info:
```javascript
// Fetch and display subscription status
const subscriptionStatus = await fetchSubscriptionStatus();
updateSubscriptionBadge(subscriptionStatus);
```

#### 3d. Add upgrade button click handler
```javascript
document.getElementById('upgradeBtn')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://jobfiltr.com/dashboard#subscription' });
  // Close dropdown
  document.getElementById('userDropdown')?.classList.add('hidden');
});
```

---

## Verification Checklist
- [ ] Badge shows "Free Plan" with green color for free users
- [ ] Badge shows "Pro Member" with gold color for pro users
- [ ] Upgrade button visible only for free users
- [ ] Clicking upgrade navigates to dashboard subscription section
- [ ] Badge updates correctly after subscription changes
- [ ] Works in both light and dark themes

---

## Files to Modify
1. `chrome-extension/popup-v2.html` - Add HTML structure
2. `chrome-extension/styles/popup-v2.css` - Add styling
3. `chrome-extension/src/popup-v2.js` - Add JavaScript logic
