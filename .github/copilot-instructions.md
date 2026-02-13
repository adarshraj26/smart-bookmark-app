# Smart Bookmark App - Development Instructions

This is a real-time bookmark manager built with Next.js, Supabase, and Tailwind CSS.

## Quick Setup

1. **Environment Variables**: Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

3. **Supabase Setup**: Follow SUPABASE_SETUP.md

4. **Deploy**: Follow DEPLOYMENT.md

## Key Files

- `QUICKSTART.md` - 30-minute setup guide
- `SUPABASE_SETUP.md` - Detailed Supabase configuration
- `DEPLOYMENT.md` - Deploy to Vercel
- `README.md` - Full documentation

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Supabase (Auth, PostgreSQL, Realtime)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Features

- ✅ Google OAuth authentication
- ✅ Add/delete bookmarks
- ✅ Real-time synchronization across tabs
- ✅ Private bookmarks (RLS-protected)
- ✅ Responsive UI

## Development

- Use `npm run dev` for local development
- Use `npm run build` to check for build errors
- All components are in `components/` folder
- Supabase client is in `lib/supabase.ts`

## Deployment

Push to GitHub and deploy on Vercel with environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then update Google OAuth redirect URLs.
