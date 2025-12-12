import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store';
import { LockIcon } from '@/shared/assets/icons';
import { authApi } from '@/lib/api/client';

const ExpiredSubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [contactNumber, setContactNumber] = useState<string>('0593202029');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch contact number from backend
    const fetchContactNumber = async () => {
      try {
        const response = await authApi.getContactNumber();
        if (response.data.success && response.data.data.contactNumber) {
          setContactNumber(response.data.data.contactNumber);
        }
      } catch (error) {
        console.error('Failed to fetch contact number:', error);
        // Keep default value if fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchContactNumber();
  }, []);

  useEffect(() => {
    // If user is not authenticated, redirect to login
    // But allow authenticated users with expired subscriptions to stay on this page
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/20 mb-6">
            <LockIcon className="h-8 w-8 text-red-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-4">
            انتهت صلاحية الاشتراك
          </h1>

          {/* Message */}
          <p className="text-slate-300 mb-6 leading-relaxed">
            عذراً، انتهت صلاحية اشتراك المتجر الخاص بك. يرجى تجديد الاشتراك للوصول إلى النظام.
          </p>

          {/* Additional Info */}
          <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-right">
            <p className="text-sm text-slate-400 mb-2">
              للاستفسار أو تجديد الاشتراك، يرجى التواصل مع:
            </p>
            {loading ? (
              <p className="text-sm text-slate-300 font-medium animate-pulse">
                جاري التحميل...
              </p>
            ) : (
              <a
                href={`tel:${contactNumber}`}
                className="text-lg text-blue-400 font-bold hover:text-blue-300 transition-colors inline-block"
              >
                {contactNumber}
              </a>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            العودة إلى صفحة تسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpiredSubscriptionPage;

