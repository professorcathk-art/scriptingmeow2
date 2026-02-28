# Vercel Environment Variables for Stripe

The "Stripe is not configured" (503) error means your Vercel deployment is missing Stripe env vars.

## Add these in Vercel Dashboard

1. Go to your project → **Settings** → **Environment Variables**
2. Add (for Production, Preview, Development as needed):

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_51S6pfg...` (your test secret key) |
| `STRIPE_PRICE_BASIC` | `price_1T5qXxABkRIOm34X4uTmKSKe` |
| `STRIPE_PRICE_PRO` | `price_1T5qbCABkRIOm34XEnPWNXes` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_kRb4sJJgYofhI1F44Cufi4TresBDbgQ7` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |

3. **Redeploy** after adding (Vercel → Deployments → ⋮ → Redeploy)

## Webhook URL in Stripe

In Stripe Dashboard → Developers → Webhooks, set your endpoint to:

```
https://your-app.vercel.app/api/stripe/webhook
```
