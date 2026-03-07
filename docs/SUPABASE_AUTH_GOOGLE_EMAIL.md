# Supabase: Google Login & Email Confirmation

## Part 1: Add Google Login

### 1.1 Create OAuth credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. If prompted, configure the OAuth consent screen:
   - User Type: **External** (for public users) or **Internal** (for workspace only)
   - App name, support email, developer contact
   - Add scopes: `email`, `profile`, `openid`
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   Replace `<YOUR_SUPABASE_PROJECT_REF>` with your project ref (e.g. `abcdefghij` from `https://abcdefghij.supabase.co`).
7. Copy the **Client ID** and **Client Secret**

### 1.2 Enable Google in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **Providers** → **Google**
3. Toggle **Enable**
4. Paste **Client ID** and **Client Secret** from Google Cloud
5. Save

### 1.3 Add Google sign-in button to your app

You need to add a client-side Google sign-in flow. Example for the login page:

```tsx
// In login-form.tsx or a new GoogleButton component
"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton({ redirect }: { redirect?: string }) {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const redirectTo = redirect || "/dashboard";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      alert(error.message);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className="w-full py-3 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24"><!-- Google icon SVG --></svg>
      Continue with Google
    </button>
  );
}
```

Your existing `/auth/callback` route already handles `?next=` and `exchangeCodeForSession`, so it will work for Google OAuth redirects.

---

## Part 2: Email Confirmation for Sign Up

### 2.1 Configure in Supabase Dashboard

1. **Authentication** → **Providers** → **Email**
2. **Confirm email**: Toggle **ON** to require users to confirm their email before signing in
3. (Optional) **Secure email change**: Toggle ON if you want users to confirm when changing email

### 2.2 Email templates (optional)

1. **Authentication** → **Email Templates**
2. Edit **Confirm signup** to customize the confirmation email (subject, body, link)
3. The default template includes a magic link; users click it to confirm

### 2.3 Update your signup flow

When `Confirm email` is ON, `signUp` returns success but the user is **not** signed in until they confirm. You should:

1. **Show a "Check your email" message** instead of redirecting to dashboard
2. **Handle the confirmation link** — Supabase sends users to your site with `?token_hash=...&type=signup`. Your callback route must handle this.

#### Check your auth callback

Your callback at `/auth/callback` uses `exchangeCodeForSession(code)`. For **magic link / email confirmation**, Supabase redirects with `token_hash` and `type`, not `code`. You need to handle both:

```ts
// auth/callback/route.ts - handle both OAuth code and email confirmation
const requestUrl = new URL(request.url);
const code = requestUrl.searchParams.get("code");
const next = requestUrl.searchParams.get("next") || "/dashboard";
const tokenHash = requestUrl.searchParams.get("token_hash");
const type = requestUrl.searchParams.get("type");

if (code) {
  // OAuth (Google, etc.)
  await supabase.auth.exchangeCodeForSession(code);
} else if (tokenHash && type) {
  // Email confirmation / magic link
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "signup" | "magiclink" | "recovery",
  });
  if (error) {
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, request.url));
  }
}

return NextResponse.redirect(new URL(next, request.url));
```

#### Update signup page to show "Check your email"

```tsx
// When signUp succeeds and email confirmation is required:
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
});

if (error) {
  alert(error.message);
} else if (data.user && !data.session) {
  // Email confirmation required - user exists but no session yet
  setMessage("Check your email for a confirmation link.");
  // Don't redirect - let them know to check email
} else {
  router.push(redirectTo);
  router.refresh();
}
```

### 2.4 Redirect URL for email confirmation

1. **Authentication** → **URL Configuration**
2. Add to **Redirect URLs** (if not already):
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

---

## Summary checklist

- [ ] Google Cloud: Create OAuth client, add Supabase callback URL
- [ ] Supabase: Enable Google provider, add Client ID & Secret
- [ ] App: Add Google sign-in button using `signInWithOAuth`
- [ ] Supabase: Enable "Confirm email" for Email provider
- [ ] App: Update signup to show "Check your email" when confirmation is required
- [ ] App: Update auth callback to handle `token_hash` + `type` for email confirmation
- [ ] Supabase: Add redirect URLs for your domain(s)
