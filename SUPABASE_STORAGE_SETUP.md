# Supabase Storage Setup

## Brand Reference Images (for Brandbook)

1. Create bucket **`brand-reference-images`** (public)
2. Used when uploading sample IG posts on the brandbook page
3. Required for AI to analyze your style (watercolor, colors, etc.)
4. If upload fails, check: bucket exists, `SUPABASE_SERVICE_ROLE_KEY` is set

---

## Post Images

This guide explains how to configure Supabase Storage for post images used in the "Review your post" page.

## 1. Create the Bucket

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Configure:
   - **Name**: `post-images`
   - **Public bucket**: Enable (required so images can be displayed via public URLs)
   - Click **Create bucket**

## 2. Storage Policies (Optional)

The app uses the **service role** for uploads, which bypasses RLS. You only need policies if you want to restrict access. For a public bucket, the default policies are usually sufficient.

If you see upload errors, add a policy to allow public read:

- **Policy name**: `Public read access for post-images`
- **Allowed operation**: SELECT
- **Target roles**: public
- **Policy definition**: `bucket_id = 'post-images'`

## 3. Verify

- The app uploads SVG placeholders to `post-images/{userId}/{postId}.svg`
- Images are displayed on the Review your post page
- If the bucket does not exist or upload fails, the app falls back to an inline data URL so the image still displays

## 4. Environment

Ensure your `.env.local` has:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is used server-side for uploads. **Do not expose it to the client.** You can find it under Project Settings → API in the Supabase Dashboard.
