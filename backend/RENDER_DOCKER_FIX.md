# Fixing Docker Build Cache Error on Render

## Error:
```
error writing layer blob: NotFound: rpc error: code = NotFound desc = content sha256:...: not found
```

This error occurs when Docker's layer cache becomes corrupted on Render.

## Solution Steps:

### Option 1: Clear Build Cache on Render (Recommended)

1. **Go to your Render Dashboard**
   - Navigate to your service
   - Go to the "Settings" tab
   - Scroll down to "Build & Deploy" section

2. **Clear Build Cache**
   - Click on "Clear build cache" button
   - Confirm the action

3. **Manual Deploy**
   - Go to "Manual Deploy" section
   - Click "Deploy latest commit"
   - This will force a fresh build without cache

### Option 2: Use Docker Build Without Cache

If Option 1 doesn't work, you can temporarily modify the build command:

1. In Render Dashboard → Settings → Build Command
2. Change to:
   ```bash
   docker build --no-cache -t pos-backend .
   ```

### Option 3: Force Rebuild from Render CLI

```bash
# Install Render CLI if not already installed
npm install -g render-cli

# Login to Render
render login

# Clear cache and redeploy
render service:deploy --clear-cache
```

### Option 4: Update Dockerfile (Already Done)

The Dockerfile has been updated with:
- Cache clearing commands
- Better layer management
- Explicit cache invalidation

## If Issue Persists:

1. **Check Render Status**: Visit https://status.render.com to check for service issues

2. **Reduce Build Context**:
   - Ensure `.dockerignore` is properly configured (already done)
   - This reduces the amount of data sent to Docker daemon

3. **Split Build Steps**:
   - If the issue continues, we can split the multi-stage build into separate services

4. **Contact Render Support**:
   - If none of the above work, contact Render support as it may be an infrastructure issue

## Prevention:

- Regularly clear build cache after major dependency updates
- Keep Dockerfile layers minimal
- Use `.dockerignore` to exclude unnecessary files
