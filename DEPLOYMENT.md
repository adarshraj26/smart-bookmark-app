# DEPLOYMENT.md

## Deploy Smart Bookmark App to Vercel

### Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase project set up with environment variables

### Step 1: Push Code to GitHub

```bash
cd smart-bookmark-app

# Initialize git repo
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Smart Bookmark App"

# Create repository on GitHub and push
git remote add origin https://github.com/yourusername/smart-bookmark-app
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com/new
2. Click **"Continue with GitHub"** and authorize Vercel
3. **Import GitHub Project**:
   - Find `smart-bookmark-app` repository
   - Click **"Import"**

4. **Configure Project**:
   - **Project Name**: `smart-bookmark-app` (or your choice)
   - **Framework Preset**: Should auto-detect "Next.js"
   - **Root Directory**: `.` (current directory)

5. **Add Environment Variables**:
   - Click **"Environment Variables"**
   - Add two variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
     ```
   - Get these from your Supabase dashboard > Settings > API

6. Click **"Deploy"**
   - Vercel will build and deploy your app
   - This takes 1-2 minutes

7. Once complete, you'll see your live URL: `https://smart-bookmark-app-xxxxx.vercel.app`

### Step 3: Update Supabase Google OAuth Redirect URL

⚠️ **IMPORTANT**: Update your Supabase Google OAuth settings with your Vercel domain

1. In Supabase Dashboard, go to **Authentication > Providers > Google**
2. Add your Vercel deployment URL to **Redirect URLs**:
   ```
   https://smart-bookmark-app-xxxxx.vercel.app/auth/callback
   ```
3. Click **"Save"**

### Step 4: Update Google Cloud Console Redirect URL

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Edit your OAuth client ID
3. Add your Vercel URL to **Authorized JavaScript origins**:
   ```
   https://smart-bookmark-app-xxxxx.vercel.app
   ```
4. Add to **Authorized redirect URIs**:
   ```
   https://smart-bookmark-app-xxxxx.vercel.app/auth/callback
   ```
5. Click **"Save"**

### Step 5: Test Your Live App

1. Visit: `https://smart-bookmark-app-xxxxx.vercel.app`
2. Sign in with Google
3. Add some bookmarks
4. Verify real-time sync (open in another tab)
5. Test delete functionality

### Custom Domain (Optional)

To use a custom domain like `mybookmarks.com`:

1. In Vercel Dashboard, go to your project
2. Click **"Settings"** > **"Domains"**
3. Enter your custom domain
4. Follow instructions to update your domain's DNS records
5. Update Supabase and Google OAuth redirect URLs with your custom domain

## Environment Variables Reference

| Variable | Value | Source |
|----------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Supabase > Settings > API |

## Troubleshooting Deployment

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure no local-only files are referenced
- Check build logs in Vercel dashboard

### Environment Variables Not Working
- Verify variables are added in Vercel > Settings > Environment Variables
- Redeploy after adding variables: Go to Deployments > ... > Redeploy
- Variables must start with `NEXT_PUBLIC_` to be accessible in browser

### Google OAuth Fails in Production
- Check redirect URL is exactly correct (including protocol and path)
- Update both Supabase AND Google Cloud Console
- Clear browser cookies and try again

### Real-time Not Working
- Verify Realtime is enabled in Supabase for bookmarks table
- Check network tab for WebSocket connections
- Ensure same user is logged in across tabs

## Monitoring & Logs

### Check Vercel Logs
- Vercel Dashboard > Select Project > Deployments
- Click any deployment and view **Logs**

### Check Supabase Logs
- Supabase Dashboard > Logs

## Rollback

If something breaks:

1. In Vercel Dashboard > Deployments
2. Find the last working deployment
3. Click **"..." > "Redeploy"**

## Success Checklist

- ✅ App deployed on Vercel
- ✅ Environment variables configured
- ✅ Google OAuth redirect URLs updated
- ✅ Can sign in with Google on live URL
- ✅ Can add/delete bookmarks
- ✅ Real-time sync works across tabs
- ✅ Bookmarks are private (users only see their own)
