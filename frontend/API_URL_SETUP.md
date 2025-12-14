# Setting Up API URL for Production Deployment

## The Problem

When deploying to production (Vercel), the frontend is getting 404 errors for API calls like:

```
[POS] Error searching product by barcode: {message: 'Route not found', status: 404}
```

This happens because the frontend is trying to call `/api/products/barcode/1` on the **frontend domain** (Vercel) instead of the **backend domain** (Render).

## Root Cause

In development, Vite proxies `/api` requests to `http://localhost:5001`. In production, there's no proxy, so `/api` requests go to the frontend domain, resulting in 404 errors.

## Solution: Set VITE_API_URL Environment Variable

### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend.onrender.com/api`
   - **Environment**: Production (and Preview if needed)
4. Replace `your-backend.onrender.com` with your actual Render backend URL
5. **Redeploy** your frontend application

### Example:

If your Render backend URL is `https://pos-backend-abc123.onrender.com`, set:

```
VITE_API_URL=https://pos-backend-abc123.onrender.com/api
```

**Important**: Include `/api` at the end of the URL.

## How It Works

The API client checks for `VITE_API_URL`:

```typescript
// Development: Uses '/api' (proxied by Vite)
// Production: Uses VITE_API_URL if set, otherwise '/api' (which fails)
const apiClient = new ApiClient(VITE_API_URL || '/api');
```

## Verification

After setting `VITE_API_URL` and redeploying:

1. Open browser DevTools → Console
2. Look for: `[API Client] Using VITE_API_URL: https://your-backend.onrender.com/api`
3. Test a barcode search - it should work now
4. Check Network tab - API calls should go to your Render backend URL

## Troubleshooting

### Issue 1: Still Getting 404

**Check:**
- Is `VITE_API_URL` set correctly in Vercel?
- Did you redeploy after setting the variable?
- Is the backend URL correct (including `/api` at the end)?
- Check browser console for `[API Client]` logs

### Issue 2: CORS Errors

**Solution:**
- Update `CLIENT_URL` in Render backend to your Vercel frontend URL
- Ensure CORS is configured correctly in backend

### Issue 3: Environment Variable Not Loading

**Check:**
- Variable name is exactly `VITE_API_URL` (case-sensitive)
- Variable is set for the correct environment (Production/Preview)
- Frontend was rebuilt after setting the variable (Vite env vars are baked into build)

## Quick Checklist

- [ ] `VITE_API_URL` set in Vercel environment variables
- [ ] Value is `https://your-backend.onrender.com/api` (with `/api`)
- [ ] Variable set for Production environment
- [ ] Frontend redeployed after setting variable
- [ ] Backend `CLIENT_URL` set to frontend URL
- [ ] Tested barcode search - works correctly
- [ ] Checked browser console - no API URL warnings

## Example Configuration

### Vercel (Frontend):
```
VITE_API_URL=https://pos-backend-abc123.onrender.com/api
```

### Render (Backend):
```
CLIENT_URL=https://pos-production.vercel.app
JWT_SECRET=your-secret
MONGODB_URI=your-mongodb-uri
PORT=10000
NODE_ENV=production
```

## Additional Notes

- Vite environment variables must start with `VITE_` to be exposed to the client
- Environment variables are baked into the build at build time
- You must **redeploy** after changing environment variables
- The `/api` path is part of your backend Express routes, so include it in `VITE_API_URL`

