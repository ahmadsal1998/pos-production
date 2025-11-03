# Missing /api in VITE_API_URL

## Problem

You're seeing requests like:
```
POST https://pos-production-backend.onrender.com/auth/forgot-password 404
```

But it should be:
```
POST https://pos-production-backend.onrender.com/api/auth/forgot-password 200
```

Notice: Missing `/api` before `/auth/forgot-password`

## Root Cause

Your `VITE_API_URL` is missing `/api` at the end!

**Wrong**:
```
VITE_API_URL=https://pos-production-backend.onrender.com
```

**Correct**:
```
VITE_API_URL=https://pos-production-backend.onrender.com/api
```

## Fix

### Step 1: Update Environment Variable

1. Go to: https://vercel.com/dashboard
2. Click: `pos-production` project
3. Click: **Settings** → **Environment Variables**
4. Find: `VITE_API_URL`
5. Click: three dots (⋮) → **Edit**
6. Change value from:
   ```
   https://pos-production-backend.onrender.com
   ```
   To:
   ```
   https://pos-production-backend.onrender.com/api
   ```
7. Click: **Save**

### Step 2: Redeploy

**Option A: Dashboard**
1. Go to **Deployments**
2. Find latest deployment
3. Click three dots (⋮) → **Redeploy**
4. **Uncheck** "Use existing Build Cache"
5. Wait for deployment

**Option B: Git**
```bash
echo "" >> README.md
git add README.md
git commit -m "chore: Trigger redeploy with fixed VITE_API_URL"
git push origin main
```

### Step 3: Verify

1. Wait for deployment
2. Visit your site
3. Try to login
4. Check Network tab

**Should see**:
```
✅ POST https://pos-production-backend.onrender.com/api/auth/login
```

**Should NOT see**:
```
❌ POST https://pos-production-backend.onrender.com/auth/login
```

## How URLs Work

### Base URL Structure
```
VITE_API_URL = https://backend.onrender.com/api
                    ↓
           apiClient uses this as base
                    ↓
           Your code adds: /auth/login
                    ↓
       Final URL: https://backend.onrender.com/api/auth/login
                    ✅ CORRECT!
```

### If Missing /api
```
VITE_API_URL = https://backend.onrender.com
                    ↓
           apiClient uses this as base
                    ↓
           Your code adds: /auth/login
                    ↓
     Final URL: https://backend.onrender.com/auth/login
                    ❌ WRONG! (404 error)
```

## Your Backend Routes

Your backend has routes like:
- ✅ `/api/auth/login`
- ✅ `/api/auth/forgot-password`
- ✅ `/api/auth/verify-otp`
- ✅ `/api/auth/reset-password`

**All routes start with `/api`!**

So `VITE_API_URL` must END with `/api`:
- ✅ `https://your-backend.onrender.com/api`
- ❌ `https://your-backend.onrender.com`

## Complete Configuration

### Vercel Environment Variables

```
Key: VITE_API_URL
Value: https://pos-production-backend.onrender.com/api
Environment: ☑️ Production ☑️ Preview ☑️ Development
```

### Render Environment Variables

```
Key: CLIENT_URL
Value: https://pos-production.vercel.app
Environment: ☑️ Production
```

**No trailing slash on either!**

## Quick Test

Open browser console and run:

```javascript
console.log('API URL:', import.meta.env.VITE_API_URL)
```

**Expected**:
```
https://pos-production-backend.onrender.com/api
```

**If wrong**:
- Fix in Vercel Dashboard
- Redeploy
- Check again

## Summary

Your `VITE_API_URL` should be:
```
https://pos-production-backend.onrender.com/api
                                                   ↑↑↑
                                              Include this!
```

After fixing and redeploying, all API calls will work! ✅

