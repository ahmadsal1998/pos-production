import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, MailIcon } from '@/shared/constants';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';
import { AuthService } from '@/features/auth/services';

interface ForgotPasswordPageProps {
    onCodeSent?: (email: string) => void;
    onBackToLogin?: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onCodeSent, onBackToLogin }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('الرجاء إدخال بريد إلكتروني صالح.');
            return;
        }

        setIsLoading(true);

        try {
            // Call the actual API
            await AuthService.forgotPassword({ email });
            
            // Success - navigate to verification page
            if (onCodeSent) {
                onCodeSent(email);
            } else {
                // Navigate to verification page with email
                navigate('/verification', { state: { email } });
            }
        } catch (err: any) {
            // Show error message
            setError(err.message || AR_LABELS.emailNotRegistered || 'فشل إرسال رمز التحقق');
            console.error('Forgot password error:', err);
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
        <AuthLayout title={AR_LABELS.forgotPassword} subtitle="أدخل بريدك الإلكتروني لإرسال رمز التحقق.">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <div className="relative group">
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <MailIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                        </div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="peer block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 pr-12 text-right text-gray-900 placeholder-transparent transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                            placeholder={AR_LABELS.email}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            aria-invalid={Boolean(error) || undefined}
                            aria-describedby={error ? 'forgot-error' : undefined}
                        />
                        <label htmlFor="email" className={`pointer-events-none absolute right-12 bg-transparent px-1 text-sm text-gray-500 transition-all duration-200 ${
                            email
                                ? '-top-2 bg-white text-xs text-blue-600 dark:bg-gray-900'
                                : 'top-1/2 -translate-y-1/2 peer-focus:-top-2 peer-focus:bg-white peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:bg-gray-900'
                        }`}>
                            {AR_LABELS.email}
                        </label>
                    </div>
                </div>

                {error && <div id="forgot-error" role="alert" aria-live="assertive" className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-center text-sm text-red-700 animate-shake dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">{error}</div>}
                
                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-4 px-4 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/40 transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? 'جارِ الإرسال...' : AR_LABELS.sendVerificationCode}
                    </button>
                </div>
                <div className="text-sm text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleBackToLogin(); }} className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors dark:text-blue-400">
                        {AR_LABELS.backToLogin}
                    </a>
                </div>
            </form>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;
