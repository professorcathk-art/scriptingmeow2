# Stripe Setup Guide (Test Mode)

## 1. Keys stored

Your Stripe keys are in `.env.local`:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – for client-side (if needed later)
- `STRIPE_SECRET_KEY` – for server-side API calls
- `STRIPE_PRICE_BASIC` – empty until you create products
- `STRIPE_PRICE_PRO` – empty until you create products
- `STRIPE_WEBHOOK_SECRET` – empty until you create a webhook

---

## 2. Stripe Dashboard setup

### Products (required)

1. Go to **Developers** → **Products** (or **Products** in the dashboard).
2. Create products and prices:

**Product 1: Basic**

- Name: `Basic`
- Price: `$9.90/month`
- Billing: Recurring, Monthly
- Copy the **Price ID** (e.g. `price_xxx`) → `STRIPE_PRICE_BASIC` in `.env.local`

**Product 2: Pro**

- Name: `Pro`
- Price: `$19.99/month`
- Billing: Recurring, Monthly
- Copy the **Price ID** → `STRIPE_PRICE_PRO` in `.env.local`

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
