import React, { useState } from 'react';
import { AR_LABELS, MailIcon } from '@/shared/constants';

interface ForgotPasswordFormProps {
  onCodeSent: (email: string) => void;
  onBackToLogin: () => void;
}

const ForgotPasswordForm = ({ onCodeSent, onBackToLogin }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('الرجاء إدخال بريد إلكتروني صالح.');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (email.toLowerCase() === 'adminn@pos.com') {
        onCodeSent(email);
      } else {
        setError(AR_LABELS.emailNotRegistered);
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl bg-white/90 p-8 shadow-2xl ring-1 ring-gray-900/10 backdrop-blur-xl dark:bg-gray-900/70 dark:ring-white/10 sm:p-10">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/40">
          <span className="text-xl font-bold">P</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {AR_LABELS.forgotPassword}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          أدخل بريدك الإلكتروني لإرسال رمز التحقق.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="sr-only">
            {AR_LABELS.email}
          </label>
          <div className="relative group">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <MailIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-full border-2 border-gray-200 bg-gray-50 py-3.5 pl-4 pr-12 text-right text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder={AR_LABELS.email}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-center text-sm text-red-700 animate-shake dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'جارِ الإرسال...' : AR_LABELS.sendVerificationCode}
          </button>
        </div>
        <div className="text-center text-sm">
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              onBackToLogin();
            }}
            className="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400"
          >
            {AR_LABELS.backToLogin}
          </a>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
