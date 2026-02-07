import { apiClient } from '../client';

export const storeSettingsApi = {
  getSettings: () =>
    apiClient.get<{ success: boolean; data: { settings: Record<string, string>; settingsList: any[] } }>('/settings'),

  getSetting: (key: string) =>
    apiClient.get<{ success: boolean; data: { setting: any } }>(`/settings/${key}`),

  updateSetting: (key: string, data: { value: string; description?: string }) =>
    apiClient.put<{ success: boolean; message: string; data: { setting: any } }>(`/settings/${key}`, data),
};
