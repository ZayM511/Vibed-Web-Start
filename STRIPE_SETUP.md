# Stripe Setup Guide

## Step 1: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Sign up or log in to your Stripe account
3. Make sure you're in **Test mode** (toggle in the top right)
4. Copy your keys:
   - **Publishable key**: Starts with `pk_test_...`
   - **Secret key**: Click "Reveal test key" and copy (starts with `sk_test_...`)

## Step 2: Update Environment Variables

Open `.env.local` and replace the placeholder values:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY
```

## Step 3: Create Products and Prices in Stripe

1. Go to [Stripe Products](https://dashboard.stripe.com/test/products)
2. Click "**+ Add product**"

### Create Starter Plan
- **Name**: JobFiltr Starter
- **Description**: Unlimited scans, basic AI analysis
- **Pricing**: Recurring, Monthly, $9.99 USD
- Click "Save product"
- Copy the **Price ID** (starts with `price_...`)
- Update `.env.local`: `STRIPE_STARTER_PRICE_ID=price_...`

### Create Pro Plan
- **Name**: JobFiltr Pro
- **Description**: Priority scanning, advanced AI insights, export reports
- **Pricing**: Recurring, Monthly, $19.99 USD
- Click "Save product"
- Copy the **Price ID**
- Update `.env.local`: `STRIPE_PRO_PRICE_ID=price_...`

### Create Enterprise Plan
- **Name**: JobFiltr Enterprise
- **Description**: API access, bulk scanning, white-label options
- **Pricing**: Recurring, Monthly, $49.99 USD
- Click "Save product"
- Copy the **Price ID**
- Update `.env.local`: `STRIPE_ENTERPRISE_PRICE_ID=price_...`

## Step 4: Set Up Webhooks (After Deployment)

1. Get your Convex deployment URL (ends with `.convex.site`)
2. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
3. Click "**+ Add endpoint**"
4. **Endpoint URL**: `https://your-deployment.convex.site/stripe/webhook`
5. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
6. Click "Add endpoint"
7. Click on the webhook and reveal the **Signing secret** (starts with `whsec_...`)
8. Update `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`

## Step 5: Configure Customer Portal

1. Go to [Customer Portal Settings](https://dashboard.stripe.com/test/settings/billing/portal)
2. **Enable** the customer portal
3. Configure allowed features:
   - ✅ Update payment method
   - ✅ View invoices
   - ✅ Cancel subscriptions
4. Click "Save"

## Step 6: Test with Stripe Test Cards

Use these test card numbers:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

## Step 7: Production Deployment

When ready to go live:

1. Switch to **Live mode** in Stripe Dashboard
2. Get live API keys (start with `sk_live_` and `pk_live_`)
3. Create live products and prices
4. Create live webhook endpoint
5. Update production environment variables
6. Test with a real card and immediately refund

## Troubleshooting

### Webhooks not working?
- Verify endpoint URL uses `.convex.site` (not `.convex.cloud`)
- Check webhook secret is correct
- View webhook delivery logs in Stripe Dashboard

### Subscription not activating?
- Check Convex logs for errors
- Verify webhook events are being received
- Ensure user metadata (clerkId) is being sent correctly

### Need help?
- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Convex + Stripe Integration](https://docs.convex.dev/production/integrations/stripe)
