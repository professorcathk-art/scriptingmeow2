# Stripe Setup Guide

## Production (designermeow.com)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_51PzIjVA61RbBP8C28aI4U99q1D6RMOI2pygya1yTrtyc7mllnUXNtgXxoPlY2cZ2skBIKWBEECY1LfxUxlhaw1iw00CTW6zZZK` |
| `STRIPE_SECRET_KEY` | Your live secret key (`sk_live_...`) from Stripe Dashboard |
| `STRIPE_PRICE_STARTER` | `price_1T8WyiA61RbBP8C2qllK2sKC` |
| `STRIPE_PRICE_CREATOR` | `price_1T8X2nA61RbBP8C2cEe9zGTv` |
| `STRIPE_WEBHOOK_SECRET` | From live webhook (Stripe → Developers → Webhooks) |

Product IDs (reference): Starter `prod_U6kTLtW5UKVR7C`, Creator `prod_U6kX8sGs2Lfajq`

---

## Reset account to Free (for testing upgrade flow)

If your account is on Pro/Basic and you want to test the upgrade flow, run in Supabase SQL Editor:

```sql
-- Replace YOUR_USER_ID with your auth.users id (from Supabase Auth or users table)
UPDATE public.users
SET plan_tier = 'free', credits_remaining = 5, credits_reset_date = NOW() + INTERVAL '1 month',
    stripe_subscription_id = NULL, stripe_price_id = NULL
WHERE id = 'YOUR_USER_ID';
```

To find your user id: Supabase Dashboard → Authentication → Users → copy the UUID.

---

## 1. Keys stored

Your Stripe keys are in `.env.local`:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – for client-side (if needed later)
- `STRIPE_SECRET_KEY` – for server-side API calls
- `STRIPE_PRICE_STARTER` – Starter plan price ID
- `STRIPE_PRICE_CREATOR` – Creator plan price ID
- `STRIPE_WEBHOOK_SECRET` – empty until you create a webhook

---

## 2. Stripe Dashboard setup

### Products (required)

1. Go to **Developers** → **Products** (or **Products** in the dashboard).
2. Create products and prices:

**Product 1: Starter**

- Name: `Starter`
- Price: `$12.90/month`
- Billing: Recurring, Monthly
- Copy the **Price ID** (e.g. `price_xxx`) → `STRIPE_PRICE_STARTER` in `.env.local`

**Product 2: Creator**

- Name: `Creator`
- Price: `$24.90/month`
- Billing: Recurring, Monthly
- Copy the **Price ID** → `STRIPE_PRICE_CREATOR` in `.env.local`

### Webhook (required)

1. Go to **Developers** → **Webhooks**.
2. Click **Add endpoint**.
3. URL: `https://your-domain.com/api/stripe/webhook`  
   - Local: use Stripe CLI (see below) or `ngrok` for local testing.
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**.
6. Copy the **Signing secret** (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## 3. Local webhook testing

For local testing, use Stripe CLI:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a webhook signing secret (e.g. `whsec_xxx`). Use that as `STRIPE_WEBHOOK_SECRET` in `.env.local` while testing locally.

---

## 4. SQL migration

Run the migration in Supabase:

1. Supabase Dashboard → **SQL Editor** → New query.
2. Paste contents of `supabase/migrations/006_stripe_subscriptions.sql`.
3. Run it.

It adds `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id` to `users` and updates credit limits (free=5, basic=50, pro=200). No changes needed for your setup.

---

## 5. Security

- Rotate your secret key if it was exposed (e.g. in chat logs).
- Never commit `.env.local` in git.
- Keep `.env.local` in `.gitignore` (already configured).
