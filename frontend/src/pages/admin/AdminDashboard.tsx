import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { adminApi } from '@/lib/api/client';
import { AR_LABELS } from '@/shared/constants/ui';
import { formatDate } from '@/shared/utils';
import { EditIcon, DeleteIcon } from '@/shared/assets/icons';

interface Store {
  id: string;
  storeNumber: number;
  storeId: string;
  name: string;
  prefix: string;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  subscriptionEndDate?: string;
  subscriptionStartDate?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

const AdminDashboard = () => {
  const location = useLocation();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [renewingStore, setRenewingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    storeId: '',
    prefix: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    createDefaultAdmin: false,
    defaultAdminEmail: '',
    defaultAdminPassword: '',
    defaultAdminName: '',
    subscriptionType: 'duration' as 'duration' | 'custom',
    subscriptionDuration: '1month' as '1month' | '2months' | '1year' | '2years',
    subscriptionEndDate: '',
  });
  const [renewFormData, setRenewFormData] = useState({
    subscriptionType: 'duration' as 'duration' | 'custom',
    subscriptionDuration: '1month' as '1month' | '2months' | '1year' | '2years',
    subscriptionEndDate: '',
  });
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    // Only load stores if we're on the stores or dashboard page
    if (location.pathname === '/admin/dashboard' || location.pathname === '/admin/stores') {
      loadStores();
    } else {
      setLoading(false);
    }
    
    // Load settings if on settings page
    if (location.pathname === '/admin/settings') {
      loadSettings();
    }
  }, [location.pathname]);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getStores();
      if (response.data.success) {
        setStores(response.data.data.stores);
      }
    } catch (err: any) {
      setError(err.message || AR_LABELS.failedToLoadStores);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      setError(null);
      const response = await adminApi.getSettings();
      if (response.data.success) {
        setSettings(response.data.data.settings);
        setContactNumber(response.data.data.settings.subscription_contact_number || '0593202029');
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الإعدادات');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveContactNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setError(null);
      await adminApi.updateSetting('subscription_contact_number', {
        value: contactNumber,
        description: 'رقم الاتصال المعروض في صفحة انتهاء الاشتراك',
      });
      alert('تم حفظ رقم الاتصال بنجاح');
      loadSettings();
    } catch (err: any) {
      setError(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenModal = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        storeId: store.storeId,
        prefix: store.prefix,
        email: store.email || '',
        phone: store.phone || '',
        address: store.address || '',
        city: store.city || '',
        country: store.country || '',
        createDefaultAdmin: false,
        defaultAdminEmail: '',
        defaultAdminPassword: '',
        defaultAdminName: '',
        subscriptionType: 'duration',
        subscriptionDuration: '1month',
        subscriptionEndDate: '',
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        storeId: '',
        prefix: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        createDefaultAdmin: false,
        defaultAdminEmail: '',
        defaultAdminPassword: '',
        defaultAdminName: '',
        subscriptionType: 'duration',
        subscriptionDuration: '1month',
        subscriptionEndDate: '',
      });
    }
    setShowModal(true);
  };

  const handleOpenRenewModal = (store: Store) => {
    setRenewingStore(store);
    setRenewFormData({
      subscriptionType: 'duration',
      subscriptionDuration: '1month',
      subscriptionEndDate: '',
    });
    setShowRenewModal(true);
  };

  const handleCloseRenewModal = () => {
    setShowRenewModal(false);
    setRenewingStore(null);
    setRenewFormData({
      subscriptionType: 'duration',
      subscriptionDuration: '1month',
      subscriptionEndDate: '',
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStore(null);
    setFormData({
      name: '',
      storeId: '',
      prefix: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      createDefaultAdmin: false,
      defaultAdminEmail: '',
      defaultAdminPassword: '',
      defaultAdminName: '',
      subscriptionType: 'duration',
      subscriptionDuration: '1month',
      subscriptionEndDate: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingStore) {
        await adminApi.updateStore(editingStore.id, {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          country: formData.country || undefined,
        });
      } else {
        const payload: any = {
          name: formData.name,
          storeId: formData.storeId,
          prefix: formData.prefix,
        };
        
        // Include subscription information
        if (formData.subscriptionType === 'duration') {
          payload.subscriptionDuration = formData.subscriptionDuration;
        } else {
          payload.subscriptionEndDate = formData.subscriptionEndDate;
        }
        
        // Include default admin creation if requested
        if (formData.createDefaultAdmin) {
          payload.createDefaultAdmin = true;
          payload.defaultAdminEmail = formData.defaultAdminEmail;
          payload.defaultAdminPassword = formData.defaultAdminPassword;
          payload.defaultAdminName = formData.defaultAdminName || `Store Admin - ${formData.name}`;
        }
        
        const response = await adminApi.createStore(payload);
        
        // Show success message with admin credentials if created
        const responseData = response.data as any;
        if (responseData?.data?.defaultAdmin) {
          const admin = responseData.data.defaultAdmin;
          alert(`${AR_LABELS.storeCreatedSuccessfully}\n\n${AR_LABELS.defaultAdminUserCreated}\n${AR_LABELS.username}: ${admin.username}\n${AR_LABELS.email}: ${admin.email}\n\n${AR_LABELS.pleaseSaveCredentials}`);
        }
      }
      handleCloseModal();
      loadStores();
    } catch (err: any) {
      setError(err.message || AR_LABELS.failedToSaveStore);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(AR_LABELS.areYouSureDeleteStore)) {
      return;
    }
    try {
      await adminApi.deleteStore(id);
      loadStores();
      setError(null);
    } catch (err: any) {
      setError(err.message || AR_LABELS.failedToDeleteStore);
    }
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingStore) return;
    
    try {
      setError(null);
      const payload: any = {};
      
      if (renewFormData.subscriptionType === 'duration') {
        payload.subscriptionDuration = renewFormData.subscriptionDuration;
      } else {
        payload.subscriptionEndDate = renewFormData.subscriptionEndDate;
      }
      
      await adminApi.renewSubscription(renewingStore.id, payload);
      handleCloseRenewModal();
      loadStores();
    } catch (err: any) {
      setError(err.message || 'فشل تجديد الاشتراك');
    }
  };


  // Helper function to get store status
  const getStoreStatus = (store: Store) => {
    if (store.isActive === false) {
      return { text: 'منتهي', status: 'expired', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
    }
    
    if (store.subscriptionEndDate) {
      const endDate = new Date(store.subscriptionEndDate);
      const now = new Date();
      if (endDate < now) {
        return { text: 'منتهي', status: 'expired', className: 'bg-red-500/20 text-red-400 border-red-500/30' };
      }
    }
    
    return { text: 'نشط', status: 'active', className: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  // Render different content based on route
  if (location.pathname === '/admin/settings') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">{AR_LABELS.systemSettings}</h1>
          
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 flex items-center justify-between mb-6">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors ml-4"
                aria-label="إغلاق"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {settingsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-white">جاري التحميل...</div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-white">إعدادات النظام</h2>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Contact Number Setting */}
                <div className="border-b border-slate-700 pb-6">
                  <h3 className="text-lg font-medium text-white mb-4">رقم الاتصال لانتهاء الاشتراك</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    هذا الرقم سيظهر للمتاجر التي انتهت صلاحية اشتراكها في صفحة انتهاء الاشتراك.
                  </p>
                  
                  <form onSubmit={handleSaveContactNumber} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        رقم الاتصال
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0593202029"
                        pattern="[0-9+]+"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        أدخل رقم الهاتف بدون مسافات أو رموز خاصة (مثال: 0593202029)
                      </p>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingSettings}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingSettings ? 'جاري الحفظ...' : 'حفظ'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (location.pathname === '/admin/users') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">{AR_LABELS.usersAndPermissions}</h1>
          <div className="bg-slate-800 rounded-lg p-6 text-white">
            <p className="text-slate-300">{AR_LABELS.usersAndPermissionsDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-white">{AR_LABELS.loading}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {location.pathname === '/admin/stores' ? AR_LABELS.storeManagement : AR_LABELS.adminDashboard}
          </h1>
          <p className="mt-2 text-slate-400">
            {location.pathname === '/admin/stores' 
              ? AR_LABELS.storeManagementDescription
              : AR_LABELS.adminDashboardDescription}
          </p>
        </div>
        {(location.pathname === '/admin/dashboard' || location.pathname === '/admin/stores') && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {AR_LABELS.createNewStore}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 transition-colors ml-4"
            aria-label="إغلاق"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">{AR_LABELS.storeManagement}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {AR_LABELS.storeNumber}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {AR_LABELS.storeName}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {AR_LABELS.storeId}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {AR_LABELS.prefix}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  تاريخ الإنشاء
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  تاريخ انتهاء الاشتراك
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {AR_LABELS.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-slate-400">
                    {AR_LABELS.noStoresFound}
                  </td>
                </tr>
              ) : (
                stores.map((store, index) => {
                  const status = getStoreStatus(store);
                  return (
                    <tr key={store.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{store.storeNumber || index + 1}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{store.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{store.storeId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{store.prefix}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            status.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                          }`}></span>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">
                          {(() => {
                            const date = new Date(store.createdAt);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            return `${day}-${month}-${year}`;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">
                          {store.subscriptionEndDate 
                            ? (() => {
                                const date = new Date(store.subscriptionEndDate);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}-${month}-${year}`;
                              })()
                            : 'Not specified'}
                        </div>
                        {store.subscriptionEndDate && (() => {
                          const endDate = new Date(store.subscriptionEndDate);
                          const now = new Date();
                          const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
                            return (
                              <div className="text-xs text-orange-400 mt-1">
                                {daysUntilExpiry === 1 ? 'Expires tomorrow' : `Expires in ${daysUntilExpiry} days`}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5 justify-end">
                          <button
                            onClick={() => handleOpenModal(store)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-500 rounded-lg hover:bg-blue-700 hover:border-blue-600 active:bg-blue-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-800 min-w-[80px]"
                            title={AR_LABELS.edit}
                          >
                            <EditIcon />
                            <span>{AR_LABELS.edit}</span>
                          </button>
                          <button
                            onClick={() => handleOpenRenewModal(store)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-green-600 border border-green-500 rounded-lg hover:bg-green-700 hover:border-green-600 active:bg-green-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-slate-800 min-w-[80px]"
                            title="تجديد الاشتراك"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>تجديد</span>
                          </button>
                          <button
                            onClick={() => handleDelete(store.id)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-red-600 border border-red-500 rounded-lg hover:bg-red-700 hover:border-red-600 active:bg-red-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-slate-800 min-w-[80px]"
                            title={AR_LABELS.delete}
                          >
                            <DeleteIcon />
                            <span>{AR_LABELS.delete}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-white">
              {editingStore ? AR_LABELS.editStore : AR_LABELS.createNewStore}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {AR_LABELS.storeName}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {editingStore && (
                <>
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">معلومات الاتصال</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          البريد الإلكتروني
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="store@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          رقم الهاتف
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+966501234567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          العنوان
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="شارع الملك فهد"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            المدينة
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="الرياض"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            الدولة
                          </label>
                          <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="السعودية"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {!editingStore && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {AR_LABELS.storeId}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.storeId}
                      onChange={(e) => setFormData({ ...formData, storeId: e.target.value.toLowerCase() })}
                      pattern="[a-z0-9_]+"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: store1"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {AR_LABELS.lowercaseLettersNumbersOnly}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {AR_LABELS.prefix}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.prefix}
                      onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toLowerCase() })}
                      pattern="[a-z0-9_]+"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="مثال: store1"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {AR_LABELS.usedForCollectionNames.replace('{prefix}', formData.prefix || 'store1')}
                    </p>
                  </div>
                  
                  {/* Subscription Settings */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      مدة الاشتراك
                    </label>
                    
                    <div className="space-y-3">
                      {/* Subscription Type Selection */}
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="subscriptionType"
                            value="duration"
                            checked={formData.subscriptionType === 'duration'}
                            onChange={(e) => setFormData({ ...formData, subscriptionType: 'duration' as 'duration' | 'custom' })}
                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-slate-300">مدة محددة</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="subscriptionType"
                            value="custom"
                            checked={formData.subscriptionType === 'custom'}
                            onChange={(e) => setFormData({ ...formData, subscriptionType: 'custom' as 'duration' | 'custom' })}
                            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-slate-300">اختيار تاريخ نهائي</span>
                        </label>
                      </div>

                      {/* Duration Selection */}
                      {formData.subscriptionType === 'duration' && (
                        <div>
                          <select
                            value={formData.subscriptionDuration}
                            onChange={(e) => setFormData({ ...formData, subscriptionDuration: e.target.value as '1month' | '2months' | '1year' | '2years' })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="1month">شهر واحد</option>
                            <option value="2months">شهران</option>
                            <option value="1year">سنة واحدة</option>
                            <option value="2years">سنتان</option>
                          </select>
                        </div>
                      )}

                      {/* Custom Date Selection */}
                      {formData.subscriptionType === 'custom' && (
                        <div>
                          <input
                            type="date"
                            required={formData.subscriptionType === 'custom'}
                            value={formData.subscriptionEndDate}
                            onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="mt-1 text-xs text-slate-400">
                            اختر تاريخ انتهاء الاشتراك
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Default Admin User Creation */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="createDefaultAdmin"
                        checked={formData.createDefaultAdmin}
                        onChange={(e) => setFormData({ ...formData, createDefaultAdmin: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="createDefaultAdmin" className="ml-2 text-sm font-medium text-slate-300">
                        {AR_LABELS.createDefaultStoreAdmin}
                      </label>
                    </div>
                    
                    {formData.createDefaultAdmin && (
                      <div className="space-y-3 mt-3 pl-6 border-r-2 border-blue-600">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            {AR_LABELS.adminEmail}
                          </label>
                          <input
                            type="email"
                            required={formData.createDefaultAdmin}
                            value={formData.defaultAdminEmail}
                            onChange={(e) => setFormData({ ...formData, defaultAdminEmail: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="admin@store.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            {AR_LABELS.adminPassword}
                          </label>
                          <input
                            type="password"
                            required={formData.createDefaultAdmin}
                            value={formData.defaultAdminPassword}
                            onChange={(e) => setFormData({ ...formData, defaultAdminPassword: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={AR_LABELS.passwordTooShort}
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            {AR_LABELS.adminName}
                          </label>
                          <input
                            type="text"
                            value={formData.defaultAdminName}
                            onChange={(e) => setFormData({ ...formData, defaultAdminName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={formData.name ? `مسؤول المتجر - ${formData.name}` : AR_LABELS.adminNamePlaceholder}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          {AR_LABELS.defaultAdminDescription}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium"
                >
                  {AR_LABELS.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium"
                >
                  {editingStore ? AR_LABELS.update : AR_LABELS.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Subscription Modal */}
      {showRenewModal && renewingStore && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-white">
              تجديد اشتراك المتجر: {renewingStore.name}
            </h2>
            <form onSubmit={handleRenewSubscription} className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-slate-400 mb-2">
                  تاريخ انتهاء الاشتراك الحالي: {renewingStore.subscriptionEndDate 
                    ? formatDate(renewingStore.subscriptionEndDate)
                    : 'غير محدد'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  مدة الاشتراك
                </label>
                
                <div className="space-y-3">
                  {/* Subscription Type Selection */}
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="renewSubscriptionType"
                        value="duration"
                        checked={renewFormData.subscriptionType === 'duration'}
                        onChange={(e) => setRenewFormData({ ...renewFormData, subscriptionType: 'duration' as 'duration' | 'custom' })}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-300">مدة محددة</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="renewSubscriptionType"
                        value="custom"
                        checked={renewFormData.subscriptionType === 'custom'}
                        onChange={(e) => setRenewFormData({ ...renewFormData, subscriptionType: 'custom' as 'duration' | 'custom' })}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-slate-300">اختيار تاريخ نهائي</span>
                    </label>
                  </div>

                  {/* Duration Selection */}
                  {renewFormData.subscriptionType === 'duration' && (
                    <div>
                      <select
                        value={renewFormData.subscriptionDuration}
                        onChange={(e) => setRenewFormData({ ...renewFormData, subscriptionDuration: e.target.value as '1month' | '2months' | '1year' | '2years' })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="1month">شهر واحد</option>
                        <option value="2months">شهران</option>
                        <option value="1year">سنة واحدة</option>
                        <option value="2years">سنتان</option>
                      </select>
                    </div>
                  )}

                  {/* Custom Date Selection */}
                  {renewFormData.subscriptionType === 'custom' && (
                    <div>
                      <input
                        type="date"
                        required={renewFormData.subscriptionType === 'custom'}
                        value={renewFormData.subscriptionEndDate}
                        onChange={(e) => setRenewFormData({ ...renewFormData, subscriptionEndDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        اختر تاريخ انتهاء الاشتراك الجديد
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseRenewModal}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium"
                >
                  {AR_LABELS.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium"
                >
                  تجديد الاشتراك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

