import { useState } from 'react';
import { AR_LABELS, UserIcon, LockIcon } from '@/shared/constants';

interface LoginFormProps {
  onLoginSuccess: () => void;
  onForgotPassword: () => void;
}

const LoginForm = ({ onLoginSuccess, onForgotPassword }: LoginFormProps) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!emailOrUsername || !password) {
      setError('الرجاء إدخال البريد الإلكتروني/اسم المستخدم وكلمة المرور.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (
        (emailOrUsername.toLowerCase() === 'admin' ||
          emailOrUsername.toLowerCase() === 'adminn@pos.com') &&
        password === 'password123'
      ) {
        onLoginSuccess();
      } else {
        setError(AR_LABELS.invalidCredentials);
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md space-y-8 rounded-3xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-gray-900/10 sm:p-10">
      {/* Logo & Header */}
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-blue-500/50 transition-transform hover:scale-105">
          <span className="text-3xl font-bold text-white">P</span>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          PoshPoint
        </h1>
        <p className="mt-2 text-sm text-gray-600">{AR_LABELS.login}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email/Username Input */}
        <div className="space-y-2">
          <label htmlFor="emailOrUsername" className="sr-only">
            {AR_LABELS.emailOrUsername}
          </label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              id="emailOrUsername"
              name="emailOrUsername"
              type="text"
              autoComplete="username"
              required
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3.5 pl-3 pr-12 text-right text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder={AR_LABELS.emailOrUsername}
              value={emailOrUsername}
              onChange={e => setEmailOrUsername(e.target.value)}
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor="password" className="sr-only">
            {AR_LABELS.password}
          </label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <LockIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3.5 pl-12 pr-12 text-right text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              placeholder={AR_LABELS.password}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 text-center text-sm text-red-700 animate-shake">
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Forgot Password Link */}
        <div className="text-right text-sm">
          <button
            type="button"
            onClick={onForgotPassword}
            className="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            {AR_LABELS.forgotPassword}
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/50 transition-all duration-200 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-500/60 focus:outline-none focus:ring-4 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              جارِ التحميل...
            </span>
          ) : (
            AR_LABELS.login
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="text-center text-xs text-gray-500">
        <p>تسجيل الدخول يعني موافقتك على شروط الاستخدام</p>
      </div>
    </div>
  );
};

export default LoginForm;
