import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS, LockIcon } from '@/shared/constants';

interface ResetPasswordPageProps {
    onPasswordResetSuccess?: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onPasswordResetSuccess }) => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password.length < 8) {
            setError(AR_LABELS.passwordTooShort);
            return;
        }

        if (password !== confirmPassword) {
            setError(AR_LABELS.passwordsDoNotMatch);
            return;
        }

        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            console.log('Password reset successfully.');
            setSuccessMessage(AR_LABELS.passwordUpdatedSuccess);
            setIsLoading(false);
            
            // Redirect to login after a short delay
            setTimeout(() => {
                if (onPasswordResetSuccess) {
                    onPasswordResetSuccess();
                } else {
                    navigate('/login');
                }
            }, 2000);

        }, 1000);
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{AR_LABELS.resetPassword}</h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="password" className="sr-only">{AR_LABELS.newPassword}</label>
                    <div className="relative">
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <LockIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-right bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder={AR_LABELS.newPassword}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="sr-only">{AR_LABELS.confirmPassword}</label>
                    <div className="relative">
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <LockIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            className="w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-right bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder={AR_LABELS.confirmPassword}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {successMessage && <p className="text-green-500 text-sm text-center">{successMessage}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading || !!successMessage}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
                    >
                        {isLoading ? 'جارِ التحديث...' : AR_LABELS.updatePassword}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ResetPasswordPage;
