import React, { useState } from 'react';
import { AR_LABELS } from '../../../../shared/constants';

interface VerificationPageProps {
  email: string;
  onVerified: () => void;
  onBackToLogin: () => void;
}

const VerificationPage = ({ email, onVerified, onBackToLogin }: VerificationPageProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('يجب أن يتكون الرمز من 6 أرقام.');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (code === '123456') {
        onVerified();
      } else {
        setError(AR_LABELS.invalidCode);
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl bg-white/80 p-8 shadow-2xl ring-1 ring-gray-900/10 backdrop-blur-xl dark:bg-gray-900/70 dark:ring-white/10 sm:p-10">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/40">
          <span className="text-xl font-bold">P</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {AR_LABELS.enterVerificationCode}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {AR_LABELS.verificationCodeSent} <span className="font-mono">{email}</span>
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="code" className="sr-only">
            {AR_LABELS.verificationCode}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            maxLength={6}
            required
            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 text-center font-mono text-2xl tracking-[1em] transition-all duration-200 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-800"
            placeholder="------"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>

        {error && (
          <div className="text-center text-sm text-red-700 animate-shake dark:text-red-300">{error}</div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:from-orange-600 hover:to-amber-700 focus:outline-none focus:ring-4 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'جارِ التحقق...' : AR_LABELS.verifyCode}
          </button>
        </div>
        <div className="text-center text-sm">
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              onBackToLogin();
            }}
            className="font-medium text-orange-600 transition-colors hover:text-orange-700 hover:underline dark:text-orange-400"
          >
            {AR_LABELS.backToLogin}
          </a>
        </div>
      </form>
    </div>
  );
};

export default VerificationPage;
