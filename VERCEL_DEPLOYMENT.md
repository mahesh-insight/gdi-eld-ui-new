# Vercel Deployment Guide

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to Development Environment**:
   ```bash
   vercel
   ```
   - Follow the prompts
   - Choose your project name (e.g., `gdi-eld-ui-new`)
   - This creates a preview deployment URL like: `https://gdi-eld-ui-new-xxxxx.vercel.app`

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository: `mahesh-insight/gdi-eld-ui-new`
4. Configure environment variables (see below)
5. Click "Deploy"

## Environment Variables for Vercel

Set these in your Vercel project settings (Settings → Environment Variables):

```
NEXT_PUBLIC_API_BASE_URL=https://api-ccrdev.insight.com
NEXT_PUBLIC_CCR_API_BASE_URL=https://api-ccrdev.insight.com
CCR_API_BASE_URL=https://api-ccrdev.insight.com
API_BASE_URL=https://api-ccrdev.insight.com
BACKEND_URL=https://api-ccrdev.insight.com
REDIRECT_URL=https://projectqa.insight.com
ANALYTICS_SCRIPT=https://assets.adobedtm.com/8875b4697ed8/dd1907352cb7/launch-7fde578aa51b-development.js
```

## Important: Configure PingFederate Redirect URI

After deploying, you need to whitelist your Vercel URL in PingFederate:

1. Get your Vercel deployment URL (e.g., `https://gdi-eld-ui-new-xxxxx.vercel.app`)
2. Contact the backend team to add this URL to PingFederate's allowed redirect URIs
3. The redirect_uri will be automatically set to your Vercel URL by the app

## Sharing the Dev Environment

Once deployed, you can share your Vercel URL with others:

**Preview Deployments (for testing):**
- Each git push creates a unique preview URL
- Format: `https://gdi-eld-ui-new-git-{branch}-{team}.vercel.app`
- Perfect for sharing with team members for testing

**Production Deployment:**
- Format: `https://gdi-eld-ui-new.vercel.app` (or your custom domain)
- Use this for stable, production-ready versions

## Deployment URLs

After deployment, you'll get:
- **Preview URL**: `https://gdi-eld-ui-new-{hash}.vercel.app` (each deployment)
- **Branch URL**: `https://gdi-eld-ui-new-git-{branch}.vercel.app` (per branch)
- **Production URL**: `https://gdi-eld-ui-new.vercel.app` (main/production)

## How It Works

The app automatically detects if it's running on:
- **localhost** → Uses `http://localhost:8080` as redirect_uri
- **Vercel/Production** → Uses the actual deployment URL as redirect_uri

No manual configuration needed! The app reads `window.location.origin` and sets the correct redirect_uri.

## Testing the Deployment

1. Open your Vercel URL
2. Click "Login"
3. You'll be redirected to PingFederate
4. After authentication, you'll be redirected back to your Vercel URL
5. The dashboard will load with your data

## Troubleshooting

### Issue: "Redirect URI mismatch" error from PingFederate
**Solution**: Contact the backend team to whitelist your Vercel URL in PingFederate configuration.

### Issue: API calls failing
**Solution**: Verify environment variables are set correctly in Vercel dashboard.

### Issue: Build fails
**Solution**: Check the build logs in Vercel dashboard for specific errors.

## Continuous Deployment

Once connected to GitHub:
- Every push to `feature/initiialSetup` creates a preview deployment
- Merging to `main` triggers a production deployment
- All deployments are automatic!

## Custom Domain (Optional)

To use a custom domain like `ccr-dev.insight.com`:
1. Go to Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed by Vercel
5. Update PingFederate to allow the custom domain as redirect_uri
