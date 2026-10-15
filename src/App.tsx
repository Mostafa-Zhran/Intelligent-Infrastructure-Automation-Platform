import React, { useState, useEffect } from 'react';
import { BackgroundEffects } from './components/layout/BackgroundEffects';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Toast } from './components/ui/Toast';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { NoAccessPage } from './pages/NoAccessPage';
import { PageId, UserProfile, ToastNotification } from './types';

export const App: React.FC = () => {
  // Navigation state (initial screen is 'signin')
  const [currentPage, setCurrentPage] = useState<PageId>('signin');

  // Authenticated state: false by default until user signs in or signs up
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });
  };

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Guarded navigation
  const handleNavigate = (page: PageId) => {
    // Prevent navigating to profile without an active account session
    if (page === 'profile' && (!isAuthenticated || !user)) {
      showToast('error', 'Authentication Required', 'Please sign in or create an account to view your account profile.');
      setCurrentPage('signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignInSuccess = (email: string) => {
    const authenticatedUser: UserProfile = {
      id: 'dev-8842',
      fullName: 'Alex Morgan',
      email: email || 'alex.morgan@enterprise.dev',
      avatarInitials: 'AM',
      isVerified: true,
      role: 'viewer',
      title: 'Lead Cloud Infrastructure SRE',
      organization: 'AutoDeployers Global Corp',
      timezone: 'UTC-05:00 (Eastern Time)',
    };
    setUser(authenticatedUser);
    setIsAuthenticated(true);
    showToast('success', 'Session Established', 'Welcome back to Intelligent Infrastructure Platform');
    setCurrentPage('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignUpSuccess = (data: { name: string; email: string }) => {
    const initials = data.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AM';

    const newUser: UserProfile = {
      id: `dev-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: data.name,
      email: data.email,
      avatarInitials: initials,
      isVerified: true,
      role: 'viewer',
      title: 'DevOps Engineer',
      organization: 'AutoDeployers Global Corp',
      timezone: 'UTC-05:00 (Eastern Time)',
    };
    setUser(newUser);
    setIsAuthenticated(true);
    showToast('success', 'Account Registered', 'Workspace credentials provisioned successfully');
    setCurrentPage('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    showToast('info', 'Signed Out', 'Your platform session has been cleanly terminated');
    setCurrentPage('signin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  // Fallback guest user for 403 screen if visited prior to sign in
  const fallbackUser: UserProfile = user || {
    id: 'guest',
    fullName: 'Guest User',
    email: 'guest@workspace.dev',
    avatarInitials: 'GU',
    isVerified: false,
    role: 'viewer',
    title: 'Unauthenticated Session',
    organization: 'Guest Access',
    timezone: 'UTC',
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#07070D] text-white selection:bg-violet-600/30 selection:text-white relative">
      {/* Visual background glows & engineering grid */}
      <BackgroundEffects />

      {/* Shared Header on every page with Auth Awareness */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isAuthenticated={isAuthenticated}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main Content View with transition */}
      <main className="flex-1 flex flex-col justify-center relative z-10 w-full animate-fadeIn">
        {currentPage === 'signin' && (
          <SignInPage
            onNavigate={handleNavigate}
            onSignInSuccess={handleSignInSuccess}
          />
        )}

        {currentPage === 'signup' && (
          <SignUpPage
            onNavigate={handleNavigate}
            onSignUpSuccess={handleSignUpSuccess}
          />
        )}

        {currentPage === 'forgot-password' && (
          <ForgotPasswordPage
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'reset-password' && (
          <ResetPasswordPage
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'profile' && (
          isAuthenticated && user ? (
            <ProfilePage
              user={user}
              onUpdateUser={handleUpdateUser}
              onShowToast={showToast}
              onNavigate={handleNavigate}
              onSignOut={handleSignOut}
            />
          ) : (
            <SignInPage
              onNavigate={handleNavigate}
              onSignInSuccess={handleSignInSuccess}
            />
          )
        )}

        {currentPage === 'no-access' && (
          <NoAccessPage
            user={fallbackUser}
            onNavigate={handleNavigate}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Shared Footer on every page */}
      <Footer />

      {/* Toast notifications */}
      <Toast
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

export default App;
