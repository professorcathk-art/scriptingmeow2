# Deployment Guide

## ✅ Completed Setup

1. **Environment Variables**: `.env.local` created with Gemini API key
2. **Image Generation**: Integrated with placeholder (ready for Imagen API)
3. **File Upload**: Reference image upload functionality implemented
4. **Build**: Project builds successfully ✓
5. **Health Check**: Health endpoint created at `/api/health`

## 🔧 Required Setup Steps

### 1. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Go to **SQL Editor** and run: `supabase/migrations/001_initial_schema.sql`
3. Go to **Settings > API** and copy:
   - Project URL → Update `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
   - Anon/Public Key → Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`

### 2. Update .env.local

Your `.env.local` file should look like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
GEMINI_API_KEY=AIzaSyDNKgEjFNrjeffDbe-Odbn7dqcwl-jfOP0
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Storage Setup (for image uploads)

1. Go to **Storage** in Supabase dashboard
2. Create a bucket named `brand-reference-images`
3. Set it to **Public**
4. Update `app/api/brand-spaces/[id]/images/route.ts` to use actual Supabase Storage

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (will be auto-set by Vercel)
5. Deploy!

### Option 2: Self-Hosted

```bash
npm run build
npm start
```

## 🧪 Health Check

After deployment, test the health endpoint:

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "timestamp": "2024-...",
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "gemini": "healthy",
    "environment": "healthy"
  }
}
```

## 📝 Image Generation Setup

Currently using placeholder images. To enable actual image generation:

1. **Option A**: Use Google Vertex AI Imagen API
   - Requires Google Cloud Project setup
   - Update `lib/ai/imagen.ts` with Vertex AI integration

2. **Option B**: Use alternative services
   - DALL-E API (OpenAI)
   - Stable Diffusion API
   - Midjourney API

Update `lib/ai/imagen.ts` with your chosen service.

## ✅ Functionality Checklist

- [x] User authentication (login/signup)
- [x] Brand Space creation
- [x] Brandbook generation with AI
- [x] Reference image upload (UI ready, needs Supabase Storage)
- [x] Post generation with AI
- [x] Image generation (placeholder, ready for API integration)
- [x] Credit system
- [x] Library with filtering
- [x] Billing page
- [x] Dashboard
- [x] Health check endpoint

## 🔍 Testing

1. **Start dev server**: `npm run dev`
2. **Run health check**: `npm run health-check` (after server is running)
3. **Test flows**:
   - Sign up → Create Brand Space → Generate Brandbook → Create Post

## 📊 Current Status

- ✅ Build: Successful
- ✅ TypeScript: All types correct
- ✅ ESLint: Warnings only (image optimization suggestions)
- ⚠️ Supabase: Needs configuration
- ⚠️ Image Generation: Using placeholder (needs API integration)

## 🎯 Next Steps

1. Set up Supabase project and update `.env.local`
2. Test authentication flow
3. Test brand space creation
4. Test post generation
5. Integrate actual image generation API
6. Deploy to production
