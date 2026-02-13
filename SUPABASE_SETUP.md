# SUPABASE_SETUP.md

## Step-by-Step Supabase Setup Guide

### 1. Create a Supabase Project

1. Go to https://supabase.com and sign up/log in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `smart-bookmark-app` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to you
4. Click **"Create new project"** and wait for it to initialize

### 2. Set Up Environment Variables

1. In your Supabase project, go to **Settings > API**
2. Copy the following to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://arhfdlwuvqvqgywfavyk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable__NU4YBHhnzPe7hF5lYca8g_CtGz0LWA
```

**Where to find these:**
- **Project URL**: Under "Project URL" in Settings > API
- **Anon Key**: Under "Project API keys" > "anon public"

### 3. Create the Bookmarks Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste this SQL:

```sql
-- Create folders table
CREATE TABLE folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookmarks table (with folder_id)
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_folder_id ON bookmarks(folder_id);
CREATE INDEX idx_folders_user_id ON folders(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only SELECT their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only INSERT their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only SELECT their own folders
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only INSERT their own folders
CREATE POLICY "Users can insert own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
-- RLS Policy: Users can only DELETE their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
```

4. Click **"Run"** to execute the SQL
5. You should see a success message

### 4. Set Up Google OAuth

#### Prerequisites: Google Cloud Console Setup

1. Go to https://console.cloud.google.com
2. Create a new project (if you don't have one):
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Enter `smart-bookmark-app`
   - Click **"Create"**

3. Enable Google+ API:
   - In the search bar, search for **"Google+ API"**
   - Click on it and press **"Enable"**

4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services > Credentials**
   - Click **"Create Credentials" > "OAuth client ID"**
   - If prompted, configure the OAuth consent screen first:
     - Choose **"External"**
     - Fill in app name: `Smart Bookmark App`
     - Add your email
     - Click **"Save and Continue"** through all screens
   
   - Back to creating credentials:
     - Choose **"Web application"**
     - Under **"Authorized JavaScript origins"**, add:
       - `http://localhost:3000` (for local development)
       - `https://yourdomain.vercel.app` (for production, add later)
     - Under **"Authorized redirect URIs"**, add:
       - `http://localhost:3000/auth/callback`
       - `https://yourdomain.vercel.app/auth/callback` (add later)
     - Click **"Create"**

5. Copy your **Client ID** (you'll need this)

#### Setting Up in Supabase

1. In your Supabase dashboard, go to **Authentication > Providers > Google**
2. Enable the provider (toggle on)
3. Paste your **Client ID** from Google Cloud Console
4. For the **Client Secret**, paste it from Google Cloud Console
5. Click **"Save"**

#### Important: Add Redirect URLs in Google Cloud Console

1. Go back to Google Cloud Console
2. Go to **APIs & Services > Credentials**
3. Click your OAuth client ID to edit it
4. Add these redirect URIs:
   ```
   http://localhost:3000/auth/callback
   https://[your-vercel-url].vercel.app/auth/callback
   ```
5. Click **"Save"**

### 5. Test the Setup Locally

1. Create `.env.local` with your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Run the app:
```bash
npm run dev
```

3. Visit `http://localhost:3000`
4. Click **"Sign up"** and authenticate with Google
5. Add a test bookmark
6. Open another browser tab to verify real-time sync

### Deployment to Vercel

Once everything works locally:

1. Push to GitHub
2. Deploy on Vercel (add environment variables)
3. Update Google OAuth redirect URLs to your Vercel domain
4. Test the live application

## Troubleshooting

### "Missing environment variables" error
- Ensure `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### "Real-time not working"
- Check that `ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;` was executed
- Verify Realtime is enabled in Supabase dashboard

### "Google OAuth fails"
- Verify Client ID and Client Secret are correct
- Check that redirect URLs in Google Console match your app
- For localhost, ensure you're using `http://localhost:3000`, not `https`

### "Permission denied" when adding bookmarks
- Check RLS policies in Supabase > SQL Editor
- Run the full SQL setup again to ensure all policies are created

## File Locations for Reference

- **Supabase URL**: Supabase Dashboard > Settings > API > Project URL
- **Anon Key**: Supabase Dashboard > Settings > API > Project API keys
- **Google Client ID/Secret**: Google Cloud Console > APIs & Services > Credentials
