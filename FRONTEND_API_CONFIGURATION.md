# Frontend API Configuration

## Problem

The frontend is making API calls to the wrong URL, resulting in 405 errors:
```
POST https://pos-production.vercel.app/api/auth/forgot-password 405 (Method Not Allowed)
```

This happens because `VITE_API_URL` is not configured in Vercel.

## Solution

You need to configure the `VITE_API_URL` environment variable in Vercel to point to your Render backend.

## Steps to Fix

### 1. Get Your Render Backend URL

First, deploy your backend to Render or get your existing Render URL:
- Example: `https://pos-backend.onrender.com`
- Or: `https://your-app-name.onrender.com`

### 2. Configure Vercel Environment Variable

#### Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `pos-production`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Configure:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.onrender.com/api`
   - **Environment**: Select all (Production, Preview, Development)
   - **Note**: Make sure to add `/api` at the end!
6. Click **Save**
7. **Important**: Redeploy your application for changes to take effect

#### Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login
vercel login

# Set environment variable
vercel env add VITE_API_URL production
# Enter: https://your-backend-url.onrender.com/api
# Repeat for preview and development

# Pull environment to local
vercel env pull
```

### 3. Redeploy Frontend

After setting the environment variable:

**Via Dashboard**:
1. Go to your project's **Deployments** tab
2. Find the latest deployment
3. Click the three dots (⋮)
4. Select **Redeploy**

**Via CLI**:
```bash
vercel --prod
```

### 4. Verify Configuration

1. Build locally to test:
   ```bash
   cd frontend
   npm run build
   ```

2. The build should use your environment variable

3. Check deployed site's network tab - API calls should go to Render URL

## How It Works

The frontend uses this configuration in `src/lib/api/client.ts`:

```typescript
export const apiClient = new ApiClient(
  (import.meta as any).env?.VITE_API_URL || '/api'
);
```

- If `VITE_API_URL` is set: Uses your Render backend
- If not set: Falls back to `/api` (relative URL, goes to Vercel)

## Local Development

For local development, create a `.env` file in `frontend/`:

```bash
cd frontend
cat > .env.local << EOF
VITE_API_URL=http://localhost:5000/api
EOF
```

Then run:
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://pos-backend.onrender.com/api` |

**Important Notes**:
- Vite requires `VITE_` prefix for environment variables
- Variables are embedded at **build time**, not runtime
- You must **rebuild** after changing environment variables
- Always include `/api` suffix in the URL

## Complete Setup Example

### Backend on Render
```
https://pos-backend.onrender.com
```

### Frontend on Vercel
```
Production URL: https://pos-production.vercel.app
```

### Environment Variable
```
VITE_API_URL=https://pos-backend.onrender.com/api
```

### Result
- Frontend: `https://pos-production.vercel.app`
- API calls go to: `https://pos-backend.onrender.com/api`
- Login works ✅
- Forgot password works ✅

## Troubleshooting

### Still Getting 405 Errors

1. Verify environment variable is set:
   - Vercel Dashboard → Settings → Environment Variables
   - Look for `VITE_API_URL`

2. Verify the URL is correct:
   - Should include `https://`
   - Should include `/api` at the end
   - Should be your Render backend URL

3. Redeploy after changes:
   - Environment variables are embedded at build time
   - Must redeploy to take effect

4. Check backend is running:
   ```bash
   curl https://your-backend.onrender.com/health
   ```

### CORS Errors

If you see CORS errors:
1. Check Render environment variable `CLIENT_URL`
2. Should be: `https://pos-production.vercel.app`
3. No trailing slash!
4. Redeploy backend after changes

### Build Errors

If Vite can't find environment variables:
1. Make sure variable name starts with `VITE_`
2. Redeploy after adding variables
3. Check Vercel build logs for errors

## Quick Checklist

- [ ] Backend deployed to Render
- [ ] Backend URL obtained
- [ ] `VITE_API_URL` set in Vercel to `https://your-backend.onrender.com/api`
- [ ] Frontend redeployed
- [ ] Tested login functionality
- [ ] Tested forgot password
- [ ] No 405 errors in console

## Next Steps

After configuring:
1. ✅ Test all authentication flows
2. ✅ Test API calls from frontend
3. ✅ Monitor logs for errors
4. ✅ Update documentation

---

**Status**: Configuration required in Vercel  
**Estimated Fix Time**: 5 minutes  
**Difficulty**: ⭐☆☆☆☆ (Easy)

