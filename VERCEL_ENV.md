# Vercel Environment Variables for Stripe

The "Stripe is not configured" (503) error means your Vercel deployment is missing Stripe env vars.

## Production (designermeow.com)

1. Go to your project → **Settings** → **Environment Variables**
2. Add for **Production**:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_51PzIjV...` (your live secret key from Stripe Dashboard) |
| `STRIPE_PRICE_BASIC` | `price_1T8Ls6A61RbBP8C2PRbq5rrW` |
| `STRIPE_PRICE_PRO` | `price_1T8LsVA61RbBP8C2Un0NHOtY` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` (from live webhook endpoint) |
| `NEXT_PUBLIC_SITE_URL` | `https://designermeow.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_51PzIjVA61RbBP8C28aI4U99q1D6RMOI2pygya1yTrtyc7mllnUXNtgXxoPlY2cZ2skBIKWBEECY1LfxUxlhaw1iw00CTW6zZZK` |

3. **Redeploy** after adding (Vercel → Deployments → ⋮ → Redeploy)

## Webhook URL in Stripe (Live mode)

In Stripe Dashboard → Developers → Webhooks (ensure **Live mode** is on), set your endpoint to:

```
https://designermeow.com/api/stripe/webhook
```

Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
