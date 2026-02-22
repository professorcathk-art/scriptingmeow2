# ScriptingMeow Setup Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Google Gemini API key

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Go to Settings > API and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utilities, database helpers, and API clients
- `/types` - TypeScript type definitions
- `/supabase` - Database migrations

## Key Features Implemented

### Journey 1: Brand Space & Brandbook Creation
- ✅ Guided brand setup (name, type, audience, value proposition)
- ✅ Reference image upload (UI ready, needs file upload implementation)
- ✅ AI-generated brandbook with editable sections
- ✅ Brand Space management (list, create, view)

### Journey 2: Post Generation
- ✅ Select brand and post type (single image, carousel)
- ✅ Choose format (square, portrait, story, reel cover)
- ✅ Content input with language selection
- ✅ Variation selection with credit display
- ✅ Post generation with AI
- ✅ Review and edit generated posts
- ✅ Save to library

### Credit System & Pricing
- ✅ Free tier: 1 Brand Space, 10 credits/month
- ✅ Basic tier: 3 Brand Spaces, 100 credits/month ($9.9/month)
- ✅ Pro tier: 10 Brand Spaces, 500 credits/month ($19.99/month)
- ✅ Credit tracking and display
- ✅ Credit deduction on generation

### Additional Features
- ✅ User authentication (login/signup)
- ✅ Library with filtering by brand and tags
- ✅ Billing page with plan comparison
- ✅ Dashboard with overview
- ✅ Protected routes with middleware

## Next Steps for Production

1. **File Upload**: Implement image upload to Supabase Storage for reference images
2. **Visual Generation**: Integrate image generation API (DALL-E, Midjourney, etc.) for post visuals
3. **Payment Integration**: Add Stripe or similar for subscription payments
4. **Email Verification**: Enable email verification in Supabase auth
5. **Error Handling**: Add comprehensive error handling and user feedback
6. **Loading States**: Enhance loading states and skeletons
7. **Testing**: Add unit and integration tests
8. **Deployment**: Deploy to Vercel or similar platform

## Credit System Details

- **1 credit = 1 generated variation for 1 size**
- Credits reset monthly on the billing date
- Unused credits do not roll over
- Example: Generating 3 variations of a square post uses 3 credits

## Database Schema

The database includes:
- `users` - User profiles with plan tier and credits
- `brand_spaces` - Brand spaces for each user
- `brandbooks` - AI-generated brandbooks
- `brand_reference_images` - Reference images for brand style
- `generated_posts` - Generated Instagram posts
- `credit_transactions` - Credit usage history

All tables have Row Level Security (RLS) enabled for data protection.
