# ⚠️ URGENT: Redeploy Frontend on Vercel

## Problem

The frontend on Vercel is still using the old code without these fixes:
- ❌ Old API timeout (10s instead of 30s)
- ❌ Missing `VITE_API_URL` configuration
- ❌ API calls going to wrong URL

You can see in the error:
```
POST https://pos-production.vercel.app/api/auth/login 405
```

This is the **Vercel URL**, not your Render backend URL!

## Solution: Redeploy Frontend

You MUST redeploy the frontend on Vercel to get the fixes.

### Option 1: Via Vercel Dashboard (Quickest)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `pos-production`
3. Go to **Deployments** tab
4. Find the latest deployment (should be old)
5. Click the three dots (⋮) on the right
6. Select **Redeploy**
7. Wait for deployment to complete (~2-3 minutes)

### Option 2: Via Git Push (Automatic)

If Vercel is connected to your GitHub:
1. Make a small change to trigger rebuild
2. Push to GitHub
3. Vercel will auto-deploy

```bash
# Make a dummy commit
echo " " >> .gitignore
git add .gitignore
git commit -m "chore: Trigger Vercel redeploy"
git push origin main
```

### Option 3: Via Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

## Before Redeploying: Set Environment Variable!

**IMPORTANT**: You also need to set the `VITE_API_URL` environment variable!

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `pos-production`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Configure:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://YOUR-BACKEND-URL.onrender.com/api`
     - Replace `YOUR-BACKEND-URL` with your actual Render URL
     - **Include `/api` at the end!**
   - **Environment**: Select ALL (Production, Preview, Development)
6. Click **Save**
7. **Now redeploy** (see options above)

## Verify Backend is Deployed

Make sure your backend is deployed to Render first:

```bash
# Check if backend is running
curl https://your-backend-url.onrender.com/health
```

Should return:
```json
{
  "success": true,
  "message": "POS System API is running"
}
```

If you get an error, deploy backend first:
- See: [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md)
- Or: [backend/DEPLOY_QUICKSTART.md](backend/DEPLOY_QUICKSTART.md)

## After Redeploy: Verify

1. Wait for deployment to complete
2. Visit your Vercel URL: `https://pos-production.vercel.app`
3. Open browser DevTools → Network tab
4. Try to login
5. Check the network requests:
   - ✅ Should see: `POST https://your-backend-url.onrender.com/api/auth/login`
   - ❌ Should NOT see: `POST https://pos-production.vercel.app/api/auth/login`

## Quick Checklist

- [ ] Backend deployed to Render
- [ ] Backend URL obtained
- [ ] `VITE_API_URL` set in Vercel to `https://your-backend-url.onrender.com/api`
- [ ] Frontend redeployed on Vercel
- [ ] Verified API calls go to Render URL (not Vercel URL)
- [ ] Login works
- [ ] No 405 errors

## Common Issues

### Still seeing 405 errors

**Cause**: `VITE_API_URL` not set or wrong value

**Fix**: 
1. Check Vercel Dashboard → Settings → Environment Variables
2. Verify `VITE_API_URL` is set to your Render backend URL + `/api`
3. Redeploy frontend

### Still seeing Vercel URL in network requests

**Cause**: Old build still deployed

**Fix**: Force redeploy via Vercel Dashboard

### Timeout errors (> 30s)

**Cause**: Backend not deployed or wrong URL

**Fix**: 
1. Check backend is running on Render
2. Verify URL is correct
3. Test with curl: `curl https://your-backend-url.onrender.com/health`

### CORS errors

**Cause**: `CLIENT_URL` not set in Render

**Fix**: In Render dashboard:
1. Add environment variable: `CLIENT_URL`
2. Value: `https://pos-production.vercel.app`
3. No trailing slash!
4. Redeploy backend

## Next Steps

After successful redeploy:
1. ✅ Test all authentication flows
2. ✅ Monitor for errors
3. ✅ Check Render logs
4. ✅ Consider upgrading to Render Starter plan ($7/mo)

---

**Status**: ⚠️ Action Required  
**Priority**: High  
**Estimated Fix Time**: 5 minutes  
**Difficulty**: ⭐☆☆☆☆ (Easy)

