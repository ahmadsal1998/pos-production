import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/client';
import { AR_LABELS } from '@/shared/constants';

interface PointsSettings {
  id?: string;
  storeId?: string;
  userPointsPercentage: number;
  companyProfitPercentage: number;
  defaultThreshold: number;
  pointsExpirationDays?: number;
  minPurchaseAmount?: number;
  maxPointsPerTransaction?: number;
  pointsValuePerPoint?: number;
}

const PointsSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PointsSettings>({
    userPointsPercentage: 5,
    companyProfitPercentage: 2,
    defaultThreshold: 10000,
    pointsValuePerPoint: 0.01,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('global');
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    loadStores();
    loadSettings();
  }, [selectedStoreId]);

  const loadStores = async () => {
    try {
      const response = await adminApi.getStores();
      if (response.data.success) {
        setStores([{ storeId: 'global', name: 'الإعدادات العامة' }, ...response.data.data.stores]);
      }
    } catch (err: any) {
      console.error('Failed to load stores:', err);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminApi.getPointsSettings(selectedStoreId === 'global' ? undefined : selectedStoreId);
      if (response.data.success && response.data.data.settings) {
        setSettings(response.data.data.settings);
      }
    } catch (err: any) {
      console.error('Failed to load points settings:', err);
      setError(err?.response?.data?.message || 'فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await adminApi.updatePointsSettings({
        storeId: selectedStoreId === 'global' ? undefined : selectedStoreId,
        userPointsPercentage: settings.userPointsPercentage,
        companyProfitPercentage: settings.companyProfitPercentage,
        defaultThreshold: settings.defaultThreshold,
        pointsExpirationDays: settings.pointsExpirationDays || undefined,
        minPurchaseAmount: settings.minPurchaseAmount || undefined,
        maxPointsPerTransaction: settings.maxPointsPerTransaction || undefined,
        pointsValuePerPoint: settings.pointsValuePerPoint || undefined,
      });

      if (response.data.success) {
        setSuccess('تم حفظ الإعدادات بنجاح');
        setSettings(response.data.data.settings);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.data.message || 'فشل حفظ الإعدادات');
      }
    } catch (err: any) {
      console.error('Failed to save points settings:', err);
      setError(err?.response?.data?.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PointsSettings, value: number | undefined) => {
    setSettings(prev => ({
      ...prev,
      [field]: value !== undefined ? value : undefined,
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            إعدادات نظام النقاط
          </h1>
          <p className="mt-2 text-slate-400">
            تكوين إعدادات النقاط ونسب الأرباح
          </p>
        </div>
      </div>

      {/* Store Selector */}
      <div className="bg-slate-800 rounded-lg p-4">
        <label className="block text-sm font-medium text-white mb-2">
          المتجر
        </label>
        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {stores.map((store) => (
            <option key={store.storeId} value={store.storeId}>
              {store.name || store.storeId}
            </option>
          ))}
        </select>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">جاري التحميل...</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-6 space-y-6">
          {/* Points Earning Settings */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">إعدادات النقاط المكتسبة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  نسبة النقاط المكتسبة من كل عملية شراء (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.userPointsPercentage}
                  onChange={(e) => handleChange('userPointsPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  مثال: 5% يعني أن العميل يحصل على 5 نقاط لكل 100 ريال
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  القيمة النقدية لكل نقطة (ريال)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.pointsValuePerPoint || 0.01}
                  onChange={(e) => handleChange('pointsValuePerPoint', parseFloat(e.target.value) || 0.01)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  مثال: 0.01 يعني أن كل نقطة تساوي 0.01 ريال
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  الحد الأدنى لمبلغ الشراء للحصول على نقاط (ريال)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.minPurchaseAmount || ''}
                  onChange={(e) => handleChange('minPurchaseAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="غير محدد"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  اتركه فارغاً لإلغاء الحد الأدنى
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  الحد الأقصى للنقاط في كل معاملة
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.maxPointsPerTransaction || ''}
                  onChange={(e) => handleChange('maxPointsPerTransaction', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="غير محدد"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  اتركه فارغاً لإلغاء الحد الأقصى
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  مدة انتهاء النقاط (أيام)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={settings.pointsExpirationDays || ''}
                  onChange={(e) => handleChange('pointsExpirationDays', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="غير محدد (لا تنتهي)"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  اتركه فارغاً لجعل النقاط غير منتهية الصلاحية
                </p>
              </div>
            </div>
          </div>

          {/* Company Profit Settings */}
          <div className="border-t border-slate-700 pt-6">
            <h2 className="text-xl font-bold text-white mb-4">إعدادات الأرباح</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  نسبة ربح الشركة من كل معاملة (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.companyProfitPercentage}
                  onChange={(e) => handleChange('companyProfitPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  نسبة الأرباح التي تحتفظ بها الشركة من كل معاملة
                </p>
              </div>
            </div>
          </div>

          {/* Store Payout Settings */}
          <div className="border-t border-slate-700 pt-6">
            <h2 className="text-xl font-bold text-white mb-4">إعدادات دفع المتاجر</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  الحد الأدنى للرصيد المطلوب للدفع (ريال)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.defaultThreshold}
                  onChange={(e) => handleChange('defaultThreshold', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-slate-400">
                  الحد الأدنى للرصيد المستحق قبل دفع المتجر
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-slate-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsSettingsPage;

