import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/client';
import { formatDate } from '@/shared/utils';

interface TrialStore {
  id: string;
  storeId: string;
  name: string;
  createdAt: string;
  userCount: number;
}

interface PurgeReport {
  storesFound: number;
  storesToDelete: TrialStore[];
  collectionsToPurge: string[];
  totalDocumentsToDelete: { [key: string]: number };
  estimatedSize: string;
}

const TrialAccountsPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [trialStores, setTrialStores] = useState<TrialStore[]>([]);
  const [purgeReport, setPurgeReport] = useState<PurgeReport | null>(null);
  const [showPurgeReport, setShowPurgeReport] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const [showDeleteStoreConfirm, setShowDeleteStoreConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadTrialStores();
  }, []);

  const loadTrialStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getStores();
      if (response.data.success) {
        // Filter only trial accounts
        const allStores = response.data.data.stores;
        const trials = allStores
          .filter((store: any) => store.isTrialAccount === true)
          .map((store: any) => ({
            id: store.id || store._id,
            storeId: store.storeId,
            name: store.name,
            createdAt: store.createdAt,
            userCount: 0, // Will be updated from purge report
          }));
        setTrialStores(trials);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الحسابات التجريبية');
    } finally {
      setLoading(false);
    }
  };

  const loadPurgeReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const response = await adminApi.getTrialAccountsPurgeReport();
      if (response.data.success) {
        setPurgeReport(response.data.data.report);
        setShowPurgeReport(true);
        // Update trial stores with user counts from report
        const updatedStores = trialStores.map(store => {
          const reportStore = response.data.data.report.storesToDelete.find(
            (s: TrialStore) => s.storeId === store.storeId
          );
          return reportStore ? { ...store, userCount: reportStore.userCount } : store;
        });
        setTrialStores(updatedStores);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل تقرير الحذف');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setShowDeleteAllConfirm(false);

      const response = await adminApi.purgeAllTrialAccounts();
      if (response.data.success) {
        setSuccess(`تم حذف ${response.data.data.deleted.stores} حساب تجريبي بنجاح`);
        setPurgeReport(null);
        setShowPurgeReport(false);
        // Reload stores
        await loadTrialStores();
      } else {
        setError('فشل حذف الحسابات التجريبية');
      }
    } catch (err: any) {
      setError(err.message || 'فشل حذف الحسابات التجريبية');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpecific = async (storeId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setShowDeleteStoreConfirm(null);
      setDeletingStoreId(storeId);

      // First get dry-run report
      const reportResponse = await adminApi.purgeSpecificTrialAccount(storeId, false);
      if (!reportResponse.data.success) {
        throw new Error('فشل الحصول على تقرير الحذف');
      }

      // Then actually delete
      const deleteResponse = await adminApi.purgeSpecificTrialAccount(storeId, true);
      if (deleteResponse.data.success) {
        setSuccess(`تم حذف الحساب التجريبي "${deleteResponse.data.data.store.name}" بنجاح`);
        // Reload stores
        await loadTrialStores();
        if (purgeReport) {
          await loadPurgeReport();
        }
      } else {
        setError('فشل حذف الحساب التجريبي');
      }
    } catch (err: any) {
      setError(err.message || 'فشل حذف الحساب التجريبي');
    } finally {
      setLoading(false);
      setDeletingStoreId(null);
    }
  };

  if (loading && trialStores.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-white">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">إدارة الحسابات التجريبية</h1>
          <p className="mt-2 text-slate-400">
            عرض وإدارة جميع الحسابات التجريبية وحذف بياناتها بأمان
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadPurgeReport}
            disabled={loading || trialStores.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showPurgeReport ? 'تحديث تقرير الحذف' : 'معاينة تقرير الحذف'}
          </button>
          {trialStores.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              حذف جميع الحسابات التجريبية
            </button>
          )}
        </div>
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

      {success && (
        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-green-300 flex items-center justify-between">
          <span>{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-400 hover:text-green-300 transition-colors ml-4"
            aria-label="إغلاق"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Purge Report */}
      {showPurgeReport && purgeReport && (
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-yellow-500/30">
          <div className="px-6 py-4 border-b border-slate-700 bg-yellow-900/10">
            <h2 className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              تقرير معاينة الحذف (Dry-Run)
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              هذا تقرير معاينة فقط. لم يتم حذف أي بيانات بعد.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-slate-400">عدد الحسابات التجريبية</div>
                <div className="text-2xl font-bold text-white mt-1">{purgeReport.storesFound}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-slate-400">المجموعات التي سيتم حذفها</div>
                <div className="text-2xl font-bold text-white mt-1">{purgeReport.collectionsToPurge.length}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-slate-400">الحجم المقدر</div>
                <div className="text-2xl font-bold text-white mt-1">{purgeReport.estimatedSize}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">المستندات في المجموعات التجريبية:</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(purgeReport.totalDocumentsToDelete).map(([collection, count]) => (
                  <div key={collection} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
                    <span className="text-slate-300 font-mono text-sm">{collection}</span>
                    <span className="text-white font-bold">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trial Stores List */}
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            الحسابات التجريبية ({trialStores.length})
          </h2>
        </div>
        {trialStores.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-400 text-lg">لا توجد حسابات تجريبية</p>
            <p className="text-slate-500 text-sm mt-2">جميع الحسابات التجريبية تستخدم مجموعات _test</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    اسم المتجر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    معرف المتجر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    عدد المستخدمين
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {trialStores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 mr-2">
                          تجريبي
                        </span>
                        <span className="text-white font-medium">{store.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-300 font-mono text-sm">{store.storeId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {formatDate(store.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {store.userCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setShowDeleteStoreConfirm(store.storeId)}
                        disabled={loading || deletingStoreId === store.storeId}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingStoreId === store.storeId ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            جاري الحذف...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            حذف
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-red-500/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">تأكيد حذف جميع الحسابات التجريبية</h2>
            </div>
            <div className="mb-6">
              <p className="text-slate-300 mb-4">
                ⚠️ <strong>تحذير:</strong> هذا الإجراء سيقوم بحذف:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 mb-4">
                <li>جميع الحسابات التجريبية ({trialStores.length} حساب)</li>
                <li>جميع المستخدمين المرتبطين بهذه الحسابات</li>
                <li>جميع البيانات في المجموعات التجريبية (_test)</li>
              </ul>
              <p className="text-red-400 font-semibold">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه!
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={loading}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Specific Store Confirmation Modal */}
      {showDeleteStoreConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-red-500/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">تأكيد حذف الحساب التجريبي</h2>
            </div>
            <div className="mb-6">
              <p className="text-slate-300 mb-4">
                ⚠️ <strong>تحذير:</strong> هذا الإجراء سيقوم بحذف:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2 mb-4">
                <li>الحساب التجريبي: <strong className="text-white">{showDeleteStoreConfirm}</strong></li>
                <li>جميع المستخدمين المرتبطين بهذا الحساب</li>
                <li>جميع البيانات في المجموعات التجريبية لهذا الحساب</li>
              </ul>
              <p className="text-red-400 font-semibold">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه!
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteStoreConfirm(null)}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteSpecific(showDeleteStoreConfirm)}
                disabled={loading}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrialAccountsPage;

