import { ref, uploadBytes, getDownloadURL, deleteObject, UploadResult } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload store logo to Firebase Storage
 * @param file - The image file to upload
 * @param storeId - The store ID (used for file path)
 * @returns Promise with the download URL
 */
export const uploadStoreLogo = async (file: File, storeId: string): Promise<string> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Only image files are allowed.');
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 2MB.');
    }

    // Create storage reference with store-specific path
    const normalizedStoreId = storeId.toLowerCase().trim();
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `logos/${normalizedStoreId}/logo.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    // Upload file
    console.log('[Firebase] Uploading logo to:', fileName);
    const snapshot: UploadResult = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('[Firebase] Logo uploaded successfully. URL:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.error('[Firebase] Error uploading logo:', error);
    throw new Error(error.message || 'Failed to upload logo to Firebase Storage');
  }
};

/**
 * Delete store logo from Firebase Storage
 * @param logoUrl - The Firebase Storage URL of the logo to delete
 * @param storeId - The store ID (used to construct file path if URL is not available)
 * @returns Promise that resolves when deletion is complete
 */
export const deleteStoreLogo = async (logoUrl: string, storeId?: string): Promise<void> => {
  try {
    // If we have a Firebase Storage URL, extract the path from it
    // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    let storageRef;
    
    if (logoUrl.includes('firebasestorage.googleapis.com')) {
      // Extract path from Firebase URL
      const url = new URL(logoUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch && pathMatch[1]) {
        // Decode the path (Firebase URLs are URL-encoded)
        const decodedPath = decodeURIComponent(pathMatch[1]);
        storageRef = ref(storage, decodedPath);
      } else {
        throw new Error('Invalid Firebase Storage URL format');
      }
    } else if (storeId) {
      // Fallback: construct path from storeId
      const normalizedStoreId = storeId.toLowerCase().trim();
      // Try common extensions
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
      for (const ext of extensions) {
        try {
          const fileName = `logos/${normalizedStoreId}/logo.${ext}`;
          storageRef = ref(storage, fileName);
          await deleteObject(storageRef);
          console.log('[Firebase] Logo deleted successfully:', fileName);
          return;
        } catch (err: any) {
          // Continue to next extension if this one doesn't exist
          if (err.code !== 'storage/object-not-found') {
            throw err;
          }
        }
      }
      throw new Error('Logo file not found in Firebase Storage');
    } else {
      throw new Error('Cannot delete logo: missing storeId or invalid URL');
    }

    // Delete the file
    if (storageRef) {
      await deleteObject(storageRef);
      console.log('[Firebase] Logo deleted successfully');
    }
  } catch (error: any) {
    console.error('[Firebase] Error deleting logo:', error);
    // Don't throw - allow deletion to fail silently if file doesn't exist
    if (error.code === 'storage/object-not-found') {
      console.warn('[Firebase] Logo file not found - may have already been deleted');
      return;
    }
    throw new Error(error.message || 'Failed to delete logo from Firebase Storage');
  }
};

/**
 * Get store logo URL from Firebase Storage
 * @param storeId - The store ID
 * @returns Promise with the download URL, or null if logo doesn't exist
 */
export const getStoreLogoUrl = async (storeId: string): Promise<string | null> => {
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    // Try common extensions
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
    
    for (const ext of extensions) {
      try {
        const fileName = `logos/${normalizedStoreId}/logo.${ext}`;
        const storageRef = ref(storage, fileName);
        const url = await getDownloadURL(storageRef);
        console.log('[Firebase] Logo URL retrieved:', url);
        return url;
      } catch (err: any) {
        // Continue to next extension if this one doesn't exist
        if (err.code === 'storage/object-not-found') {
          continue;
        }
        throw err;
      }
    }
    
    // No logo found
    return null;
  } catch (error: any) {
    console.error('[Firebase] Error getting logo URL:', error);
    return null;
  }
};

