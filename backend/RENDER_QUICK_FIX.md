# Quick Fix: Render "Cannot find module" Error

## The Problem

Error: `Cannot find module '/opt/render/project/src/backend/dist/index.js'`

This means Render can't find your `dist/index.js` file because the **Root Directory** is not set correctly.

## Immediate Fix (2 minutes)

### In Render Dashboard:

1. Go to your service → **Settings** tab
2. Scroll to **Build & Deploy** section
3. Find **Root Directory** field
4. Set it to: `backend` (exactly this, nothing else)
5. Verify **Start Command** is: `node dist/index.js`
6. Click **Save Changes**
7. Go to **Manual Deploy** → **Deploy latest commit**

## Why This Happens

The error path `/opt/render/project/src/backend/dist/index.js` shows Render is looking in the wrong place because:

- Render clones your repo to `/opt/render/project/src/`
- If Root Directory is **empty** or **wrong**, it tries to run from `/opt/render/project/src/`
- It then looks for `backend/dist/index.js` relative to that path
- But if Root Directory is set to `backend`, Render changes to `/opt/render/project/src/backend/`
- Then `node dist/index.js` works because it's relative to the backend folder

## Correct Configuration

| Setting | Value |
|---------|-------|
| **Environment** | `Node` |
| **Root Directory** | `backend` |
| **Build Command** | `npm install --production` |
| **Start Command** | `node dist/index.js` |

## Verify It's Fixed

After updating and deploying, check the logs. You should see:

```
✓ npm install --production completed
✓ Running 'node dist/index.js'
✓ Server running on port 10000
✓ MongoDB Connected successfully
```

If you still see errors, the dist folder might not be in Git. Check with:

```bash
git ls-files backend/dist/index.js
```

If it returns nothing, run:

```bash
cd backend
npm run build
cd ..
git add -f backend/dist/
git commit -m "Add dist folder"
git push
```

Then redeploy on Render.


