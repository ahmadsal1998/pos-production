import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AR_LABELS } from '@/shared/constants';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';
import { AuthService } from '@/features/auth/services';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate code format
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            setError('يجب أن يتكون الرمز من 6 أرقام.');
            return;
        }

        setIsLoading(true);

        try {
            // Call the actual API to verify OTP
            await AuthService.verifyCode(email, code);
            
            // Success - navigate to reset password page
            if (onVerified) {
                onVerified();
            } else {
                navigate('/reset-password', { state: { email } });
            }
        } catch (err: any) {
            // Show error message
            const errorMessage = err.message || AR_LABELS.invalidCode || 'رمز التحقق غير صحيح';
            setError(errorMessage);
            console.error('Verification error:', err);
        } finally {
            setIsLoading(false);
        }
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
                            onChange={(e) => {
                                // Only allow digits, max 6 characters
                                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                setCode(value);
                                setError(''); // Clear error when user types
                            }}
                            inputMode="numeric"
                            aria-invalid={Boolean(error) || undefined}
                            aria-describedby={error ? 'verification-error' : undefined}
                        />
                        <label htmlFor="code" className={`pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-500 transition-all duration-200 ${
                            code
                                ? '-translate-y-5 text-xs text-blue-600'
                                : 'peer-focus:-translate-y-5 peer-focus:text-xs peer-focus:text-blue-600'
                        }`}>
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
