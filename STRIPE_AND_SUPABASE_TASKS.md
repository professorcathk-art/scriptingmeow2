# Stripe & Supabase Tasks

## Stripe Price IDs (Production)

| Plan | Product ID | Price ID |
|------|------------|----------|
| **Starter** ($12.9/mo) | `prod_U6kTLtW5UKVR7C` | `price_1T8WyiA61RbBP8C2qllK2sKC` |
| **Creator** ($19.9/mo) | `prod_U6kX8sGs2Lfajq` | `price_1T8X2nA61RbBP8C2cEe9zGTv` |

---

## Tasks to Complete

### 1. Stripe Dashboard

1. **Verify products & prices**
   - Starter: Product `prod_U6kTLtW5UKVR7C`, Price `price_1T8WyiA61RbBP8C2qllK2sKC` = $12.90/month
   - Creator: Product `prod_U6kX8sGs2Lfajq`, Price `price_1T8X2nA61RbBP8C2cEe9zGTv` = $19.90/month

2. **Update webhook events** (if not already)
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

3. **Webhook URL**: `https://your-domain.com/api/stripe/webhook`

### 2. Environment Variables (.env.local)

```bash
STRIPE_PRICE_STARTER=price_1T8WyiA61RbBP8C2qllK2sKC
STRIPE_PRICE_CREATOR=price_1T8X2nA61RbBP8C2cEe9zGTv
STRIPE_WEBHOOK_SECRET=whsec_xxx  # From Stripe Dashboard → Webhooks
```

### 3. Supabase

1. **Run migration 017**
   ```bash
   supabase db push
   ```
   Or in Supabase Dashboard → SQL Editor, run:
   ```sql
   -- Contents of supabase/migrations/017_rename_basic_to_starter.sql
   ```

2. **Migration 017 does**:
   - Renames `plan_tier` from `basic` → `starter` for existing users
   - Updates `reset_monthly_credits` function to use `starter` tier
   - Constraint: `plan_tier IN ('free', 'starter', 'creator')`

### 4. Credit Limits (Reference)

| Tier | Credits | 4K Upgrades |
|------|---------|-------------|
| Free | 5 | 0 |
| Starter | 20 | 2 |
| Creator | 50 | 5 |
