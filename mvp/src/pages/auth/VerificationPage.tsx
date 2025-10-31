import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AR_LABELS } from '@/shared/constants';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';

interface VerificationPageProps {
    email?: string;
    onVerified?: () => void;
    onBackToLogin?: () => void;
}

const VerificationPage: React.FC<VerificationPageProps> = ({ email: propEmail, onVerified, onBackToLogin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = propEmail || location.state?.email || 'user@example.com';
    
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
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
                if (onVerified) {
                    onVerified();
                } else {
                    navigate('/reset-password');
                }
            } else {
                setError(AR_LABELS.invalidCode);
            }
            setIsLoading(false);
        }, 1000);
    };

    const handleBackToLogin = () => {
        if (onBackToLogin) {
            onBackToLogin();
        } else {
            navigate('/login');
        }
    };

    return (
        <AuthLayout title={AR_LABELS.enterVerificationCode} subtitle={`${AR_LABELS.verificationCodeSent} ${email}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <div className="relative">
                        <input
                            id="code"
                            name="code"
                            type="text"
                            maxLength={6}
                            required
                            className="peer w-full py-4 rounded-2xl border border-gray-200 bg-gray-50 text-center text-2xl font-mono tracking-[1em] placeholder-transparent transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800"
                            placeholder="------"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                            inputMode="numeric"
                            pattern="\\d{6}"
                            aria-invalid={Boolean(error) || undefined}
                            aria-describedby={error ? 'verification-error' : undefined}
                        />
                        <label htmlFor="code" className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-500 transition-all duration-200 peer-focus:-translate-y-5 peer-focus:text-xs peer-focus:text-blue-600">
                            {AR_LABELS.verificationCode}
                        </label>
                    </div>
                </div>
                
                {error && <p id="verification-error" role="alert" aria-live="assertive" className="text-center text-sm text-red-700 animate-shake dark:text-red-300">{error}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-4 px-4 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/40 transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? 'جارِ التحقق...' : AR_LABELS.verifyCode}
                    </button>
                </div>
                 <div className="text-sm text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleBackToLogin(); }} className="font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400">
                        {AR_LABELS.backToLogin}
                    </a>
                </div>
            </form>
        </AuthLayout>
    );
};

export default VerificationPage;
