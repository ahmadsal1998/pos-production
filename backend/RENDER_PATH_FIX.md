# Fixing Render "Cannot find module" Error

## The Error

```
Error: Cannot find module '/opt/render/project/src/backend/dist/index.js'
```

## Root Cause

The error path `/opt/render/project/src/backend/dist/index.js` indicates that Render's working directory structure doesn't match your Root Directory setting.

## Solution

### Step 1: Verify Root Directory in Render Dashboard

1. Go to your Render service → **Settings**
2. Scroll to **Build & Deploy** section
3. Check the **Root Directory** field:
   - ✅ Should be: `backend` (not empty, not `src/backend`, not `/backend`)
   - ❌ Wrong: Empty, `src/backend`, `/backend`, or any other value

### Step 2: Verify Start Command

The **Start Command** should be:
```
node dist/index.js
```

**NOT:**
- `node backend/dist/index.js` (if Root Directory is `backend`)
- `npm start` (unless package.json start script is correct)
- `node src/dist/index.js`

### Step 3: Verify dist/ Folder is in Git

Check that `backend/dist/` is committed:

```bash
git ls-files backend/dist/ | head -5
```

If no files are listed, the dist folder wasn't committed. Run:

```bash
cd backend
npm run build
cd ..
git add -f backend/dist/
git commit -m "Add dist folder"
git push
```

### Step 4: Check Repository Structure

When Root Directory is set to `backend`, Render will:
- Clone repo to `/opt/render/project/src/`
- Change directory to `/opt/render/project/src/backend/`
- Run commands from that directory

So `node dist/index.js` should work because it's relative to `/opt/render/project/src/backend/`.

## Common Issues

### Issue 1: Root Directory is Empty

**Symptom:** Error shows `/opt/render/project/src/backend/dist/index.js`

**Fix:** Set Root Directory to `backend` in Render dashboard

### Issue 2: Root Directory is Wrong

**Symptom:** Same error, but Root Directory is set to something like `src/backend`

**Fix:** Change Root Directory to just `backend`

### Issue 3: dist/ Folder Not in Git

**Symptom:** Build succeeds but start command fails

**Fix:** 
```bash
cd backend
npm run build
cd ..
git add -f backend/dist/
git commit -m "Add dist folder for deployment"
git push
```

### Issue 4: Wrong Start Command

**Symptom:** Path errors or module not found

**Fix:** Use `node dist/index.js` (relative to Root Directory)

## Verification Checklist

- [ ] Root Directory in Render: `backend`
- [ ] Start Command: `node dist/index.js`
- [ ] Build Command: `npm install --production`
- [ ] `backend/dist/index.js` exists in Git repository
- [ ] `backend/dist/server.js` exists in Git repository
- [ ] Environment: `Node` (not Docker)

## Quick Fix Script

Run this to verify and fix:

```bash
#!/bin/bash
# Verify dist folder is ready

cd backend

# Build if needed
if [ ! -d "dist" ]; then
    echo "Building backend..."
    npm install
    npm run build
fi

# Check key files
if [ ! -f "dist/index.js" ]; then
    echo "❌ dist/index.js not found!"
    exit 1
fi

if [ ! -f "dist/server.js" ]; then
    echo "❌ dist/server.js not found!"
    exit 1
fi

echo "✅ dist folder is ready"

# Check if in Git
cd ..
if git ls-files backend/dist/index.js > /dev/null 2>&1; then
    echo "✅ dist/index.js is in Git"
else
    echo "⚠️  dist/index.js not in Git, adding..."
    git add -f backend/dist/
    git commit -m "Add dist folder for Render deployment"
    echo "✅ Committed. Now run: git push"
fi
```

## After Fixing

1. Update Root Directory in Render dashboard to `backend`
2. Verify Start Command is `node dist/index.js`
3. Save changes
4. Deploy latest commit
5. Check logs - should see: `Server running on port 10000`

