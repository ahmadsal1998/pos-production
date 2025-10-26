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
    <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {AR_LABELS.enterVerificationCode}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
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
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 text-center font-mono text-2xl tracking-[1em] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700"
            placeholder="------"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-lg border border-transparent bg-orange-500 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-orange-300"
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
            className="font-medium text-orange-600 hover:text-orange-500"
          >
            {AR_LABELS.backToLogin}
          </a>
        </div>
      </form>
    </div>
  );
};

export default VerificationPage;
