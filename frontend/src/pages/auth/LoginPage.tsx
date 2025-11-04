import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store';
import { AR_LABELS, UserIcon, LockIcon } from '@/shared/constants';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // If authenticated, redirect immediately
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();

    if (!emailOrUsername || !password) {
      return;
    }

    try {
      await login({ emailOrUsername, password });
      navigate('/');
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <AuthLayout title={AR_LABELS.login} subtitle={AR_LABELS.welcomeBack}>
      <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <UserIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                </div>
                <input
                  id="emailOrUsername"
                  name="emailOrUsername"
                  type="text"
                  required
                  className="peer block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 pr-12 text-right text-sm text-gray-900 placeholder-transparent transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder={AR_LABELS.emailOrUsername}
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  disabled={isLoading}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <label htmlFor="emailOrUsername" className={`pointer-events-none absolute right-12 bg-transparent px-1 text-sm text-gray-500 transition-all duration-200 ${
                    emailOrUsername
                        ? '-top-2 bg-white text-xs text-blue-600 dark:bg-gray-900'
                        : 'top-1/2 -translate-y-1/2 peer-focus:-top-2 peer-focus:bg-white peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:bg-gray-900'
                }`}>
                  {AR_LABELS.emailOrUsername}
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                {AR_LABELS.password}
              </label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <LockIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="peer block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 pr-12 pl-12 text-right text-sm text-gray-900 placeholder-transparent transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder={AR_LABELS.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                />
                <label htmlFor="password" className={`pointer-events-none absolute right-12 bg-transparent px-1 text-sm text-gray-500 transition-all duration-200 ${
                    password
                        ? '-top-2 bg-white text-xs text-blue-600 dark:bg-gray-900'
                        : 'top-1/2 -translate-y-1/2 peer-focus:-top-2 peer-focus:bg-white peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:bg-gray-900'
                }`}>
                  {AR_LABELS.password}
                </label>
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 rounded-md dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <span className="text-sm">{showPassword ? 'إخفاء' : 'إظهار'}</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div id="login-error" role="alert" aria-live="assertive" className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 animate-shake dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400"
              onClick={() => navigate('/forgot-password')}
              disabled={isLoading}
            >
              {AR_LABELS.forgotPassword}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-2xl border border-transparent bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  {AR_LABELS.loggingIn}
                </div>
              ) : (
                AR_LABELS.login
              )}
            </button>
          </div>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;