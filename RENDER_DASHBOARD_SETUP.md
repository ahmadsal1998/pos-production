# Render Dashboard Configuration - Quick Setup Guide

## Critical Step: Add NODE_OPTIONS Environment Variable

This is **REQUIRED** for the OOM fix to work properly.

### Steps:

1. **Log in to Render Dashboard**
   - Go to: https://dashboard.render.com
   - Sign in to your account

2. **Navigate to Your Service**
   - Click on **Services** in the left sidebar
   - Select **pos-backend** (or your backend service name)

3. **Add Environment Variable**
   - Click on the **Environment** tab
   - Scroll down to the **Environment Variables** section
   - Click **Add Environment Variable** button

4. **Enter the Following**:
   ```
   Key:   NODE_OPTIONS
   Value: --max-old-space-size=2048
   ```

5. **Save Changes**
   - Click **Save Changes** button
   - Render will automatically trigger a new deployment

### Verification

After adding the environment variable:
- ✅ Check that it appears in the Environment Variables list
- ✅ Wait for the new deployment to start
- ✅ Monitor the build logs to ensure it completes successfully

## Optional: Check Service Plan

1. In your service settings, look for **Plan** information
2. If you're on the **Free** plan and still experiencing issues:
   - Consider upgrading to **Starter** ($7/month) or **Standard** ($25/month)
   - Go to **Settings** → **Plan** to upgrade

## Build Command Verification

The `render.yaml` file has been updated with optimized build commands. Verify in Render Dashboard:

1. Go to **Settings** tab
2. Check **Build Command** should show:
   ```
   NODE_OPTIONS="--max-old-space-size=2048" npm ci && NODE_OPTIONS="--max-old-space-size=2048" npm run build
   ```

If it doesn't match, you can manually update it in the dashboard or ensure your `render.yaml` is properly synced.

---

**Note**: The environment variable is the most critical change. Without it, the build process may still run out of memory.

