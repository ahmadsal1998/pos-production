# Step-by-Step: Fix Vercel Deployment

Your frontend is still calling the wrong URL. Follow these exact steps:

## Current Problem

```
POST https://pos-production.vercel.app/api/auth/login 405
```

This means `VITE_API_URL` is **not configured** in Vercel.

## Step-by-Step Fix

### Step 1: Get Your Backend URL

First, you need your Render backend URL. 

**Option A**: You already deployed it
- Go to Render Dashboard: https://dashboard.render.com
- Find your `pos-backend` service
- Copy the URL (e.g., `https://pos-backend.onrender.com`)

**Option B**: Deploy backend first
- Follow: [backend/DEPLOY_QUICKSTART.md](backend/DEPLOY_QUICKSTART.md)
- Takes ~15 minutes
- Get the URL from Render dashboard

### Step 2: Configure Vercel Environment Variable

1. Go to: https://vercel.com/dashboard
2. Click on your project: `pos-production`
3. Click: **Settings** (top menu)
4. Click: **Environment Variables** (left sidebar)
5. Click: **Add New** button
6. Fill in:
   ```
   Name: VITE_API_URL
   Value: https://YOUR-ACTUAL-BACKEND-URL.onrender.com/api
   Environment: [x] Production [x] Preview [x] Development
   ```
7. Click: **Save**

**Important**: 
- Replace `YOUR-ACTUAL-BACKEND-URL` with your real Render URL
- Include `/api` at the end
- Select all environments

### Step 3: Redeploy Frontend

**Option 1: Dashboard (Easiest)**
1. Stay in Vercel Dashboard
2. Click: **Deployments** (top menu)
3. Find the latest deployment
4. Click the three dots (⋮) on the right
5. Click: **Redeploy**
6. Wait 2-3 minutes

**Option 2: Git Push (Automatic)**
If Vercel is connected to GitHub:
```bash
# This commit will auto-deploy
echo "" >> README.md
git add README.md
git commit -m "chore: Trigger redeploy"
git push origin main
```

**Option 3: Vercel CLI**
```bash
vercel --prod
```

### Step 4: Verify

1. Wait for deployment to complete
2. Visit: https://pos-production.vercel.app
3. Open browser DevTools (F12)
4. Go to **Network** tab
5. Try to login
6. Check the request URL:
   - ✅ Should see: `POST https://your-actual-backend.onrender.com/api/auth/login`
   - ❌ Should NOT see: `POST https://pos-production.vercel.app/api/auth/login`

## Quick Checklist

- [ ] Have Render backend URL
- [ ] Set `VITE_API_URL` in Vercel settings
- [ ] Redeployed frontend
- [ ] Verified network requests go to Render URL
- [ ] Login works without 405 errors

## Still Not Working?

### Check 1: Environment Variable
1. Vercel Dashboard → Settings → Environment Variables
2. Do you see `VITE_API_URL`? If not, add it.
3. Is the value correct? Should be `https://...onrender.com/api`

### Check 2: Redeploy
1. Did you actually redeploy?
2. Vercel Dashboard → Deployments
3. Is there a new deployment after you set the variable?
4. If not, click "Redeploy" manually

### Check 3: Backend
```bash
# Test if backend works
curl https://your-backend-url.onrender.com/health
```
Should return: `{"success":true,"message":"POS System API is running"}`

If error → Backend not deployed. See [backend/DEPLOY_QUICKSTART.md](backend/DEPLOY_QUICKSTART.md)

### Check 4: Browser Cache
- Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Or: Clear browser cache
- Or: Try incognito/private window

## Visual Guide

```
Before (Wrong):
Frontend → Vercel URL → ❌ 405 Error

After (Correct):
Frontend → Render Backend → ✅ Success
         ↑
    VITE_API_URL points here
```

## Common Mistakes

❌ **Wrong**: `VITE_API_URL=https://backend.onrender.com`
✅ **Correct**: `VITE_API_URL=https://backend.onrender.com/api`

❌ **Wrong**: Only set for Production
✅ **Correct**: Set for Production, Preview, AND Development

❌ **Wrong**: Set variable but didn't redeploy
✅ **Correct**: Redeploy after setting variable

❌ **Wrong**: Typo in URL
✅ **Correct**: Copy-paste URL from Render

## Next Steps After Success

Once login works:
1. ✅ Test forgot password
2. ✅ Test all features
3. ✅ Monitor for errors
4. ✅ Check Render logs
5. ✅ Consider upgrading Render plan

---

**Status**: ⚠️ Action Required  
**Time**: 5 minutes  
**Difficulty**: ⭐☆☆☆☆ (Easy)

