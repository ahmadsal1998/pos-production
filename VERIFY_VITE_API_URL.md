# How to Verify VITE_API_URL is Set

## Quick Check

The URL `pos-production-git-main-ahmadsal1998s-projects.vercel.app` shows you're on a **preview deployment**.

This means either:
1. `VITE_API_URL` is not set for Preview environment
2. You need to redeploy Production specifically

## Step 1: Verify Environment Variable is Set

### Check Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click: `pos-production` project
3. Click: **Settings** (top navigation)
4. Click: **Environment Variables** (left sidebar)
5. Look for: `VITE_API_URL`

**What you should see**:
```
Name: VITE_API_URL
Value: https://your-backend-url.onrender.com/api
Environment: Production, Preview, Development ✅
```

**If you DON'T see it**:
- It's not set → Go to Step 2 below

**If you see it but values are wrong**:
- Click the three dots (⋮) → Edit
- Fix the value
- Make sure all environments are checked
- Save

## Step 2: Set Environment Variable Correctly

1. In **Environment Variables** page
2. Click: **Add New** button
3. Fill in:
   ```
   Key: VITE_API_URL
   Value: https://your-actual-backend-url.onrender.com/api
   ```
4. **IMPORTANT**: Check ALL environments:
   - ☑️ Production
   - ☑️ Preview  
   - ☑️ Development
5. Click: **Save**

**Example**:
```
Key: VITE_API_URL
Value: https://pos-backend.onrender.com/api
☑️ Production
☑️ Preview
☑️ Development
```

## Step 3: Force Redeploy ALL Environments

### For Production

1. Go to: **Deployments** tab
2. Find the **Production** deployment (green badge)
3. Click the three dots (⋮)
4. Click: **Redeploy**
5. Make sure: "Use existing Build Cache" is **unchecked**
6. Wait for deployment

### For Preview

1. Still in **Deployments** tab
2. Find the **Preview** deployment (orange badge)
3. Click the three dots (⋮)
4. Click: **Redeploy**
5. Make sure: "Use existing Build Cache" is **unchecked**
6. Wait for deployment

### Or Use Git Push

```bash
# This will trigger redeploy of ALL environments
echo "" >> README.md
git add README.md  
git commit -m "chore: Force redeploy all environments"
git push origin main
```

## Step 4: Verify the Fix

### Check Network Tab

1. Visit your site (production or preview)
2. Open DevTools (F12)
3. Go to **Network** tab
4. Try to login
5. Look at the request URL

**✅ Correct**:
```
POST https://your-backend-url.onrender.com/api/auth/login
```

**❌ Wrong**:
```
POST https://pos-production-*.vercel.app/api/auth/login
```

## Common Issues

### Issue 1: "Variable exists but preview still wrong"

**Cause**: Only set for Production, not Preview

**Fix**: 
1. Go to Environment Variables
2. Click three dots (⋮) on `VITE_API_URL`
3. Click Edit
4. Check ☑️ **Preview** checkbox
5. Save
6. Redeploy Preview

### Issue 2: "Set variable but still 405 errors"

**Cause**: Didn't redeploy after setting variable

**Fix**:
1. Go to Deployments
2. Click Redeploy on your environment
3. **Uncheck** "Use existing Build Cache"
4. Wait for deployment

### Issue 3: "Different deployments show different URLs"

**Cause**: Preview and Production deployments are different

**Fix**:
1. Set `VITE_API_URL` for ALL environments
2. Redeploy both Preview and Production
3. Test both URLs

### Issue 4: "Build cache causing old code"

**Cause**: Vercel using cached build

**Fix**:
1. When redeploying, **uncheck** "Use existing Build Cache"
2. Or: Click **Redeploy** → **Redeploy with**
3. Select: **Clear cache and redeploy**

## Visual Verification

### ✅ Correct Configuration

```
Vercel Dashboard:
├── Environment Variables
│   └── VITE_API_URL = https://backend.onrender.com/api
│       ├── Production ☑️
│       ├── Preview ☑️
│       └── Development ☑️
├── Deployments
│   ├── Production (https://pos-production.vercel.app)
│   └── Preview (https://pos-production-git-main-...vercel.app)
```

**Both deployments use `VITE_API_URL`** ✅

### ❌ Wrong Configuration

```
Vercel Dashboard:
├── Environment Variables
│   └── VITE_API_URL = https://backend.onrender.com/api
│       ├── Production ☑️
│       ├── Preview ☐  ← NOT SET!
│       └── Development ☐
├── Deployments
│   ├── Production (✅ Works)
│   └── Preview (❌ Wrong URL)
```

**Preview environment doesn't have variable** ❌

## Quick Test

Run this in browser console:

```javascript
// Check what URL is being used
console.log(import.meta.env.VITE_API_URL)
```

**Expected output**:
```
https://your-backend-url.onrender.com/api
```

**If undefined**:
- Variable not set or
- Not deployed yet

## Still Having Issues?

### Debug Steps

1. **Check variable exists**: Dashboard → Environment Variables
2. **Check it's for ALL environments**: Preview ☑️ Production ☑️
3. **Clear cache and redeploy**: Use "Clear cache" option
4. **Check deployment logs**: Look for VITE_API_URL in build logs
5. **Hard refresh browser**: Ctrl+Shift+R or Cmd+Shift+R

### Contact Points

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

---

**Summary**: You're on a preview deployment. Make sure `VITE_API_URL` is set for **Preview** environment and redeploy.

