import React, { useState } from 'react';
import { AR_LABELS, UserIcon, LockIcon } from '../../constants';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onForgotPassword: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onForgotPassword }) => {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!emailOrUsername || !password) {
            setError('الرجاء إدخال البريد الإلكتروني/اسم المستخدم وكلمة المرور.');
            return;
        }

        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            if ((emailOrUsername.toLowerCase() === 'admin' || emailOrUsername.toLowerCase() === 'admin@pos.com') && password === 'password123') {
                onLoginSuccess();
            } else {
                setError(AR_LABELS.invalidCredentials);
            }
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl dark:shadow-gray-900/40 rounded-2xl p-8 space-y-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-orange-500 mb-1">PoshPointHub</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{AR_LABELS.login}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="emailOrUsername" className="sr-only">{AR_LABELS.emailOrUsername}</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="emailOrUsername"
                            name="emailOrUsername"
                            type="text"
                            autoComplete="username"
                            required
                            className="w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                            placeholder={AR_LABELS.emailOrUsername}
                            value={emailOrUsername}
                            onChange={(e) => setEmailOrUsername(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="password" className="sr-only">{AR_LABELS.password}</label>
                    <div className="relative">
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <LockIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="w-full pl-3 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                            placeholder={AR_LABELS.password}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>
                {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p></div>}
                <div className="text-sm text-left">
                    <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }} className="font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors">
                        {AR_LABELS.forgotPassword}
                    </a>
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isLoading ? 'جارِ التحميل...' : AR_LABELS.login}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LoginPage;
