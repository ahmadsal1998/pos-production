import { SystemPreferences } from '@/features/user-management/types';

/**
 * Get the localStorage key for store-specific settings
 * @param storeId - The store ID (or 'default' if no storeId)
 * @returns The localStorage key
 */
const getSettingsKey = (storeId: string | null | undefined): string => {
  const id = storeId || 'default';
  return `pos_settings_${id.toLowerCase()}`;
};

/**
 * Get the current store ID from auth store
 * @returns The store ID or null
 */
const getCurrentStoreId = (): string | null => {
  try {
    // Try to get from zustand persisted store
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed?.state?.user?.storeId || null;
    }
  } catch (error) {
    console.error('Error reading storeId from auth storage:', error);
  }
  return null;
};

/**
 * Load system preferences from localStorage for the current store
 * @param storeId - Optional store ID (will be fetched from auth if not provided)
 * @returns SystemPreferences object or null if not found
 */
export const loadSettings = (storeId?: string | null): SystemPreferences | null => {
  try {
    const currentStoreId = storeId !== undefined ? storeId : getCurrentStoreId();
    const key = getSettingsKey(currentStoreId);
    const stored = localStorage.getItem(key);
    
    if (stored) {
      return JSON.parse(stored) as SystemPreferences;
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
  return null;
};

/**
 * Save system preferences to localStorage for the current store
 * @param settings - The SystemPreferences object to save
 * @param storeId - Optional store ID (will be fetched from auth if not provided)
 */
export const saveSettings = (settings: SystemPreferences, storeId?: string | null): void => {
  try {
    const currentStoreId = storeId !== undefined ? storeId : getCurrentStoreId();
    const key = getSettingsKey(currentStoreId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
    throw error;
  }
};

/**
 * Get a specific setting value from localStorage
 * @param key - The setting key to retrieve
 * @param defaultValue - Default value if setting not found
 * @param storeId - Optional store ID (will be fetched from auth if not provided)
 * @returns The setting value or defaultValue
 */
export const getSetting = <T = any>(
  key: keyof SystemPreferences,
  defaultValue: T,
  storeId?: string | null
): T => {
  const settings = loadSettings(storeId);
  if (settings && key in settings) {
    return settings[key] as T;
  }
  return defaultValue;
};

/**
 * Update a specific setting value in localStorage
 * @param key - The setting key to update
 * @param value - The new value
 * @param storeId - Optional store ID (will be fetched from auth if not provided)
 */
export const updateSetting = <K extends keyof SystemPreferences>(
  key: K,
  value: SystemPreferences[K],
  storeId?: string | null
): void => {
  const currentStoreId = storeId !== undefined ? storeId : getCurrentStoreId();
  const settings = loadSettings(currentStoreId);
  // If no settings exist, we need to create a partial settings object
  // Note: This will only have the one key, but that's okay for partial updates
  const updatedSettings: Partial<SystemPreferences> = settings 
    ? { ...settings, [key]: value }
    : { [key]: value } as Partial<SystemPreferences>;
  saveSettings(updatedSettings as SystemPreferences, currentStoreId);
};

/**
 * Clear all settings for a specific store
 * @param storeId - Optional store ID (will be fetched from auth if not provided)
 */
export const clearSettings = (storeId?: string | null): void => {
  try {
    const currentStoreId = storeId !== undefined ? storeId : getCurrentStoreId();
    const key = getSettingsKey(currentStoreId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing settings from localStorage:', error);
  }
};

/**
 * Get all settings keys for all stores (for debugging/admin purposes)
 * @returns Array of localStorage keys that match the settings pattern
 */
export const getAllSettingsKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pos_settings_')) {
      keys.push(key);
    }
  }
  return keys;
};
