# Stripe Payment Integration Plan

## Overview
Implement Stripe payment integration for JobFiltr with a clear subscription model: web app requires paid subscription, Chrome extension offers a 7-day free trial with payment method required.

## Subscription Model

### Web App (`/filtr` page)
- **Access Level**: Paid subscription required
- **Free Tier**: No free scans available
- **Restrictions**: Scan button disabled/locked until subscription active
- **Messaging**: Clear paywall UI explaining subscription required

### Chrome Extension
- **Free Trial**: 7-day trial period
- **Trial Requirements**:
  1. User must create account (Clerk authentication)
  2. Must add valid payment method (Stripe)
  3. Automatically converts to paid subscription after 7 days
- **Access**: Full scan functionality during trial
- **Trial Tracking**: Monitor trial start date, days remaining, conversion status

## Stripe Integration Architecture

### 1. Products & Pricing

#### Subscription Tiers (Recommended)
```
- **Starter Plan** ($9.99/month)
  - Unlimited web scans
  - Chrome extension access
  - Basic AI analysis
  - Community reviews access

- **Pro Plan** ($19.99/month)
  - Everything in Starter
  - Priority scanning
  - Advanced AI insights
  - Export scan reports
  - Email alerts for scams

- **Enterprise Plan** ($49.99/month)
  - Everything in Pro
  - API access
  - Bulk scanning
  - White-label options
  - Dedicated support
```

### 2. Stripe Setup Required

#### Stripe Dashboard Configuration
1. Create Stripe account (or use existing)
2. Set up products and pricing plans
3. Configure webhooks endpoint: `https://yourdomain.com/api/webhooks/stripe`
4. Get API keys:
   - Publishable key (client-side)
   - Secret key (server-side)
   - Webhook signing secret

#### Required Webhook Events
```typescript
- checkout.session.completed    // New subscription created
- customer.subscription.created // Subscription activated
- customer.subscription.updated // Plan changed
- customer.subscription.deleted // Subscription cancelled
- invoice.paid                  // Payment successful
- invoice.payment_failed        // Payment failed
- customer.updated             // Customer info changed
```

### 3. Database Schema (Convex)

#### New Tables

**subscriptions**
```typescript
{
  _id: Id<"subscriptions">
  userId: string                    // Clerk user ID
  stripeCustomerId: string         // Stripe customer ID
  stripeSubscriptionId: string     // Stripe subscription ID
  stripePriceId: string            // Current price ID
  plan: "starter" | "pro" | "enterprise"
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete"
  trialStart: number | null        // Timestamp
  trialEnd: number | null          // Timestamp
  currentPeriodStart: number       // Timestamp
  currentPeriodEnd: number         // Timestamp
  cancelAtPeriodEnd: boolean
  createdAt: number
  updatedAt: number
}
```

**payments**
```typescript
{
  _id: Id<"payments">
  userId: string
  stripePaymentIntentId: string
  stripeInvoiceId: string | null
  amount: number                   // In cents
  currency: string                 // "usd"
  status: "succeeded" | "failed" | "pending"
  description: string
  createdAt: number
}
```

**paymentMethods**
```typescript
{
  _id: Id<"paymentMethods">
  userId: string
  stripePaymentMethodId: string
  type: "card"                     // Future: "bank_account", etc.
  last4: string
  brand: string                    // "visa", "mastercard", etc.
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
  createdAt: number
}
```

#### Schema Indexes
```typescript
subscriptions:
  - by_user_id (userId)
  - by_stripe_customer_id (stripeCustomerId)
  - by_stripe_subscription_id (stripeSubscriptionId)
  - by_status (status)

payments:
  - by_user_id (userId)
  - by_stripe_payment_intent_id (stripePaymentIntentId)

paymentMethods:
  - by_user_id (userId)
  - by_stripe_payment_method_id (stripePaymentMethodId)
```

### 4. API Routes (Next.js)

#### `/api/stripe/create-checkout-session` (POST)
```typescript
// Create Stripe Checkout session for new subscription
Input: { priceId: string, userId: string, mode: "subscription" | "payment" }
Output: { sessionId: string, url: string }
Purpose: Initialize Stripe Checkout for subscription signup
```

#### `/api/stripe/create-portal-session` (POST)
```typescript
// Create Stripe Customer Portal session
Input: { customerId: string, returnUrl: string }
Output: { url: string }
Purpose: Allow users to manage subscription, payment methods, invoices
```

#### `/api/stripe/webhooks` (POST)
```typescript
// Handle Stripe webhook events
Input: Stripe event payload
Output: { received: true }
Purpose: Process subscription changes, payment events
Security: Verify webhook signature
```

#### `/api/subscription/status` (GET)
```typescript
// Get current user subscription status
Output: {
  isActive: boolean,
  plan: string | null,
  trialDaysRemaining: number | null,
  currentPeriodEnd: number | null
}
```

### 5. Convex Functions

#### Queries

**`getSubscriptionStatus`**
```typescript
// Check if user has active subscription or valid trial
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const subscription = await getActiveSubscription(ctx, user.id);

    return {
      isActive: subscription?.status === "active" || subscription?.status === "trialing",
      plan: subscription?.plan ?? null,
      trialDaysRemaining: calculateTrialDaysRemaining(subscription),
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      status: subscription?.status ?? "none"
    };
  }
});
```

**`getPaymentMethods`**
```typescript
// Get user's saved payment methods
export const getPaymentMethods = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_user_id", q => q.eq("userId", user.id))
      .collect();
  }
});
```

**`getPaymentHistory`**
```typescript
// Get user's payment history
export const getPaymentHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const limit = args.limit ?? 10;

    return await ctx.db
      .query("payments")
      .withIndex("by_user_id", q => q.eq("userId", user.id))
      .order("desc")
      .take(limit);
  }
});
```

#### Mutations

**`createOrUpdateSubscription`**
```typescript
// Create or update subscription from Stripe webhook
export const createOrUpdateSubscription = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    status: v.string(),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", q =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now()
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        ...args,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  }
});
```

**`recordPayment`**
```typescript
// Record successful payment
export const recordPayment = mutation({
  args: {
    userId: v.string(),
    stripePaymentIntentId: v.string(),
    stripeInvoiceId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    description: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      ...args,
      createdAt: Date.now()
    });
  }
});
```

**`cancelSubscription`**
```typescript
// Cancel subscription at period end
export const cancelSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const subscription = await getActiveSubscription(ctx, user.id);

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Call Stripe API to cancel subscription
    // Update local record
    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: true,
      updatedAt: Date.now()
    });
  }
});
```

### 6. Frontend Components

#### `/app/pricing/page.tsx`
- Display subscription tiers with features
- Pricing cards with CTA buttons
- "Start Free Trial" for Chrome extension users
- "Subscribe Now" for web app users
- Feature comparison table

#### `/app/billing/page.tsx`
- Current subscription status
- Payment method management
- Billing history
- Upgrade/downgrade options
- Cancel subscription button
- Trial countdown (if applicable)

#### `/components/billing/SubscriptionStatus.tsx`
- Display current plan
- Show trial days remaining (if in trial)
- Next billing date
- Renewal amount

#### `/components/billing/PaymentMethodCard.tsx`
- Display saved payment method
- Update/remove payment method
- Add new payment method

#### `/components/billing/UpgradePrompt.tsx`
- Shown on /filtr when no subscription
- Clear messaging about requiring subscription
- CTA to pricing page
- Feature highlights

#### `/components/chrome-extension/TrialBanner.tsx`
- Display in extension popup
- Show trial days remaining
- CTA to add payment method
- Link to subscription management

### 7. Access Control & Paywalls

#### Web App Scan Access
```typescript
// In scan form component
const { isActive, trialDaysRemaining } = useSubscriptionStatus();

const canScan = isActive;

if (!canScan) {
  // Show upgrade prompt
  return <UpgradePrompt />;
}
```

#### Chrome Extension Trial Logic
```typescript
// Check trial eligibility
function canAccessExtension(subscription) {
  if (!subscription) return false;

  // Active subscription
  if (subscription.status === "active") return true;

  // Valid trial
  if (subscription.status === "trialing" && subscription.trialEnd > Date.now()) {
    return true;
  }

  return false;
}
```

### 8. UI/UX Flow

#### New User Signup (Web App)
1. User visits /filtr page
2. Sees upgrade prompt (scan disabled)
3. Clicks "Get Started" → /pricing
4. Selects plan → Stripe Checkout
5. Completes payment
6. Redirected to /billing (success)
7. Can now use scanner

#### New User Signup (Chrome Extension)
1. User installs extension
2. Opens extension popup
3. Prompted to sign up
4. Creates account (Clerk)
5. Prompted to start free trial
6. Adds payment method (Stripe)
7. Trial activated (7 days)
8. Banner shows days remaining
9. After 7 days, auto-converts to paid

#### Existing User (Subscription Management)
1. User navigates to /billing
2. Views current plan details
3. Can:
   - Update payment method
   - View billing history
   - Upgrade/downgrade plan
   - Cancel subscription
   - Access customer portal (Stripe-hosted)

### 9. Email Notifications

#### Required Email Templates
- **Trial Started**: Welcome email with trial details
- **Trial Ending Soon**: 2 days before trial ends
- **Trial Ended**: Conversion to paid subscription
- **Payment Successful**: Monthly payment confirmation
- **Payment Failed**: Retry payment prompt
- **Subscription Cancelled**: Confirmation with end date
- **Subscription Renewed**: Monthly renewal confirmation

#### Implementation
Use Convex scheduled functions + email service (Resend, SendGrid, etc.)

### 10. Security & Best Practices

#### Environment Variables
```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxx
```

#### Security Measures
- ✅ Verify webhook signatures
- ✅ Never expose secret keys client-side
- ✅ Validate user ownership before subscription actions
- ✅ Use HTTPS for all Stripe communication
- ✅ Implement rate limiting on API routes
- ✅ Log all payment events for audit trail
- ✅ Handle PCI compliance (Stripe handles card data)

### 11. Testing Checklist

#### Stripe Test Mode
- [ ] Create test products/prices
- [ ] Test checkout flow
- [ ] Test webhook handling
- [ ] Test trial period logic
- [ ] Test subscription cancellation
- [ ] Test payment failures
- [ ] Test plan upgrades/downgrades

#### Test Cards (Stripe)
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires Auth: 4000 0025 0000 3155
```

### 12. Migration Plan

#### Phase 1: Infrastructure Setup
1. Set up Stripe account and products
2. Add environment variables
3. Create Convex schema tables
4. Deploy webhook endpoint

#### Phase 2: Backend Implementation
1. Implement Convex mutations/queries
2. Create API routes
3. Set up webhook handlers
4. Test with Stripe CLI

#### Phase 3: Frontend Implementation
1. Build pricing page
2. Build billing dashboard
3. Add subscription status hooks
4. Implement paywalls
5. Add trial banners

#### Phase 4: Chrome Extension Integration
1. Add trial logic to extension
2. Implement trial banner
3. Link to billing page
4. Test extension trial flow

#### Phase 5: Testing & Launch
1. End-to-end testing
2. Load testing webhooks
3. Security audit
4. Soft launch to beta users
5. Monitor metrics
6. Full launch

## Success Metrics

### Key Performance Indicators (KPIs)
- **Trial Conversion Rate**: % of trials that convert to paid
- **Churn Rate**: % of subscriptions cancelled per month
- **Monthly Recurring Revenue (MRR)**: Total monthly revenue
- **Average Revenue Per User (ARPU)**: Revenue per subscriber
- **Payment Success Rate**: % of successful payments
- **Trial Signup Rate**: % of extension users starting trial

### Target Goals (First 3 Months)
- 30%+ trial conversion rate
- <10% monthly churn rate
- 95%+ payment success rate
- 50%+ of extension users start trial

## Support & Maintenance

### Ongoing Tasks
- Monitor webhook delivery
- Handle failed payments proactively
- Update pricing based on market
- A/B test pricing tiers
- Analyze cancellation reasons
- Improve trial-to-paid conversion
- Regular security audits

## Resources & Documentation

### Stripe Documentation
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

### Convex + Stripe Integration
- [Convex HTTP Actions](https://docs.convex.dev/functions/actions)
- [Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions)

### Next.js + Stripe
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Stripe Next.js Example](https://github.com/stripe-samples/checkout-single-subscription)

## Notes
- Always test in Stripe test mode before production
- Use Stripe CLI for local webhook testing
- Keep webhook handlers idempotent (can run multiple times safely)
- Monitor webhook delivery success rate
- Set up alerts for failed payments
- Implement grace period for failed payments (e.g., 3 days)
- Consider offering annual plans (discount incentive)
- Track metrics in analytics dashboard
