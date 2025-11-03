import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AR_LABELS, LockIcon } from '@/shared/constants';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';
import { AuthService } from '@/features/auth/services';

interface ResetPasswordPageProps {
    onPasswordResetSuccess?: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onPasswordResetSuccess }) => {
    const navigate = useNavigate();
    const location = useLocation();
    // Get email from verification page state
    const email = location.state?.email || '';
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Validate email exists
        if (!email) {
            setError('البريد الإلكتروني غير موجود. الرجاء العودة إلى صفحة التحقق.');
            return;
        }

        // Validate password length (minimum 6 characters as per backend)
        if (password.length < 6) {
            setError(AR_LABELS.passwordTooShort || 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
            return;
        }

        if (password !== confirmPassword) {
            setError(AR_LABELS.passwordsDoNotMatch || 'كلمات المرور غير متطابقة.');
            return;
        }

        setIsLoading(true);

        try {
            // Call the actual API to reset password
            await AuthService.resetPassword({
                email,
                code: '', // Not needed since OTP is already verified
                newPassword: password,
            });
            
            // Success
            setSuccessMessage(AR_LABELS.passwordUpdatedSuccess || 'تم تحديث كلمة المرور بنجاح.');
            
            // Redirect to login after a short delay
            setTimeout(() => {
                if (onPasswordResetSuccess) {
                    onPasswordResetSuccess();
                } else {
                    navigate('/login');
                }
            }, 2000);
        } catch (err: any) {
            // Show error message
            const errorMessage = err.message || 'فشل تحديث كلمة المرور. الرجاء المحاولة مرة أخرى.';
            setError(errorMessage);
            console.error('Reset password error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout 
            title={AR_LABELS.resetPassword || 'إعادة تعيين كلمة المرور'} 
            subtitle="أدخل كلمة المرور الجديدة الخاصة بك"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <div className="relative group">
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <LockIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className={`peer block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 pr-12 text-right text-gray-900 placeholder-transparent transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${password ? 'has-value' : ''}`}
                                placeholder={AR_LABELS.newPassword}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(''); // Clear error when user types
                                }}
                                disabled={isLoading || !!successMessage}
                                aria-invalid={Boolean(error) || undefined}
                                aria-describedby={error ? 'reset-error' : undefined}
                            />
                            <label 
                                htmlFor="password" 
                                className={`pointer-events-none absolute right-12 bg-transparent px-1 text-sm text-gray-500 transition-all duration-200 ${
                                    password
                                        ? '-top-2 bg-white text-xs text-blue-600 dark:bg-gray-900'
                                        : 'top-1/2 -translate-y-1/2 peer-focus:-top-2 peer-focus:bg-white peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:bg-gray-900'
                                }`}
                            >
                                {AR_LABELS.newPassword}
                            </label>
                        </div>
                    </div>

                    <div>
                        <div className="relative group">
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <LockIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                            </div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                className={`peer block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 pr-12 text-right text-gray-900 placeholder-transparent transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${confirmPassword ? 'has-value' : ''}`}
                                placeholder={AR_LABELS.confirmPassword}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError(''); // Clear error when user types
                                }}
                                disabled={isLoading || !!successMessage}
                                aria-invalid={Boolean(error) || undefined}
                                aria-describedby={error ? 'reset-error' : undefined}
                            />
                            <label 
                                htmlFor="confirmPassword" 
                                className={`pointer-events-none absolute right-12 bg-transparent px-1 text-sm text-gray-500 transition-all duration-200 ${
                                    confirmPassword
                                        ? '-top-2 bg-white text-xs text-blue-600 dark:bg-gray-900'
                                        : 'top-1/2 -translate-y-1/2 peer-focus:-top-2 peer-focus:bg-white peer-focus:text-xs peer-focus:text-blue-600 dark:peer-focus:bg-gray-900'
                                }`}
                            >
                                {AR_LABELS.confirmPassword}
                            </label>
                        </div>
                    </div>
                </div>

                {error && (
                    <div 
                        id="reset-error" 
                        role="alert" 
                        aria-live="assertive" 
                        className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-center text-sm text-red-700 animate-shake dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                    >
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div 
                        role="alert" 
                        aria-live="assertive" 
                        className="rounded-xl border-2 border-green-200 bg-green-50 p-3 text-center text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
                    >
                        {successMessage}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading || !!successMessage}
                        className="w-full flex justify-center py-4 px-4 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/40 transition-all duration-200 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                جارِ التحديث...
                            </div>
                        ) : (
                            AR_LABELS.updatePassword || 'تحديث كلمة المرور'
                        )}
                    </button>
                </div>

                <div className="text-sm text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        disabled={isLoading || !!successMessage}
                        className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors dark:text-blue-400 disabled:opacity-50"
                    >
                        {AR_LABELS.backToLogin}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
