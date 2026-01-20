# Comprehensive App Fix Plan

## Executive Summary
After thorough analysis using parallel agents, linting, and code review, the following critical issues have been identified in the application.

---

## CRITICAL ISSUES (Must Fix - App Breaking)

### 1. React Hooks Rule Violation
**Severity: CRITICAL**
**Files Affected:**
- `app/(protected)/extension-errors/page.tsx:43-45`
- `components/admin/ExtensionErrorsTab.tsx:62-64`

**Problem:**
```typescript
// WRONG - Conditional hook call violates React Rules of Hooks
const selectedErrorData = selectedError
  ? useQuery(api.extensionErrors.getError, { id: selectedError })
  : null;
```

**Solution:**
Use Convex's `"skip"` argument instead:
```typescript
// CORRECT - Always call hook, conditionally skip
const selectedErrorData = useQuery(
  api.extensionErrors.getError,
  selectedError ? { id: selectedError } : "skip"
);
```

### 2. Missing Route Protection (Security Vulnerability)
**Severity: HIGH**
**File:** `middleware.ts:3`

**Problem:**
Only `/server` and `/dashboard` are protected. Missing:
- `/admin` (admin dashboard - critical!)
- `/billing` (payment info)
- `/scan` and `/scanner` (authenticated features)

**Solution:**
Add all protected routes to the matcher.

---

## MEDIUM ISSUES (Should Fix)

### 3. Environment Configuration Issues
**Severity: MEDIUM**
**File:** `.env.local`

**Problems:**
- `STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE` (placeholder value)
- Supabase configuration empty

### 4. Unused Imports/Variables (Lint Errors)
**Severity: LOW**
**Multiple Files:**

| File | Issues |
|------|--------|
| `app/(protected)/extension-errors/page.tsx` | Unused: Filter, User, ChevronDown, ChevronRight, expanded, setExpanded |
| `components/admin/ExtensionErrorsTab.tsx` | Unused: Activity |
| `components/dashboard/DocumentManagement.tsx` | Unused: isDeleting |
| `components/error-notifications.tsx` | Unused: AlertCircle, newErrorsCount |

### 5. Type Safety Issues
**Severity: MEDIUM**
**File:** `convex/stripe.ts`

Using `as any` type casts for function references:
- Line 39: `"subscriptions:getUserSubscription" as any`
- Line 105: `"subscriptions:getUserSubscription" as any`

---

## Implementation Order

1. **Fix React Hooks violations** (Critical - will break app)
2. **Fix middleware route protection** (Security)
3. **Fix lint errors** (Code quality)
4. **Fix type safety issues** (Code quality)
5. **Update environment variables** (Configuration)
6. **Create tests** (TDD verification)

---

## Test Plan (TDD)

### Unit Tests
1. Test extension errors page renders without crashing
2. Test ExtensionErrorsTab component renders
3. Test conditional query with skip argument works
4. Test protected routes are properly guarded

### Integration Tests
1. Test authentication flow with Clerk
2. Test Convex queries and mutations
3. Test document management operations

---

## Files to Modify

1. `app/(protected)/extension-errors/page.tsx` - Fix hooks + lint
2. `components/admin/ExtensionErrorsTab.tsx` - Fix hooks + lint
3. `middleware.ts` - Add protected routes
4. `components/dashboard/DocumentManagement.tsx` - Fix lint
5. `components/error-notifications.tsx` - Fix lint
6. `convex/stripe.ts` - Fix type safety (optional)

