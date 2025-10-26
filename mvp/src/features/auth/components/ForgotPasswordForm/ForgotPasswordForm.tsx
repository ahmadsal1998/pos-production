import React, { useState } from 'react';
import { AR_LABELS, MailIcon } from '../../../../shared/constants';

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
      if (email.toLowerCase() === 'admin@pos.com') {
        onCodeSent(email);
      } else {
        setError(AR_LABELS.emailNotRegistered);
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {AR_LABELS.forgotPassword}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          أدخل بريدك الإلكتروني لإرسال رمز التحقق.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="sr-only">
            {AR_LABELS.email}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <MailIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 pl-3 pr-10 text-right focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700"
              placeholder={AR_LABELS.email}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-lg border border-transparent bg-orange-500 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-orange-300"
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
            className="font-medium text-orange-600 hover:text-orange-500"
          >
            {AR_LABELS.backToLogin}
          </a>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
