import React, { useState, useEffect } from 'react';
import { SystemPreferences } from '@/features/user-management/types';
import { AR_LABELS } from '@/shared/constants';
import { PreferencesIcon, PrintIcon } from '@/shared/assets/icons';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { CURRENCIES, CurrencyConfig } from '@/shared/utils/currency';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { loadSettings, saveSettings } from '@/shared/utils/settingsStorage';
import { storeSettingsApi } from '@/lib/api/client';
import { 
  PrinterType, 
  getAvailablePrinterTypes, 
  getPrinterTypeDisplayName,
  applyPrinterConfig,
  checkSettingsMatch,
  getPrinterConfig
} from '@/shared/utils/printerConfig';

const initialPreferences: SystemPreferences = {
  // General
  businessName: '',
  logoUrl: '',
  defaultCurrency: '₪',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12-hour',
  defaultLanguage: 'ar',
  // Invoice & Sales
  vatPercentage: 0,
  invoiceNumberFormat: 'INV-{N}',
  invoiceFooterText: 'شكراً لتعاملكم معنا!',
  autoPrintInvoice: true,
  sellWithoutStock: false,
  allowSellingZeroStock: true,
  // User Roles
  sessionDuration: 60,
  allowUserCreation: true,
  // Inventory
  defaultUnits: 'قطعة, كرتون, صندوق',
  minStockLevel: 10,
  enableLowStockNotifications: true,
  // Payments
  allowCash: true,
  allowCard: true,
  allowCredit: true,
  // Notifications
  enableOverdueNotifications: true,
  enableAutoNotifications: false,
  // Other
  interfaceMode: 'light',
  // Print Settings
  printerType: undefined as any, // Will be set when user selects printer type
  printPaperSize: 'A4',
  printPaperWidth: 210,
  printPaperHeight: 297,
  printMarginTop: 0.8,
  printMarginBottom: 0.8,
  printMarginLeft: 0.8,
  printMarginRight: 0.8,
  printFontSize: 13,
  printTableFontSize: 12,
  printShowBorders: true,
  printCompactMode: false,
  // Business Day Configuration
  businessDayStartTime: '06:00', // Default: 6:00 AM
  businessDayTimezone: 'UTC', // Default timezone
  // Store Address
  storeAddress: '', // Store location/address for invoices
};

// Helpers to parse settings
const parseBoolean = (value: any, fallback: boolean) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const lower = String(value).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(lower);
};

const parseNumber = (value: any, fallback: number) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
};

const PreferencesPage: React.FC = () => {
  const { currency, updateCurrency, loading: currencyLoading } = useCurrency();
  const [prefs, setPrefs] = useState<SystemPreferences>(initialPreferences);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(currency.code);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsOverrideWarning, setSettingsOverrideWarning] = useState<{
    show: boolean;
    overriddenSettings: string[];
  }>({ show: false, overriddenSettings: [] });

  // Update selected currency when currency context changes
  useEffect(() => {
    if (!currencyLoading) {
      setSelectedCurrencyCode(currency.code);
    }
  }, [currency, currencyLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let updatedPrefs: SystemPreferences;
    
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        const { checked } = e.target;
        updatedPrefs = { ...prefs, [name]: checked };
        setPrefs(updatedPrefs);
    } else if (type === 'number') {
        // Convert number inputs to actual numbers (handles 0 correctly)
        const numValue = value === '' ? 0 : parseFloat(value);
        updatedPrefs = { ...prefs, [name]: isNaN(numValue) ? 0 : numValue };
        setPrefs(updatedPrefs);
    } else {
        updatedPrefs = { ...prefs, [name]: value };
        setPrefs(updatedPrefs);
    }
    
    // Check if this is a print setting change and if printer type is set
    const printSettingKeys = [
      'printPaperSize', 'printPaperWidth', 'printPaperHeight',
      'printMarginTop', 'printMarginBottom', 'printMarginLeft', 'printMarginRight',
      'printFontSize', 'printTableFontSize', 'printShowBorders', 'printCompactMode'
    ];
    
    if (printSettingKeys.includes(name) && (prefs as any).printerType) {
      // Check if settings still match printer config
      const matchResult = checkSettingsMatch((prefs as any).printerType, updatedPrefs);
      setSettingsOverrideWarning({
        show: !matchResult.matches,
        overriddenSettings: matchResult.overriddenSettings,
      });
    }
  };

  const handleToggleChange = (name: keyof SystemPreferences, enabled: boolean) => {
    const updatedPrefs = { ...prefs, [name]: enabled };
    setPrefs(updatedPrefs);
    
    // Check if this is a print setting change and if printer type is set
    const printSettingKeys = ['printShowBorders', 'printCompactMode'];
    if (printSettingKeys.includes(name) && (prefs as any).printerType) {
      const matchResult = checkSettingsMatch((prefs as any).printerType, updatedPrefs);
      setSettingsOverrideWarning({
        show: !matchResult.matches,
        overriddenSettings: matchResult.overriddenSettings,
      });
    }
  };
  
  // Function to reset print settings to printer defaults
  const handleResetToPrinterDefaults = () => {
    const printerType = (prefs as any).printerType as PrinterType | undefined;
    if (printerType) {
      const resetPrefs = applyPrinterConfig(printerType, prefs);
      setPrefs(resetPrefs as SystemPreferences);
      setSettingsOverrideWarning({ show: false, overriddenSettings: [] });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setLogoPreview(reader.result as string);
              setPrefs(prev => ({...prev, logoUrl: file.name})); // In real app, you'd upload and store URL
          };
          reader.readAsDataURL(file);
      }
  };

  // Load preferences from localStorage and backend
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const storedSettings = loadSettings();
        
        // Try to load settings from backend if not in localStorage
        let backendStoreAddress = '';
        let backendBusinessDayStartTime = '';
        let backendBusinessDayTimezone = '';
        try {
          const backendSettings = await storeSettingsApi.getSettings();
          
          // Handle nested response structure: backendSettings.data.data.settings
          let settingsData: Record<string, string> | null = null;
          
          if (backendSettings.data) {
            // Check for nested structure: data.data.settings
            if ('data' in backendSettings.data && backendSettings.data.data && 'settings' in backendSettings.data.data) {
              settingsData = (backendSettings.data.data as any).settings as Record<string, string>;
            }
            // Check for direct structure: data.settings
            else if ('settings' in backendSettings.data) {
              settingsData = backendSettings.data.settings as Record<string, string>;
            }
          }
          
          if (settingsData) {
            if (settingsData.storeaddress) {
              backendStoreAddress = settingsData.storeaddress;
            }
            if (settingsData.businessdaystarttime) {
              backendBusinessDayStartTime = settingsData.businessdaystarttime;
            }
            if (settingsData.businessdaytimezone) {
              backendBusinessDayTimezone = settingsData.businessdaytimezone;
            }
          }
        } catch (error) {
          console.warn('Failed to load settings from backend:', error);
          // Continue with localStorage settings
        }
        
        if (storedSettings) {
          // Merge stored settings with initial preferences to ensure all fields are present
          const updated: SystemPreferences = {
            ...initialPreferences,
            ...storedSettings,
            // Use backend value if available and localStorage doesn't have it
            storeAddress: storedSettings.storeAddress || backendStoreAddress || '',
            businessDayStartTime: storedSettings.businessDayStartTime || backendBusinessDayStartTime || '06:00',
            businessDayTimezone: storedSettings.businessDayTimezone || backendBusinessDayTimezone || 'UTC',
          };
          setPrefs(updated);

          // Check if printer type is set and if settings match
          if ((updated as any).printerType) {
            const matchResult = checkSettingsMatch((updated as any).printerType, updated);
            setSettingsOverrideWarning({
              show: !matchResult.matches,
              overriddenSettings: matchResult.overriddenSettings,
            });
          }

          // If currency in settings differs, sync selector
          if (updated.defaultCurrency) {
            const match = Object.values(CURRENCIES).find(c => c.symbol === updated.defaultCurrency || c.code === updated.defaultCurrency);
            if (match) {
              setSelectedCurrencyCode(match.code);
            }
          }
        } else {
          // No stored settings, use defaults but include backend settings if available
          setPrefs({
            ...initialPreferences,
            storeAddress: backendStoreAddress || '',
            businessDayStartTime: backendBusinessDayStartTime || '06:00',
            businessDayTimezone: backendBusinessDayTimezone || 'UTC',
          });
        }
      } catch (err) {
        console.error('Failed to load preferences from localStorage:', err);
        // keep defaults on error
        setPrefs(initialPreferences);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Update currency if changed
      if (selectedCurrencyCode !== currency.code) {
        const selectedCurrency = CURRENCIES[selectedCurrencyCode] || currency;
        await updateCurrency(selectedCurrency);
      }

      // Save preferences to localStorage
      saveSettings(prefs);
      
      // Sync businessDayStartTime to backend
      try {
        await storeSettingsApi.updateSetting('businessdaystarttime', {
          value: prefs.businessDayStartTime || '06:00',
          description: 'Business day start time in HH:mm format (e.g., 06:00 for 6:00 AM)'
        });
      } catch (error) {
        console.warn('Failed to sync businessDayStartTime to backend:', error);
        // Don't fail the entire save if backend sync fails
      }
      
      // Sync businessDayTimezone to backend
      try {
        await storeSettingsApi.updateSetting('businessdaytimezone', {
          value: prefs.businessDayTimezone || 'UTC',
          description: 'Business day timezone in IANA format (e.g., Asia/Gaza, America/New_York)'
        });
      } catch (error) {
        console.warn('Failed to sync businessDayTimezone to backend:', error);
        // Don't fail the entire save if backend sync fails
      }
      
      // Sync storeAddress to backend
      try {
        const addressValue = prefs.storeAddress || '';
        console.log('[PreferencesPage] Saving store address to backend:', addressValue);
        await storeSettingsApi.updateSetting('storeaddress', {
          value: addressValue,
          description: 'Store location/address displayed on invoices'
        });
        console.log('[PreferencesPage] Store address saved successfully to backend');
      } catch (error) {
        console.warn('[PreferencesPage] Failed to sync storeAddress to backend:', error);
        // Don't fail the entire save if backend sync fails
      }
      
      alert(AR_LABELS.changesSavedSuccessfully);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setSelectedCurrencyCode(value);
  };
  
  const renderSection = (title: string, children: React.ReactNode, icon?: React.ReactNode) => (
    <div className="group relative">
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 opacity-0 blur transition-all duration-500 group-hover:opacity-100 dark:from-slate-700 dark:to-slate-600" />
      <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl p-6 shadow-lg transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
          {icon && (
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-200/50 dark:border-orange-800/50">
              <div className="text-orange-600 dark:text-orange-400">
                {icon}
              </div>
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        </div>
        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );

  // Helper to check if a setting is auto-configured
  const isAutoConfigured = (settingName: string): boolean => {
    const printerType = (prefs as any).printerType as PrinterType | undefined;
    if (!printerType) return false;
    
    const config = getPrinterConfig(printerType);
    
    // Check if this specific setting matches the printer config
    const settingMap: Record<string, keyof PrinterConfig> = {
      'printPaperSize': 'paperSize',
      'printPaperWidth': 'paperWidth',
      'printPaperHeight': 'paperHeight',
      'printMarginTop': 'marginTop',
      'printMarginBottom': 'marginBottom',
      'printMarginLeft': 'marginLeft',
      'printMarginRight': 'marginRight',
      'printFontSize': 'fontSize',
      'printTableFontSize': 'tableFontSize',
      'printCompactMode': 'compactMode',
      'printShowBorders': 'showBorders',
    };
    
    const configKey = settingMap[settingName];
    if (!configKey) return false;
    
    const currentValue = (prefs as any)[settingName];
    const configValue = config[configKey];
    
    // Handle undefined/null values
    if (currentValue === undefined || currentValue === null) {
      return false;
    }
    
    // Compare values based on type
    if (typeof configValue === 'number' && typeof currentValue === 'number') {
      // For margins, allow small differences (0.1cm tolerance)
      if (settingName.includes('Margin')) {
        return Math.abs(currentValue - configValue) < 0.1;
      }
      // For font sizes, allow 1px tolerance
      if (settingName.includes('FontSize')) {
        return Math.abs(currentValue - configValue) <= 1;
      }
      // For dimensions, exact match
      return Math.abs(currentValue - configValue) < 0.01;
    }
    
    // String/boolean comparison
    return currentValue === configValue;
  };

  const renderField = (label: string, name: keyof SystemPreferences, type: 'text' | 'number' | 'textarea', children?: React.ReactNode) => {
    const isAuto = isAutoConfigured(name as string);
    const isOverridden = (prefs as any).printerType && !isAuto && 
      ['printPaperSize', 'printPaperWidth', 'printPaperHeight', 'printMarginTop', 'printMarginBottom', 
       'printMarginLeft', 'printMarginRight', 'printFontSize', 'printTableFontSize', 'printCompactMode', 'printShowBorders'].includes(name as string);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={name} className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
          {isAuto && (prefs as any).printerType && (
            <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
              تلقائي
            </span>
          )}
          {isOverridden && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
              معدل يدوياً
            </span>
          )}
        </div>
        <div className="relative">
            {type === 'textarea' ? (
                <textarea 
                  id={name} 
                  name={name} 
                  value={prefs[name] as string} 
                  onChange={handleChange} 
                  rows={3} 
                  className={`w-full border rounded-xl shadow-sm text-right px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 ${
                    isOverridden 
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' 
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  } text-slate-900 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500`}
                />
            ) : (
                <input 
                  type={type} 
                  id={name} 
                  name={name} 
                  value={prefs[name] as string | number} 
                  onChange={handleChange} 
                  className={`w-full border rounded-xl shadow-sm text-right px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 ${
                    isOverridden 
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' 
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  } text-slate-900 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500`}
                />
            )}
            {children}
        </div>
      </div>
    );
  };
  
   const renderSelect = (label: string, name: keyof SystemPreferences, options: {value: string, label: string}[]) => {
     const isAuto = isAutoConfigured(name as string);
     const isOverridden = (prefs as any).printerType && !isAuto && 
       ['printPaperSize'].includes(name as string);
     
     return (
       <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={name} className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
            {isAuto && (prefs as any).printerType && (
              <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
                تلقائي
              </span>
            )}
            {isOverridden && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                معدل يدوياً
              </span>
            )}
          </div>
          <select 
            id={name} 
            name={name} 
            value={prefs[name] as string} 
            onChange={handleChange} 
            className={`w-full border rounded-xl shadow-sm text-right px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 ${
              isOverridden 
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' 
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
            } text-slate-900 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_16px_center] bg-no-repeat`}
          >
              {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
      </div>
    );
   };
  
  const renderToggleField = (label: string, name: keyof SystemPreferences) => {
    const isAuto = isAutoConfigured(name as string);
    const isOverridden = (prefs as any).printerType && !isAuto && 
      ['printShowBorders', 'printCompactMode'].includes(name as string);
    
    return (
      <div className={`flex justify-between items-center py-3 px-4 rounded-xl border transition-all duration-200 group ${
        isOverridden 
          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10' 
          : 'border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/80'
      }`}>
        <div className="flex items-center gap-2">
          <ToggleSwitch enabled={!!prefs[name]} onChange={(enabled) => handleToggleChange(name, enabled)} />
          {isAuto && (prefs as any).printerType && (
            <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
              تلقائي
            </span>
          )}
          {isOverridden && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
              معدل يدوياً
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">{label}</span>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Modern Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-100/30 dark:from-slate-950 dark:via-orange-950/20 dark:to-amber-950/30" />
      
      {/* Subtle Floating Orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-slate-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-orange-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Modern Professional Header */}
        <div className="mb-12">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div />
            
            {/* Modern Status Card */}
            <div className="group relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur transition-all duration-300 group-hover:opacity-30" />
              <div className="relative rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-3">
                    <PreferencesIcon />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">الحالة</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 space-x-reverse">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">جميع الإعدادات نشطة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {renderSection(
              AR_LABELS.generalSettings, 
              <>
                {renderField(AR_LABELS.businessName, 'businessName', 'text')}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{AR_LABELS.uploadLogo}</label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative group">
                        <img src={logoPreview} alt="logo preview" className="h-20 w-20 object-cover rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-md transition-transform duration-300 group-hover:scale-105"/>
                        <div className="absolute inset-0 rounded-xl bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs">معاينة</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                        <span className="text-slate-400 text-xs">الشعار</span>
                      </div>
                    )}
                    <label className="flex-1 cursor-pointer">
                      <input 
                        type="file" 
                        onChange={handleLogoChange} 
                        accept="image/*" 
                        className="hidden"
                      />
                      <div className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 text-center cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
                        {logoPreview ? 'تغيير الشعار' : 'اختر الشعار'}
                      </div>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {AR_LABELS.defaultCurrency}
                  </label>
                  <CustomDropdown
                    id="currency-selector"
                    value={selectedCurrencyCode}
                    onChange={handleCurrencyChange}
                    options={Object.values(CURRENCIES).map((curr) => ({
                      value: curr.code,
                      label: `${curr.symbol} - ${curr.name} (${curr.code})`,
                    }))}
                    placeholder="اختر العملة"
                    className="w-full"
                  />
                  {selectedCurrencyCode && CURRENCIES[selectedCurrencyCode] && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      الرمز: {CURRENCIES[selectedCurrencyCode].symbol} | 
                      الكود: {CURRENCIES[selectedCurrencyCode].code}
                    </p>
                  )}
                </div>
                {renderSelect(AR_LABELS.dateFormat, 'dateFormat', [{value: 'DD/MM/YYYY', label: 'DD/MM/YYYY'}, {value: 'MM/DD/YYYY', label: 'MM/DD/YYYY'}])}
                {renderSelect(AR_LABELS.timeFormat, 'timeFormat', [{value: '12-hour', label: '12 ساعة'}, {value: '24-hour', label: '24 ساعة'}])}
                {renderSelect(AR_LABELS.defaultLanguage, 'defaultLanguage', [{value: 'ar', label: 'العربية'}, {value: 'en', label: 'English'}])}
                <div className="space-y-2">
                  <label htmlFor="businessDayStartTime" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    وقت بداية اليوم التجاري
                  </label>
                  <input 
                    type="time" 
                    id="businessDayStartTime" 
                    name="businessDayStartTime" 
                    value={prefs.businessDayStartTime || '06:00'} 
                    onChange={handleChange} 
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm text-right px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    يتم حساب اليوم التجاري من هذا الوقت حتى نفس الوقت من اليوم التالي. على سبيل المثال، إذا كان الوقت 06:00 صباحاً، فإن اليوم التجاري يبدأ من 06:00 صباحاً حتى 05:59:59 صباحاً من اليوم التالي.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="businessDayTimezone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    المنطقة الزمنية
                  </label>
                  <select
                    id="businessDayTimezone"
                    name="businessDayTimezone"
                    value={prefs.businessDayTimezone || 'UTC'}
                    onChange={handleChange}
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm text-right px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500"
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="Asia/Gaza">Asia/Gaza (فلسطين)</option>
                    <option value="Asia/Jerusalem">Asia/Jerusalem (إسرائيل)</option>
                    <option value="Asia/Dubai">Asia/Dubai (الإمارات العربية المتحدة)</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (السعودية)</option>
                    <option value="Asia/Kuwait">Asia/Kuwait (الكويت)</option>
                    <option value="Asia/Baghdad">Asia/Baghdad (العراق)</option>
                    <option value="Asia/Amman">Asia/Amman (الأردن)</option>
                    <option value="Africa/Cairo">Africa/Cairo (مصر)</option>
                    <option value="Europe/London">Europe/London (المملكة المتحدة)</option>
                    <option value="Europe/Paris">Europe/Paris (فرنسا)</option>
                    <option value="America/New_York">America/New_York (الولايات المتحدة - الشرق)</option>
                    <option value="America/Chicago">America/Chicago (الولايات المتحدة - الوسط)</option>
                    <option value="America/Denver">America/Denver (الولايات المتحدة - الجبل)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (الولايات المتحدة - الغرب)</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    المنطقة الزمنية المستخدمة لحساب بداية ونهاية اليوم التجاري. هذا مهم بشكل خاص عند النشر على خوادم في مناطق زمنية مختلفة.
                  </p>
                </div>
                {renderField('عنوان المتجر', 'storeAddress', 'text')}
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">
                  سيظهر هذا العنوان على الفواتير المطبوعة
                </p>
              </>,
              <PreferencesIcon />
            )}
            
            {renderSection(
              AR_LABELS.invoiceAndSalesSettings, 
              <>
                {renderField(AR_LABELS.vatPercentage, 'vatPercentage', 'number')}
                {renderField(AR_LABELS.invoiceNumberFormat, 'invoiceNumberFormat', 'text')}
                {renderField(AR_LABELS.invoiceFooterText, 'invoiceFooterText', 'textarea')}
                {renderToggleField(AR_LABELS.autoPrintInvoice, 'autoPrintInvoice')}
                {renderToggleField(AR_LABELS.sellWithoutStock, 'sellWithoutStock')}
                {renderToggleField(AR_LABELS.allowSellingZeroStock, 'allowSellingZeroStock')}
              </>,
              <PreferencesIcon />
            )}
          </div>
        
          <div className="space-y-6">
            {renderSection(
              AR_LABELS.userRolesAndPermissions, 
              <>
                {renderField(AR_LABELS.sessionDuration, 'sessionDuration', 'number')}
                {renderToggleField(AR_LABELS.allowUserCreation, 'allowUserCreation')}
              </>,
              <PreferencesIcon />
            )}
            
            {renderSection(
              AR_LABELS.inventoryAndProductsSettings, 
              <>
                {renderField(AR_LABELS.defaultMeasurementUnits, 'defaultUnits', 'text')}
                {renderField(AR_LABELS.minStockLevel, 'minStockLevel', 'number')}
                {renderToggleField(AR_LABELS.enableLowStockNotifications, 'enableLowStockNotifications')}
              </>,
              <PreferencesIcon />
            )}
            
            {renderSection(
              AR_LABELS.paymentAndCurrencyOptions, 
              <>
                {renderToggleField(AR_LABELS.allowCash, 'allowCash')}
                {renderToggleField(AR_LABELS.allowCard, 'allowCard')}
                {renderToggleField(AR_LABELS.allowCredit, 'allowCredit')}
              </>,
              <PreferencesIcon />
            )}
            
            {renderSection(
              'إعدادات الطباعة', 
              <>
                <div className="space-y-2">
                  <label htmlFor="printerType" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    نوع الطابعة
                  </label>
                  <select 
                    id="printerType" 
                    name="printerType" 
                    value={(prefs as any).printerType || ''} 
                    onChange={(e) => {
                      const selectedType = e.target.value as PrinterType;
                      if (selectedType) {
                        // Automatically apply all print settings based on printer type
                        const updatedPrefs = applyPrinterConfig(selectedType, prefs);
                        setPrefs(updatedPrefs as SystemPreferences);
                        // Clear override warning when printer type is changed
                        setSettingsOverrideWarning({ show: false, overriddenSettings: [] });
                      } else {
                        // Clear printer type
                        setPrefs(prev => ({ ...prev, printerType: undefined as any }));
                        setSettingsOverrideWarning({ show: false, overriddenSettings: [] });
                      }
                    }}
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm text-right px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-[length:12px_8px] bg-[right_16px_center] bg-no-repeat"
                  >
                    <option value="">-- اختر نوع الطابعة --</option>
                    {getAvailablePrinterTypes().map(type => (
                      <option key={type} value={type}>
                        {getPrinterTypeDisplayName(type)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    عند اختيار نوع الطابعة، سيتم ضبط جميع إعدادات الطباعة تلقائياً (حجم الورق، الهوامش، حجم الخط، التخطيط)
                  </p>
                  {(prefs as any).printerType && (
                    <>
                      {!settingsOverrideWarning.show ? (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            ✓ تم تطبيق إعدادات الطابعة تلقائياً
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
                          <div className="flex items-start gap-2 mb-2">
                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                                تنبيه: تم تعديل إعدادات الطباعة يدوياً
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                                تم تعديل الإعدادات التالية يدوياً وقد تؤثر على جودة الطباعة:
                              </p>
                              <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside mb-3 space-y-1">
                                {settingsOverrideWarning.overriddenSettings.map((setting, idx) => (
                                  <li key={idx}>{setting}</li>
                                ))}
                              </ul>
                              <button
                                onClick={handleResetToPrinterDefaults}
                                className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                              >
                                إعادة تعيين إلى إعدادات الطابعة الافتراضية
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      إعدادات الطباعة المتقدمة (يمكن تعديلها يدوياً)
                    </h3>
                    {(prefs as any).printerType && (
                      <button
                        onClick={handleResetToPrinterDefaults}
                        className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors border border-slate-300 dark:border-slate-600"
                        title="إعادة تعيين جميع الإعدادات إلى قيم الطابعة الافتراضية"
                      >
                        إعادة تعيين
                      </button>
                    )}
                  </div>
                  {(prefs as any).printerType && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 -mt-2">
                      💡 تم ضبط هذه الإعدادات تلقائياً حسب نوع الطابعة المحدد. يمكنك تعديلها يدوياً، لكن قد يؤثر ذلك على جودة الطباعة.
                    </p>
                  )}
                  
                  {renderSelect('حجم الورق', 'printPaperSize', [
                    {value: 'A4', label: 'A4 (210 × 297 مم)'},
                    {value: 'A5', label: 'A5 (148 × 210 مم)'},
                    {value: '80mm', label: '80 مم (طابعة حرارية)'},
                    {value: '58mm', label: '58 مم (طابعة حرارية)'},
                    {value: 'custom', label: 'مخصص'}
                  ])}
                  {prefs.printPaperSize === 'custom' && (
                    <>
                      {renderField('عرض الورق (مم)', 'printPaperWidth', 'number')}
                      {renderField('ارتفاع الورق (مم)', 'printPaperHeight', 'number')}
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {renderField('الهامش العلوي (سم)', 'printMarginTop', 'number')}
                    {renderField('الهامش السفلي (سم)', 'printMarginBottom', 'number')}
                    {renderField('الهامش الأيمن (سم)', 'printMarginRight', 'number')}
                    {renderField('الهامش الأيسر (سم)', 'printMarginLeft', 'number')}
                  </div>
                  {renderField('حجم الخط (بكسل)', 'printFontSize', 'number')}
                  {renderField('حجم خط الجدول (بكسل)', 'printTableFontSize', 'number')}
                  {renderToggleField('إظهار حدود الجدول', 'printShowBorders')}
                  {renderToggleField('وضع المدمج (تقليل المسافات)', 'printCompactMode')}
                </div>
              </>,
              <div className="w-6 h-6">
                <PrintIcon />
              </div>
            )}
          </div>
        </div>
      
        {/* Modern Save Button */}
        <div className="flex justify-start mt-8">
          <div className="group relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur transition-all duration-300 group-hover:opacity-30" />
            <button
              onClick={handleSaveChanges}
              disabled={saving || currencyLoading || loading}
              className="relative px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="relative flex items-center gap-2">
                {saving ? 'جاري الحفظ...' : AR_LABELS.saveChanges}
                {!saving && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saving && (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;