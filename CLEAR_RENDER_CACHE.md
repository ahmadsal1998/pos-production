# Clear Render Build Cache - CRITICAL STEP

## The Problem

The error shows Docker is using a **cached layer** with the old 6144MB memory setting, even though we've updated the Dockerfile to 1536MB.

## Solution: Clear Build Cache in Render

### Step 1: Clear Build Cache

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your service** (pos-backend)
3. **Go to Settings tab**
4. **Scroll to "Build & Deploy" section**
5. **Click "Clear build cache"** button
6. **Confirm the action**

### Step 2: Update Environment Variable

1. **Go to Environment tab**
2. **Find or add**: `NODE_OPTIONS`
3. **Set value to**: `--max-old-space-size=1536`
4. **Save Changes**

### Step 3: Manual Deploy

1. **Go to Manual Deploy section**
2. **Click "Deploy latest commit"**
3. This forces a fresh build without cache

## Alternative: Use --no-cache Flag

If clearing cache doesn't work, you can temporarily modify the build command in Render Dashboard:

1. Go to **Settings** → **Build Command**
2. Change to:
   ```bash
   docker build --no-cache -t pos-backend .
   ```

**Note**: This will make builds slower but ensures no cached layers are used.

## Why This Happens

Docker caches layers to speed up builds. When we change the `ENV NODE_OPTIONS` line, Docker might still use the cached layer from before the change. Clearing the cache forces Docker to rebuild all layers with the new settings.

## After Clearing Cache

Once you clear the cache and redeploy:
- ✅ Docker will rebuild all layers
- ✅ New memory limit (1536MB) will be applied
- ✅ Build should complete successfully

---

**IMPORTANT**: You MUST clear the build cache in Render Dashboard, otherwise Docker will keep using the old cached layer with 6144MB.

