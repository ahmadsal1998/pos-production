import React, { useState } from 'react';
import { AR_LABELS } from '../../constants';

interface VerificationPageProps {
    email: string;
    onVerified: () => void;
    onBackToLogin: () => void;
}

const VerificationPage: React.FC<VerificationPageProps> = ({ email, onVerified, onBackToLogin }) => {
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
                onVerified();
            } else {
                setError(AR_LABELS.invalidCode);
            }
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{AR_LABELS.enterVerificationCode}</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {AR_LABELS.verificationCodeSent} <span className="font-mono">{email}</span>
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="code" className="sr-only">{AR_LABELS.verificationCode}</label>
                    <input
                        id="code"
                        name="code"
                        type="text"
                        maxLength={6}
                        required
                        className="w-full py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-center tracking-[1em] text-2xl font-mono bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="------"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                </div>
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
                    >
                        {isLoading ? 'جارِ التحقق...' : AR_LABELS.verifyCode}
                    </button>
                </div>
                 <div className="text-sm text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); onBackToLogin(); }} className="font-medium text-orange-600 hover:text-orange-500">
                        {AR_LABELS.backToLogin}
                    </a>
                </div>
            </form>
        </div>
    );
};

export default VerificationPage;
