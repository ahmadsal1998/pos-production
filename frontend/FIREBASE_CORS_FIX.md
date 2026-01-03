# Firebase Storage CORS Fix for Production

This guide addresses the CORS error occurring when uploading logos to Firebase Storage from your Vercel deployment.

## Problem

When uploading logos in production, you get:
```
Access to XMLHttpRequest has been blocked by CORS policy
Response to preflight request doesn't pass access control check
POST https://firebasestorage.googleapis.com/... net::ERR_FAILED
```

The URL pattern `/b//o` indicates an **empty storageBucket name**, which is the primary issue.

## Root Causes

1. **Missing Environment Variables on Vercel**: `VITE_FIREBASE_STORAGE_BUCKET` is missing or empty
2. **Firebase Storage CORS Not Configured**: CORS must be configured to allow your Vercel domain

## Solution

### Step 1: Verify Firebase Environment Variables on Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Verify ALL of these variables are set:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com  ← CRITICAL: Must not be empty!
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important**: 
- The `storageBucket` value should be exactly `your-project.appspot.com` (no `gs://` prefix)
- Check that the variable name is exactly `VITE_FIREBASE_STORAGE_BUCKET` (case-sensitive)
- After adding/updating variables, you **must redeploy** the application

### Step 2: Configure Firebase Storage CORS

Firebase Storage requires CORS configuration when accessing from web browsers. Use Google Cloud Console to configure it:

#### Option A: Using gcloud CLI (Recommended)

1. **Install Google Cloud SDK** (if not already installed):
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Get your storage bucket name**:
   - From Firebase Console → Storage → Files tab
   - Or from your environment variable `VITE_FIREBASE_STORAGE_BUCKET`
   - It should look like: `your-project.appspot.com`

4. **Create a CORS configuration file** (or use the provided `firebase-cors-config.json` in the frontend directory):
   
   The file `firebase-cors-config.json` is already in your project. You can use it directly:
   ```bash
   gsutil cors set firebase-cors-config.json gs://YOUR_STORAGE_BUCKET
   ```
   
   Or create your own `cors.json` with:
   ```json
   [
     {
       "origin": ["https://pos-production.vercel.app", "https://*.vercel.app"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "responseHeader": ["Content-Type", "Authorization", "x-goog-*"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

5. **Apply CORS configuration**:
   ```bash
   # Using the provided config file (from frontend directory)
   cd frontend
   gsutil cors set firebase-cors-config.json gs://YOUR_STORAGE_BUCKET
   
   # Or using your own config file
   gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET
   ```

   Replace `YOUR_STORAGE_BUCKET` with your actual bucket name (e.g., `your-project.appspot.com`)

6. **Verify CORS is set**:
   ```bash
   gsutil cors get gs://YOUR_STORAGE_BUCKET
   ```

#### Option B: Using Firebase Console (Manual)

Unfortunately, Firebase Console doesn't provide a direct UI for CORS configuration. You must use the gcloud CLI (Option A) or Google Cloud Console.

#### Option C: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **Cloud Storage** → **Buckets**
4. Click on your storage bucket (usually `your-project.appspot.com`)
5. Go to the **Configuration** tab
6. Scroll to **CORS configuration**
7. Click **Edit CORS configuration**
8. Add the CORS configuration (see `firebase-cors-config.json` in the frontend directory):
   ```json
   [
     {
       "origin": ["https://pos-production.vercel.app", "https://*.vercel.app"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "responseHeader": ["Content-Type", "Authorization", "x-goog-*"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
   
   **Tip**: Copy the contents from `frontend/firebase-cors-config.json` for convenience.
9. Click **Save**

### Step 3: Verify Firebase Storage Security Rules

While not directly related to CORS, ensure your Storage rules allow uploads:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Storage** → **Rules**
4. Verify rules allow authenticated uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read for all authenticated users
    match /{allPaths=**} {
      allow read: if request.auth != null;
    }
    
    // Allow uploads for logos
    match /logos/{storeId}/{fileName} {
      allow write: if request.auth != null 
                   && request.resource.size < 2 * 1024 * 1024 // 2MB limit
                   && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
  }
}
```

**Note**: If you're using custom authentication (JWT tokens from your backend), you may need to adjust these rules. The Firebase SDK handles authentication automatically when configured correctly.

### Step 4: Redeploy on Vercel

After setting environment variables:

1. Go to your Vercel project
2. Navigate to **Deployments**
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger a new deployment

### Step 5: Test

1. Open your production app: `https://pos-production.vercel.app`
2. Go to Settings → Preferences
3. Try uploading a logo
4. Check browser console for errors
5. Verify the logo appears after upload

## Troubleshooting

### Issue: Still getting CORS error after setting environment variables

**Solutions**:
1. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Verify the environment variable names are exactly correct (case-sensitive)
3. Ensure you redeployed after adding environment variables
4. Check Vercel deployment logs to verify variables are being read
5. Verify CORS is actually set using: `gsutil cors get gs://YOUR_STORAGE_BUCKET`

### Issue: URL still shows `/b//o` (empty bucket name)

**Solutions**:
1. Double-check `VITE_FIREBASE_STORAGE_BUCKET` is set in Vercel
2. The value should be just the bucket name (e.g., `my-project.appspot.com`), NOT:
   - `gs://my-project.appspot.com` ❌
   - `https://my-project.appspot.com` ❌
   - Just `my-project.appspot.com` ✅
3. Redeploy after setting the variable

### Issue: CORS configuration not working

**Solutions**:
1. Verify you're using the correct bucket name (check in Firebase Console → Storage)
2. Ensure you're authenticated with gcloud: `gcloud auth login`
3. Check that your project is set: `gcloud config set project YOUR_PROJECT_ID`
4. Try adding your localhost for testing:
   ```json
   "origin": [
     "https://pos-production.vercel.app",
     "https://*.vercel.app",
     "http://localhost:3000",
     "http://localhost:5173"
   ]
   ```

### Issue: "Permission denied" error

**Solutions**:
1. Check Firebase Storage security rules (Step 3)
2. Verify your Firebase project is correctly configured
3. Check that the user is authenticated (if using Firebase Auth)
4. If using custom JWT, ensure Firebase is configured to accept your tokens

## Quick Checklist

- [ ] All `VITE_FIREBASE_*` environment variables are set in Vercel
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` is not empty
- [ ] Storage bucket name is correct (no `gs://` or `https://` prefix)
- [ ] CORS is configured for `https://pos-production.vercel.app`
- [ ] Firebase Storage security rules allow uploads
- [ ] Application has been redeployed after setting environment variables
- [ ] Browser cache has been cleared
- [ ] Tested in production environment

## Additional Notes

- **Local development works** because Firebase SDK handles CORS differently for localhost
- **Production requires explicit CORS configuration** because browsers enforce CORS policies strictly for cross-origin requests
- The Firebase SDK (not XMLHttpRequest) is being used, which is correct - the issue is configuration, not code
- Environment variables must start with `VITE_` to be accessible in Vite applications

## Support

If issues persist:
1. Check browser console for detailed error messages
2. Check Vercel deployment logs
3. Verify Firebase Console → Storage → Files to see if uploads are reaching Firebase
4. Use `gsutil cors get gs://YOUR_BUCKET` to verify CORS configuration
5. Test with a minimal CORS configuration first (just your domain) before adding wildcards

