# Fixing "Invalid or Expired Token" Error on Render

## The Error

```
{
  "success": false,
  "message": "Invalid or expired token."
}
```

## Root Causes

The "Invalid or expired token" error on Render (while working locally) typically occurs due to:

1. **JWT_SECRET Mismatch**: Token was generated with a different secret than what's used for verification
2. **CLIENT_URL Misconfiguration**: Frontend URL not matching CORS configuration
3. **Token Generated Locally**: Token was created with local JWT_SECRET, but production uses different secret
4. **Environment Variable Not Loaded**: JWT_SECRET not properly set in Render environment

## Immediate Fixes

### 1. Update CLIENT_URL Environment Variable

**Current (WRONG):**
```
CLIENT_URL=http://localhost:5173
```

**Should be (CORRECT):**
```
CLIENT_URL=https://your-frontend-url.vercel.app
```

Replace `your-frontend-url.vercel.app` with your actual frontend deployment URL.

### 2. Verify JWT_SECRET is Set Correctly

In Render Dashboard → Your Service → Environment:
- Ensure `JWT_SECRET` is set and matches your local `.env` file
- The secret should be a long, random string (at least 32 characters)

### 3. Regenerate Tokens After Deployment

**IMPORTANT**: If you logged in locally before deploying, your token was generated with the local JWT_SECRET. After deploying with a different (or missing) JWT_SECRET, that token becomes invalid.

**Solution**: Log out and log back in on the production frontend to generate a new token with the production JWT_SECRET.

### 4. Check Environment Variables in Render

Verify all these are set in Render:

```bash
JWT_SECRET=110368f63ec606677273850d04cbb3d6e753d8291041b64651deac46600041d7422403befd2b3aab1378fbff83b212030e50edb51311f55df9997d913fc4229e
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-too
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
CLIENT_URL=https://your-frontend-url.vercel.app  # ⚠️ UPDATE THIS
MONGODB_URI=your-mongodb-uri
PORT=10000
NODE_ENV=production
```

## Step-by-Step Fix

### Step 1: Update CLIENT_URL in Render

1. Go to Render Dashboard → Your Backend Service → Environment
2. Find `CLIENT_URL` variable
3. Update it to your production frontend URL (e.g., `https://pos-production.vercel.app`)
4. Save changes
5. Redeploy the service

### Step 2: Verify JWT_SECRET

1. Check that `JWT_SECRET` in Render matches your local `.env` file
2. If they don't match, you'll need to:
   - Either update Render to match local (if you want to use existing tokens)
   - Or update local to match Render (recommended for production)
   - Then regenerate tokens by logging out/in

### Step 3: Clear Browser Storage and Re-login

1. Open your production frontend
2. Open browser DevTools → Application → Local Storage
3. Clear `auth-token` and `auth-storage` entries
4. Log out (if logged in)
5. Log back in to generate a new token with production JWT_SECRET

### Step 4: Check Backend Logs

After making changes, check Render logs for:

```
[JWT] Token expired: { expiredAt: ..., currentTime: ... }
[JWT] Invalid token: { message: ..., secretSet: true, secretLength: ... }
[Auth Middleware] Token verification failed: { error: ..., jwtSecretSet: true, ... }
```

These logs will tell you exactly why the token is failing.

## Common Issues and Solutions

### Issue 1: Token Generated with Different Secret

**Symptom**: Works locally, fails in production

**Solution**: 
- Ensure JWT_SECRET is identical in both environments
- Regenerate token by logging out/in on production

### Issue 2: CLIENT_URL Mismatch

**Symptom**: CORS errors or authentication failures

**Solution**: 
- Update CLIENT_URL to match your production frontend URL
- Ensure no trailing slash (or consistent trailing slash)

### Issue 3: Environment Variable Not Loaded

**Symptom**: Token verification fails with "Invalid token"

**Solution**:
- Verify JWT_SECRET is set in Render environment variables
- Check for typos or extra spaces
- Redeploy after setting environment variables

### Issue 4: Token Expired

**Symptom**: "Token expired" error

**Solution**:
- Check JWT_EXPIRE setting (should be `7d`)
- Log out and log back in to get a new token
- Implement token refresh mechanism

## Enhanced Logging

The updated code now provides detailed logging:

- **JWT Errors**: Specific error type (expired, invalid, etc.)
- **Auth Middleware**: Token length, secret status, environment info
- **CORS**: Origin checking and CLIENT_URL matching

Check Render logs after making requests to see detailed error information.

## Verification Checklist

- [ ] CLIENT_URL updated to production frontend URL
- [ ] JWT_SECRET matches between local and production
- [ ] All environment variables set in Render
- [ ] Backend service redeployed after env var changes
- [ ] Cleared browser storage and re-logged in
- [ ] Checked Render logs for detailed error messages
- [ ] Tested authentication on production frontend

## Testing

After applying fixes:

1. **Clear browser storage** on production frontend
2. **Log in** to generate a new token
3. **Test API calls** (e.g., search for product)
4. **Check Render logs** for any errors
5. **Verify token** is being sent in Authorization header

## Expected Behavior

After fixes:

- ✅ Login works on production
- ✅ API calls succeed with valid token
- ✅ No "Invalid or expired token" errors
- ✅ CORS allows requests from production frontend
- ✅ Logs show successful token verification

## If Issues Persist

1. **Check Render Logs**: Look for detailed JWT error messages
2. **Verify Token**: Decode token at jwt.io to check expiration and payload
3. **Compare Secrets**: Ensure JWT_SECRET is identical in both environments
4. **Test Directly**: Use curl to test authentication:

```bash
# Login to get token
curl -X POST "https://your-backend.onrender.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'

# Use token in API call
curl -X GET "https://your-backend.onrender.com/api/products" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

