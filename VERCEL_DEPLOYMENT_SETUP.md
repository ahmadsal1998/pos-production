# Vercel Deployment Setup Instructions

## Problem: 404 NOT_FOUND Error

This error occurs because Vercel doesn't know where your project is located.

## Solution: Configure Vercel Settings

### Step 1: Go to Vercel Dashboard
1. Go to https://vercel.com/your-username/pos-production
2. Click on your project
3. Go to **Settings** tab

### Step 2: Configure Root Directory
1. In Settings, scroll to **Build & Development Settings**
2. Find **Root Directory**
3. Choose **"Other"** or **"mvp"** depending on your setup

#### Option A: Root Directory = "mvp"
If you set Root Directory to "mvp":
- Vercel will automatically look for files in the `mvp/` folder
- Delete the root `vercel.json` file
- Keep `mvp/vercel.json`

#### Option B: Root Directory = "." (root)
If you set Root Directory to "." (root):
- Keep the root `vercel.json` file
- The file is already configured to build from `mvp/`

### Recommended: Use "mvp" as Root Directory

#### Steps:
1. Delete the root `vercel.json` file:
   ```bash
   rm vercel.json
   rm package.json
   git add -A
   git commit -m "Remove root config files, use mvp as root"
   git push
   ```

2. In Vercel Dashboard:
   - Go to Settings → General
   - Find "Root Directory"
   - Set to: `mvp`
   - Click "Save"

3. Redeploy:
   - Go to Deployments tab
   - Click the three dots on latest deployment
   - Click "Redeploy"

## Alternative: Configure in Vercel Dashboard

### Method 1: Using Dashboard
1. Go to Project Settings
2. Under **Build & Development Settings**
3. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `mvp`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Method 2: Add `.vercelignore`
Create a `.vercelignore` file in the root:
```
architecture-diagram.md
migration-guide.md
.gitignore
```

This tells Vercel to ignore these files.

## Verify Deployment

After configuration:

1. Check deployment logs for:
   - ✅ Build command running successfully
   - ✅ No 404 errors
   - ✅ Output directory has files

2. Visit your Vercel URL
3. Should see your dashboard, not a 404

## Common Issues

### Issue: Still getting 404
**Solution:** Make sure Root Directory is set to `mvp` in Vercel settings

### Issue: Build fails
**Solution:** Check that `mvp/package.json` exists and has correct scripts

### Issue: Can't find module
**Solution:** Make sure `mvp/node_modules` is not committed (in .gitignore)

## Quick Fix Commands

If you want to use the root directory approach:

```bash
# Delete root config if using mvp as root
rm vercel.json package.json

# Or keep them if using root as root
```

Then configure in Vercel dashboard which approach you want to use.

## Which Approach to Use?

**Use "mvp" as Root Directory** (Recommended)
- Simpler configuration
- Only one `vercel.json` file
- Less file clutter in root

**Use "." as Root Directory**
- Keep all configs in root
- Better for monorepos
- More flexible for future changes

## Current Configuration

Your project structure:
```
pos-production/
├── vercel.json (new - for root directory approach)
├── package.json (new - for root directory approach)
├── mvp/
│   ├── vercel.json (original)
│   ├── package.json (main project)
│   ├── src/
│   └── dist/ (build output)
```

**Action Required:**
Choose one approach and configure in Vercel Dashboard.
