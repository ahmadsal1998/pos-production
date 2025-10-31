import React, { useState } from 'react';
import { SystemPreferences } from '@/features/user-management/types';
import { AR_LABELS } from '@/shared/constants';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';

const initialPreferences: SystemPreferences = {
  // General
  businessName: 'PoshPointHub',
  logoUrl: '',
  defaultCurrency: 'ر.س',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12-hour',
  defaultLanguage: 'ar',
  // Invoice & Sales
  vatPercentage: 15,
  invoiceNumberFormat: 'INV-{YYYY}-{NNNN}',
  invoiceFooterText: 'شكراً لتعاملكم معنا!',
  autoPrintInvoice: true,
  sellWithoutStock: false,
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
};

const PreferencesPage: React.FC = () => {
  const [prefs, setPrefs] = useState<SystemPreferences>(initialPreferences);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        const { checked } = e.target;
        setPrefs(prev => ({ ...prev, [name]: checked }));
    } else {
        setPrefs(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToggleChange = (name: keyof SystemPreferences, enabled: boolean) => {
    setPrefs(prev => ({ ...prev, [name]: enabled }));
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

  const handleSaveChanges = () => {
    console.log('Saving preferences:', prefs);
    alert(AR_LABELS.changesSavedSuccessfully);
  };
  
  const renderSection = (title: string, children: React.ReactNode) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4 text-right">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const renderField = (label: string, name: keyof SystemPreferences, type: 'text' | 'number' | 'textarea', children?: React.ReactNode) => (
    <div className="grid grid-cols-3 items-center text-right gap-4">
        <label htmlFor={name} className="col-span-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="col-span-2">
            {type === 'textarea' ? (
                <textarea id={name} name={name} value={prefs[name] as string} onChange={handleChange} rows={3} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg shadow-sm text-right px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"/>
            ) : (
                <input type={type} id={name} name={name} value={prefs[name] as string | number} onChange={handleChange} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg shadow-sm text-right px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"/>
            )}
             {children}
        </div>
    </div>
  );
  
   const renderSelect = (label: string, name: keyof SystemPreferences, options: {value: string, label: string}[]) => (
     <div className="grid grid-cols-3 items-center text-right gap-4">
        <label htmlFor={name} className="col-span-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <select id={name} name={name} value={prefs[name] as string} onChange={handleChange} className="col-span-2 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg shadow-sm text-right px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200">
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
  );
  
  const renderToggleField = (label: string, name: keyof SystemPreferences) => (
    <div className="flex justify-between items-center py-3 px-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-200">
        <ToggleSwitch enabled={!!prefs[name]} onChange={(enabled) => handleToggleChange(name, enabled)} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{AR_LABELS.preferences}</h1>
        <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.preferencesDescription}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
            {renderSection(AR_LABELS.generalSettings, <>
                {renderField(AR_LABELS.businessName, 'businessName', 'text')}
                <div className="grid grid-cols-3 items-center text-right gap-4">
                    <label className="col-span-1 text-sm font-medium text-gray-700 dark:text-gray-300">{AR_LABELS.uploadLogo}</label>
                    <div className="col-span-2 flex items-center gap-4">
                        {logoPreview && <img src={logoPreview} alt="logo preview" className="h-14 w-14 object-cover rounded-lg border border-gray-200 dark:border-gray-700"/>}
                        <input type="file" onChange={handleLogoChange} accept="image/*" className="text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"/>
                    </div>
                </div>
                {renderField(AR_LABELS.defaultCurrency, 'defaultCurrency', 'text')}
                {renderSelect(AR_LABELS.dateFormat, 'dateFormat', [{value: 'DD/MM/YYYY', label: 'DD/MM/YYYY'}, {value: 'MM/DD/YYYY', label: 'MM/DD/YYYY'}])}
                {renderSelect(AR_LABELS.timeFormat, 'timeFormat', [{value: '12-hour', label: '12 ساعة'}, {value: '24-hour', label: '24 ساعة'}])}
                {renderSelect(AR_LABELS.defaultLanguage, 'defaultLanguage', [{value: 'ar', label: 'العربية'}, {value: 'en', label: 'English'}])}
            </>)}
            
            {renderSection(AR_LABELS.invoiceAndSalesSettings, <>
                {renderField(AR_LABELS.vatPercentage, 'vatPercentage', 'number')}
                {renderField(AR_LABELS.invoiceNumberFormat, 'invoiceNumberFormat', 'text')}
                {renderField(AR_LABELS.invoiceFooterText, 'invoiceFooterText', 'textarea')}
                {renderToggleField(AR_LABELS.autoPrintInvoice, 'autoPrintInvoice')}
                {renderToggleField(AR_LABELS.sellWithoutStock, 'sellWithoutStock')}
            </>)}
        </div>
        
         <div className="space-y-6">
             {renderSection(AR_LABELS.userRolesAndPermissions, <>
                {renderField(AR_LABELS.sessionDuration, 'sessionDuration', 'number')}
                {renderToggleField(AR_LABELS.allowUserCreation, 'allowUserCreation')}
             </>)}
              {renderSection(AR_LABELS.inventoryAndProductsSettings, <>
                {renderField(AR_LABELS.defaultMeasurementUnits, 'defaultUnits', 'text')}
                {renderField(AR_LABELS.minStockLevel, 'minStockLevel', 'number')}
                {renderToggleField(AR_LABELS.enableLowStockNotifications, 'enableLowStockNotifications')}
            </>)}
            {renderSection(AR_LABELS.paymentAndCurrencyOptions, <>
                {renderToggleField(AR_LABELS.cash, 'allowCash')}
                {renderToggleField(AR_LABELS.card, 'allowCard')}
                {renderToggleField(AR_LABELS.credit, 'allowCredit')}
            </>)}
         </div>
      </div>
      
       <div className="flex justify-start mt-6">
            <button
                onClick={handleSaveChanges}
                className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
            >
                {AR_LABELS.saveChanges}
            </button>
        </div>

    </div>
  );
};

export default PreferencesPage;