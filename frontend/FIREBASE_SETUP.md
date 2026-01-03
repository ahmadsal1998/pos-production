# Firebase Storage Setup for Store Logos

This guide explains how to set up Firebase Storage for storing store logos in the POS system.

## Overview

Store logos are now stored in Firebase Storage instead of localStorage, allowing:
- **Persistence across devices**: Logos are stored in the cloud, accessible from any device
- **No size limitations**: Firebase Storage handles large files efficiently
- **Better performance**: Logos are loaded on-demand from Firebase
- **Centralized management**: All store logos in one place

## Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Firebase Storage enabled in your Firebase project
3. Firebase Storage security rules configured (see below)

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Enable Firebase Storage

1. In your Firebase project, go to **Storage** in the left sidebar
2. Click **Get started**
3. Choose **Start in test mode** (we'll update rules later)
4. Select a location for your storage bucket
5. Click **Done**

### 3. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app (give it a nickname)
5. Copy the Firebase configuration object

You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. Set Environment Variables

Create a `.env` file in the `frontend` directory (or add to your existing `.env`):

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important**: 
- All variables must start with `VITE_` to be accessible in the frontend
- Replace the values with your actual Firebase configuration
- For production, set these in your deployment platform (Vercel, Netlify, etc.)

### 5. Configure Firebase Storage Security Rules

1. In Firebase Console, go to **Storage** → **Rules**
2. Update the rules to allow authenticated users to upload/read logos:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read any file
    match /{allPaths=**} {
      allow read: if request.auth != null;
    }
    
    // Allow authenticated users to upload logos for their store
    match /logos/{storeId}/{fileName} {
      allow write: if request.auth != null 
                   && request.resource.size < 2 * 1024 * 1024 // 2MB limit
                   && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
  }
}
```

**Note**: For production, you may want to add more specific rules based on your authentication system.

### 6. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to Settings → Preferences
3. Try uploading a logo
4. Check the browser console for Firebase logs
5. Verify the logo appears on receipts

## File Structure

Logos are stored in Firebase Storage with the following structure:
```
logos/
  └── {storeId}/
      └── logo.{extension}
```

Example:
```
logos/
  └── store-123/
      └── logo.png
```

## Troubleshooting

### Issue: "Firebase: Error (auth/unauthorized)"

**Solution**: 
- Check that Firebase Storage security rules allow authenticated users
- Verify your Firebase configuration is correct
- Make sure the user is authenticated

### Issue: Logo not appearing on receipt

**Solution**:
1. Check browser console for errors
2. Verify `logoUrl` in settings contains a Firebase URL
3. Check Firebase Storage to see if the file was uploaded
4. Verify CORS settings if accessing from a different domain

### Issue: CORS error in production (Access to XMLHttpRequest has been blocked)

**Solution**: 
- This is a common issue when deploying to production (Vercel, Netlify, etc.)
- See **FIREBASE_CORS_FIX.md** for detailed instructions
- Main causes:
  1. Missing `VITE_FIREBASE_STORAGE_BUCKET` environment variable (causes `/b//o` URL pattern)
  2. Firebase Storage CORS not configured for your production domain
- Quick fix:
  1. Set all `VITE_FIREBASE_*` environment variables in your deployment platform
  2. Configure CORS using gcloud CLI: `gsutil cors set cors.json gs://YOUR_BUCKET`
  3. Redeploy your application

### Issue: Upload fails with "Permission denied"

**Solution**:
- Update Firebase Storage security rules (see step 5)
- Ensure the user is authenticated
- Check file size (must be < 2MB)

### Issue: Environment variables not loading

**Solution**:
- Ensure all variables start with `VITE_`
- Restart the development server after adding variables
- For production, set variables in your deployment platform
- Rebuild the application after changing environment variables

## Production Deployment

### Vercel
1. Go to your project → Settings → Environment Variables
2. Add all `VITE_FIREBASE_*` variables
3. Redeploy your application

### Netlify
1. Go to Site settings → Environment variables
2. Add all `VITE_FIREBASE_*` variables
3. Redeploy your application

### Other Platforms
Set the environment variables in your platform's configuration and rebuild.

## Backward Compatibility

The system supports both:
- **Firebase URLs**: New logos uploaded to Firebase Storage
- **Base64 data URLs**: Old logos stored in localStorage (for backward compatibility)

When a logo is loaded:
1. If it's a Firebase URL → Load from Firebase Storage
2. If it's a base64 data URL → Use directly (backward compatibility)
3. If it's empty → Show default logo

## Security Considerations

1. **Authentication**: Ensure only authenticated users can upload logos
2. **File Size**: Limit uploads to 2MB (enforced in code and Firebase rules)
3. **File Type**: Only image files are allowed
4. **Store Isolation**: Each store can only upload/delete its own logo
5. **Storage Rules**: Regularly review and update Firebase Storage security rules

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify Firebase configuration
3. Check Firebase Storage rules
4. Review environment variables

