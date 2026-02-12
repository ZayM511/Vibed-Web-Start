# Logo Fixes Plan

## Issues to Fix

### Issue 1: Main Logo Too Large in Popup
**Current State:** The logo in the popup header uses a 28x28px container with `scale(1.42)` transform, making it appear 40px visually.

**Fix:** Reduce the scale from 1.42 to ~1.35 for a slightly smaller appearance.

**File:** `chrome-extension/styles/popup-v2.css`
- Line 450: Change `transform: translate(-50%, -50%) scale(1.42)` to `scale(1.35)`
- Update all keyframe animations that reference scale(1.42) to use scale(1.35)

---

### Issue 2: Logo Switches Back to Wrong State After Scan
**Current State:** After scanning:
1. Logo shows scanner state (purple with magnifying glass)
2. Scan completes, logo shows warning/caution state (gold)
3. Logo incorrectly switches back to default state (purple main logo)

**Root Cause:** The `LogoStateManager.currentState` is being tracked, but there may be a race condition or the CSS specificity is causing issues with opacity transitions.

**Possible causes to investigate:**
1. The 2-second `scannerRefreshInterval` calling `detectCurrentJob()` might interfere
2. CSS transition timing could cause visual glitches
3. The `currentState` check `if (this.currentState === state) return;` may prevent proper re-rendering

**Fix:**
1. Add CSS rules to explicitly hide default logos when in non-default states
2. Ensure the state persists and isn't being reset by interval callbacks
3. Add explicit `opacity: 0` rules for `.logo-default` when in warning/danger/verified states

**File:** `chrome-extension/styles/popup-v2.css`
- Add explicit hide rules for `.logo-default.logo-dark` and `.logo-default.logo-light` when `data-state` is NOT "default"

---

### Issue 3: Browser Toolbar Icon Not Circular
**Current State:** The `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` files have black corners (square images with circular content), causing a square appearance in Chrome's toolbar.

**Chrome's Requirements:**
- Icons should be PNG with transparent background
- Chrome displays icons at: 16x16, 32x32, 48x48, 128x128
- The visible content should be circular, with transparent corners

**Fix:**
1. Generate new icon files with transparent backgrounds
2. Ensure the circular logo fills the canvas appropriately with transparent corners
3. Use the same visual style as `logo-main-dark.png` but cropped to show just the circular part

**Files to modify:**
- `chrome-extension/icons/icon16.png`
- `chrome-extension/icons/icon32.png`
- `chrome-extension/icons/icon48.png`
- `chrome-extension/icons/icon128.png`

---

## Implementation Order

1. **Fix CSS logo scaling** (Issue 1) - Quick CSS change
2. **Fix CSS state specificity** (Issue 2) - Add explicit hide rules
3. **Generate circular toolbar icons** (Issue 3) - Create new PNG files with transparent backgrounds

---

## Detailed CSS Changes

### popup-v2.css Changes

```css
/* BEFORE - Line 450 */
transform: translate(-50%, -50%) scale(1.42);

/* AFTER */
transform: translate(-50%, -50%) scale(1.35);
```

Update all keyframe animations:
- verifiedGlow: scale(1.42) → scale(1.35), scale(1.44) → scale(1.37)
- warningPulse: scale(1.42) → scale(1.35), scale(1.45) → scale(1.37)
- dangerAlert: scale(1.42) → scale(1.35), scale(1.46) → scale(1.38)
- scannerPulse: scale(1.42) → scale(1.35), scale(1.47) → scale(1.38)
- verifiedGlowDark: scale(1.42) → scale(1.35), scale(1.44) → scale(1.37)
- warningPulseDark: scale(1.42) → scale(1.35), scale(1.45) → scale(1.37)
- dangerAlertDark: scale(1.42) → scale(1.35), scale(1.46) → scale(1.38)

**NEW CSS RULES to add for Issue 2:**

```css
/* Explicitly hide default logos when in non-default states */
.logo-icon[data-state="verified"] .logo-default,
.logo-icon[data-state="warning"] .logo-default,
.logo-icon[data-state="danger"] .logo-default,
.logo-icon[data-state="scanner"] .logo-default {
  opacity: 0 !important;
}
```

---

## Icon Generation Strategy

For the toolbar icons, we need to:
1. Take the existing circular logo design from `logo-main-dark.png`
2. Ensure the background is transparent (PNG alpha channel)
3. Crop/resize to exact dimensions with the circle filling the canvas
4. Export at 16x16, 32x32, 48x48, and 128x128

The icons should show the briefcase + funnel + checkmark design on a blue circular background, with transparent corners.
