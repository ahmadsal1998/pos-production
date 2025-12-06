import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { adminApi } from '@/lib/api/client';

interface Store {
  id: string;
  storeId: string;
  name: string;
  prefix: string;
  createdAt: string;
  updatedAt: string;
}

const AdminDashboard = () => {
  const location = useLocation();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    storeId: '',
    prefix: '',
    createDefaultAdmin: false,
    defaultAdminEmail: '',
    defaultAdminPassword: '',
    defaultAdminName: '',
  });

  useEffect(() => {
    // Only load stores if we're on the stores or dashboard page
    if (location.pathname === '/admin/dashboard' || location.pathname === '/admin/stores') {
      loadStores();
    } else {
      setLoading(false);
    }
  }, [location.pathname]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getStores();
      if (response.data.success) {
        setStores(response.data.data.stores);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        storeId: store.storeId,
        prefix: store.prefix,
        createDefaultAdmin: false,
        defaultAdminEmail: '',
        defaultAdminPassword: '',
        defaultAdminName: '',
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        storeId: '',
        prefix: '',
        createDefaultAdmin: false,
        defaultAdminEmail: '',
        defaultAdminPassword: '',
        defaultAdminName: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStore(null);
    setFormData({
      name: '',
      storeId: '',
      prefix: '',
      createDefaultAdmin: false,
      defaultAdminEmail: '',
      defaultAdminPassword: '',
      defaultAdminName: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStore) {
        await adminApi.updateStore(editingStore.id, { name: formData.name });
      } else {
        const payload: any = {
          name: formData.name,
          storeId: formData.storeId,
          prefix: formData.prefix,
        };
        
        // Include default admin creation if requested
        if (formData.createDefaultAdmin) {
          payload.createDefaultAdmin = true;
          payload.defaultAdminEmail = formData.defaultAdminEmail;
          payload.defaultAdminPassword = formData.defaultAdminPassword;
          payload.defaultAdminName = formData.defaultAdminName || `Store Admin - ${formData.name}`;
        }
        
        const response = await adminApi.createStore(payload);
        
        // Show success message with admin credentials if created
        if (response.data.data?.defaultAdmin) {
          const admin = response.data.data.defaultAdmin;
          alert(`Store created successfully!\n\nDefault Admin User Created:\nUsername: ${admin.username}\nEmail: ${admin.email}\n\nPlease save these credentials securely.`);
        }
      }
      handleCloseModal();
      loadStores();
    } catch (err: any) {
      setError(err.message || 'Failed to save store');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      return;
    }
    try {
      await adminApi.deleteStore(id);
      loadStores();
    } catch (err: any) {
      setError(err.message || 'Failed to delete store');
    }
  };

  // Render different content based on route
  if (location.pathname === '/admin/settings') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">System Settings</h1>
          <div className="bg-slate-800 rounded-lg p-6 text-white">
            <p className="text-slate-300">System settings page coming soon...</p>
          </div>
        </div>
      </div>
    );
  }

  if (location.pathname === '/admin/users') {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Users & Permissions</h1>
          <div className="bg-slate-800 rounded-lg p-6 text-white">
            <p className="text-slate-300">User management page coming soon...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {location.pathname === '/admin/stores' ? 'Store Management' : 'Admin Dashboard'}
          </h1>
          <p className="mt-2 text-slate-400">
            {location.pathname === '/admin/stores' 
              ? 'Create and manage stores in the system' 
              : 'Manage stores and system settings'}
          </p>
        </div>
        {(location.pathname === '/admin/dashboard' || location.pathname === '/admin/stores') && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Store
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Stores</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Store Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Store ID
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Prefix
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-slate-400">
                    No stores found. Create your first store to get started.
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {store.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {store.storeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {store.prefix}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(store.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(store)}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(store.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-white">
              {editingStore ? 'Edit Store' : 'Create New Store'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {!editingStore && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Store ID
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.storeId}
                      onChange={(e) => setFormData({ ...formData, storeId: e.target.value.toLowerCase() })}
                      pattern="[a-z0-9_]+"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., store1"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Lowercase letters, numbers, and underscores only
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.prefix}
                      onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toLowerCase() })}
                      pattern="[a-z0-9_]+"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., store1"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Used for collection names (e.g., {formData.prefix || 'store1'}_products)
                    </p>
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
                        Create default store admin user
                      </label>
                    </div>
                    
                    {formData.createDefaultAdmin && (
                      <div className="space-y-3 mt-3 pl-6 border-r-2 border-blue-600">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Admin Email
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
                            Admin Password
                          </label>
                          <input
                            type="password"
                            required={formData.createDefaultAdmin}
                            value={formData.defaultAdminPassword}
                            onChange={(e) => setFormData({ ...formData, defaultAdminPassword: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Minimum 6 characters"
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Admin Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.defaultAdminName}
                            onChange={(e) => setFormData({ ...formData, defaultAdminName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Store Admin - ${formData.name || 'Store Name'}`}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          A default admin user will be created for this store. The username will be auto-generated from the email.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingStore ? 'Update' : 'Create'}
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

