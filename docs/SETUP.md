# Setup Guide

## 1. Supabase – Library Tables

For the Library features (References, Idea Bank), run the migration:

1. Supabase Dashboard → **SQL Editor** → New query
2. Paste contents of `supabase/migrations/010_library_tables.sql`
3. Run it

This creates:

- `user_saved_references` – saved styles from the landing page
- `user_post_ideas` – Idea Bank entries

---

## 2. Credit Reset (Free & Paid Tiers)

Credits reset monthly via `reset_monthly_credits()` in Supabase. A cron job calls it daily.

### Vercel Cron

1. Add `CRON_SECRET` in Vercel → Project → Settings → Environment Variables:
   - Generate: `openssl rand -hex 32`
   - Add `CRON_SECRET` with that value

2. `vercel.json` is configured to run `/api/cron/reset-credits` daily at midnight UTC.

### Stripe (Paid Tiers)

- **checkout.session.completed** – sets credits and `credits_reset_date` (+30 days)
- **customer.subscription.updated / deleted** – updates plan and credits

No extra Stripe setup is needed for monthly reset. The cron job resets credits for all users (free and paid) when `credits_reset_date` has passed.

---

## 3. Support Email (Resend)

1. Get an API key from [resend.com](https://resend.com/api-keys)
2. Add in Vercel → Environment Variables:
   - `RESEND_API_KEY` – your Resend API key
   - `RESEND_FROM_EMAIL` (optional) – verified domain email, e.g. `support@yourdomain.com`
     - If omitted, uses `onboarding@resend.dev` (Resend’s test sender; verify your domain for production)

---

## 4. Library Page Error (formatDate)

The “Functions cannot be passed to Client Components” error was fixed by moving `formatDate` into the client component. If you still see it:

1. Redeploy to Vercel so the latest code is live
2. Clear Vercel build cache: Project → Settings → General → Build Cache → Clear

---

## 5. Stripe Redirect / Login Issue

If users must log in again after returning from Stripe (checkout or portal):

1. **NEXT_PUBLIC_SITE_URL** – Must match your app URL exactly (e.g. `https://designermeow.com`). No trailing slash.
2. **Same domain** – success_url and cancel_url must use the same domain as the app.
3. **Supabase** – In Supabase Dashboard → Authentication → URL Configuration, add your app URL to Redirect URLs.

## 6. Stripe Customer Portal (Billing Management)

The billing page includes a **Manage billing** button that opens Stripe Customer Portal. Users can:

- Update payment methods
- View and download invoices
- Cancel or change subscription

### Stripe Dashboard Setup

1. **Stripe Dashboard** → **Settings** → **Billing** → **Customer portal**
2. Enable: Update payment method, View invoice history, Cancel subscription
3. Set **Return URL** to `https://your-domain.com/billing` (or your app URL)

No extra API setup needed – the portal uses your Stripe secret key. Ensure `stripe_customer_id` is set on the user (happens automatically on first checkout).

### Upgrade with Proration (補差價)

For Basic → Pro upgrades, Stripe automatically prorates: the customer is charged the difference for the remaining billing period. The app uses `/api/billing/upgrade` for existing subscribers (subscription update) and `/api/checkout` for new subscriptions (free users).

---

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | AI generation |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server/cron |
| `RESEND_API_KEY` | For support | Support emails |
| `RESEND_FROM_EMAIL` | Optional | Verified sender |
| `CRON_SECRET` | For cron | Protects reset-credits endpoint |
| `STRIPE_*` | For billing | See STRIPE_SETUP.md |
