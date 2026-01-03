import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration
// These should be set as environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Validate Firebase configuration in production
if (import.meta.env.PROD) {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const missingVars = requiredVars.filter(
    (varName) => !import.meta.env[varName] || import.meta.env[varName].trim() === ''
  );

  if (missingVars.length > 0) {
    console.error('[Firebase] Missing required environment variables:', missingVars);
    console.error('[Firebase] Please set these variables in your deployment platform (e.g., Vercel)');
    console.error('[Firebase] See FIREBASE_CORS_FIX.md for setup instructions');
  }

  // Specifically check storageBucket (most critical for uploads)
  if (!firebaseConfig.storageBucket || firebaseConfig.storageBucket.trim() === '') {
    console.error('[Firebase] CRITICAL: VITE_FIREBASE_STORAGE_BUCKET is missing or empty!');
    console.error('[Firebase] This will cause CORS errors and upload failures.');
    console.error('[Firebase] The storageBucket should be: your-project.appspot.com');
  }
}

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error);
    throw error;
  }
} else {
  app = getApps()[0];
}

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

export default app;

