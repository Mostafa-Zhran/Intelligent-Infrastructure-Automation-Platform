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
import { authApi } from './services/api';

export const App: React.FC = () => {
  // Navigation state (automatically routes real email reset links)
  const [currentPage, setCurrentPage] = useState<PageId>(() => {
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (path === 'reset-password' || params.has('token')) {
      return 'reset-password';
    }
    if (path === 'signup') {
      return 'signup';
    }
    if (path === 'forgot-password') {
      return 'forgot-password';
    }
    return 'signin';
  });

  // Authenticated state: false by default until user signs in or signs up
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });
  };

  // Check existing session on load
  useEffect(() => {
    authApi
      .getProfile()
      .then((res) => {
        if (res?.user) {
          const u = res.user;
          const initials = (u.name || u.email.split('@')[0])
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'AM';

          setUser({
            id: u.id,
            fullName: u.name,
            email: u.email,
            avatarInitials: initials,
            isVerified: true,
            role: u.platform_role || 'USER',
            status: u.status || 'ACTIVE',
          });
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        // Not authenticated
      });
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (path === 'reset-password' || params.has('token')) {
        setCurrentPage('reset-password');
      } else if (path === 'signup') {
        setCurrentPage('signup');
      } else if (path === 'forgot-password') {
        setCurrentPage('forgot-password');
      } else if (path === 'profile') {
        setCurrentPage('profile');
      } else {
        setCurrentPage('signin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guarded navigation
  const handleNavigate = (page: PageId) => {
    // Prevent navigating to profile without an active account session
    if (page === 'profile' && (!isAuthenticated || !user)) {
      showToast('error', 'Authentication Required', 'Please sign in or create an account to view your account profile.');
      setCurrentPage('signin');
      window.history.pushState({}, document.title, '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const newPath = page === 'signin' ? '/' : `/${page}`;
    window.history.pushState({}, document.title, newPath);

    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignInSuccess = (userData: { id?: string; name?: string; email: string; role?: string; status?: string }) => {
    const displayName = userData.name || userData.email.split('@')[0];
    const initials = displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AM';

    const authenticatedUser: UserProfile = {
      id: userData.id || 'dev-8842',
      fullName: displayName,
      email: userData.email,
      avatarInitials: initials,
      isVerified: true,
      role: userData.role || 'USER',
      status: userData.status || 'ACTIVE',
    };
    setUser(authenticatedUser);
    setIsAuthenticated(true);
    showToast('success', 'Session Established', `Welcome back, ${displayName}!`);
    setCurrentPage('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignUpSuccess = (data: { id?: string; name: string; email: string; role?: string }) => {
    handleSignInSuccess(data);
  };

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      // ignore
    }
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
    role: 'USER',
    status: 'GUEST',
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
