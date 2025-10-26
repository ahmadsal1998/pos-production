import { useState } from 'react';
import {
  LoginForm,
  ForgotPasswordForm,
  VerificationForm,
  ResetPasswordForm,
} from './features/auth';
import { MainLayout } from './shared/components/layout';

export type AuthView = 'login' | 'forgot' | 'verify' | 'reset';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [emailForRecovery, setEmailForRecovery] = useState('');

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleCodeSent = (email: string) => {
    setEmailForRecovery(email);
    setAuthView('verify');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 font-sans dark:bg-gray-900">
        {authView === 'login' && (
          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={() => setAuthView('forgot')}
          />
        )}
        {authView === 'forgot' && (
          <ForgotPasswordForm
            onCodeSent={handleCodeSent}
            onBackToLogin={() => setAuthView('login')}
          />
        )}
        {authView === 'verify' && (
          <VerificationForm
            email={emailForRecovery}
            onVerified={() => setAuthView('reset')}
            onBackToLogin={() => setAuthView('login')}
          />
        )}
        {authView === 'reset' && (
          <ResetPasswordForm onPasswordResetSuccess={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return <MainLayout />;
};

export default App;
