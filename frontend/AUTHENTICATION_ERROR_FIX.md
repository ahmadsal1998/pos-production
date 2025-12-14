# Fixing "Authentication required" Error

## The Error

```
{"success":false,"message":"Authentication required. Please provide a valid token."}
```

This error occurs when the backend receives a request without a valid authentication token.

## Common Causes

### 1. Token Not in localStorage

**Symptom**: No token stored after login

**Solution**:
- Log out and log back in
- Check browser DevTools → Application → Local Storage
- Look for `auth-token` key
- If missing, the login process isn't storing the token correctly

### 2. Token Expired

**Symptom**: Token exists but is expired

**Solution**:
- The enhanced error handling will now detect expired tokens
- Check browser console for: `[API Client] Token has expired`
- Log out and log back in to get a new token
- Default token expiration is 7 days (configurable via `JWT_EXPIRE`)

### 3. Token Invalid (JWT_SECRET Mismatch)

**Symptom**: Token exists but backend rejects it

**Solution**:
- Ensure `JWT_SECRET` in Render matches your local `.env`
- If they don't match, tokens generated locally won't work in production
- Log out and log back in on production to generate a new token with production JWT_SECRET

### 4. Token Not Being Sent

**Symptom**: Token exists but request doesn't include Authorization header

**Solution**:
- Check browser Network tab → Request Headers
- Look for `Authorization: Bearer <token>`
- If missing, there's an issue with the API client interceptor

## Enhanced Error Handling

The updated API client now:

1. **Logs warnings** when token is missing for API requests
2. **Detects expired tokens** and clears them automatically
3. **Auto-redirects to login** on 401 errors
4. **Provides detailed error messages** in console

## Debugging Steps

### Step 1: Check Browser Console

After the error, check the console for:

```
[API Client] ⚠️ No auth token found in localStorage for request: /api/products/barcode/1
```

or

```
[API Client] ❌ Authentication failed (401): { url: '/api/products/barcode/1', hasToken: true }
[API Client] Token has expired: { expiredAt: '...', currentTime: '...' }
```

### Step 2: Check localStorage

Open browser DevTools → Application → Local Storage:

1. Look for `auth-token` key
2. If it exists, copy the value
3. Decode it at jwt.io to check:
   - Expiration date (`exp`)
   - Store ID (`storeId`)
   - User ID (`userId`)

### Step 3: Check Network Tab

1. Open Network tab in DevTools
2. Find the failed request (e.g., `/api/products/barcode/1`)
3. Check Request Headers:
   - Should have: `Authorization: Bearer <token>`
   - If missing: Token not being sent

### Step 4: Verify Token Validity

If token exists, verify it's valid:

```javascript
// In browser console
const token = localStorage.getItem('auth-token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Expires at:', new Date(payload.exp * 1000));
  console.log('Is expired:', Date.now() > payload.exp * 1000);
}
```

## Solutions

### Solution 1: Clear and Re-login

1. Open browser DevTools → Application → Local Storage
2. Delete `auth-token` and `auth-storage` entries
3. Log out (if logged in)
4. Log back in to get a fresh token

### Solution 2: Verify JWT_SECRET

1. Check Render backend environment variables
2. Ensure `JWT_SECRET` is set correctly
3. Ensure it matches your local `.env` (if you want to use existing tokens)
4. Or use different secrets and regenerate tokens

### Solution 3: Check Token Storage

Verify the login process stores the token:

1. Log in
2. Check localStorage for `auth-token`
3. If missing, check the login code in `frontend/src/app/store/index.ts`
4. Ensure `localStorage.setItem('auth-token', token)` is called

### Solution 4: Verify API Client Configuration

Check that the API client is correctly configured:

1. Verify `VITE_API_URL` is set correctly
2. Check that the API client interceptor is adding the token
3. Look for any CORS issues that might strip headers

## Expected Behavior

After fixes, you should see:

**In Console (when token is present):**
- No warnings about missing token
- Successful API requests

**In Network Tab:**
- Request headers include: `Authorization: Bearer <token>`
- Responses are 200 OK (not 401)

**In localStorage:**
- `auth-token` key exists with a valid JWT token

## Quick Fix Checklist

- [ ] Check browser console for error messages
- [ ] Verify `auth-token` exists in localStorage
- [ ] Check token expiration (decode at jwt.io)
- [ ] Verify `JWT_SECRET` matches between environments
- [ ] Clear localStorage and re-login
- [ ] Check Network tab for Authorization header
- [ ] Verify `VITE_API_URL` is set correctly

## If Issues Persist

1. **Check Render Backend Logs**: Look for authentication-related errors
2. **Verify CORS Configuration**: Ensure CORS allows Authorization header
3. **Test Token Manually**: Use curl to test with the token:

```bash
curl -X GET "https://your-backend.onrender.com/api/products/barcode/1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

4. **Check Token Format**: Ensure token is a valid JWT (three parts separated by dots)

The enhanced error handling will now provide more detailed information to help diagnose the issue.

