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

const LOCAL_STORAGE_USER_KEY = 'iiap_user_session';

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const App: React.FC = () => {
  const cachedUser = getStoredUser();
  const [user, setUser] = useState<UserProfile | null>(cachedUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!cachedUser);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Navigation state (automatically routes real email reset links & preserves profile on refresh)
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
    if (path === 'profile') {
      return 'profile';
    }
    if (path === 'no-access') {
      return 'no-access';
    }
    if (cachedUser) {
      return 'profile';
    }
    return 'signin';
  });

  // Toast notification state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });
  };

  // Revalidate session with backend on load
  useEffect(() => {
    setIsAuthChecking(true);
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

          const authenticatedUser: UserProfile = {
            id: u.id,
            fullName: u.name,
            email: u.email,
            avatarInitials: initials,
            isVerified: true,
            role: u.platform_role || 'USER',
            status: u.status || 'ACTIVE',
          };

          setUser(authenticatedUser);
          setIsAuthenticated(true);
          try {
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(authenticatedUser));
          } catch {
            // ignore
          }

          const path = window.location.pathname.replace(/^\//, '').toLowerCase();
          if (path === 'profile' || path === '') {
            setCurrentPage('profile');
          }
        } else {
          // No user returned
          setIsAuthenticated(false);
          setUser(null);
          try {
            localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
          } catch {
            // ignore
          }
          const path = window.location.pathname.replace(/^\//, '').toLowerCase();
          if (path === 'profile') {
            setCurrentPage('signin');
            window.history.replaceState({}, document.title, '/');
          }
        }
      })
      .catch((err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err || '');
        const isUnauthorized =
          errorMsg.includes('401') ||
          errorMsg.toLowerCase().includes('authentication required') ||
          errorMsg.toLowerCase().includes('expired') ||
          errorMsg.toLowerCase().includes('invalid');

        if (isUnauthorized) {
          setIsAuthenticated(false);
          setUser(null);
          try {
            localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
            localStorage.removeItem('iiap_access_token');
          } catch {
            // ignore
          }
          const path = window.location.pathname.replace(/^\//, '').toLowerCase();
          if (path === 'profile') {
            setCurrentPage('signin');
            window.history.replaceState({}, document.title, '/');
          }
        }
      })
      .finally(() => {
        setIsAuthChecking(false);
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
    if (page === 'profile' && !isAuthenticated && !user && !isAuthChecking) {
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
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(authenticatedUser));
    } catch {
      // ignore
    }
    showToast('success', 'Session Established', `Welcome back, ${displayName}!`);
    setCurrentPage('profile');
    window.history.pushState({}, document.title, '/profile');
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
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    } catch {
      // ignore
    }
    showToast('info', 'Signed Out', 'Your platform session has been cleanly terminated');
    setCurrentPage('signin');
    window.history.pushState({}, document.title, '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
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
      <main className="flex-1 flex flex-col justify-center relative z-10 w-full animate-slideUpFade">
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
          isAuthChecking && !user ? (
            <div className="flex flex-col items-center justify-center min-h-[45vh] text-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/15" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
                <div className="absolute inset-[4px] rounded-full border border-transparent border-t-cyan-400/50 animate-spin" style={{ animationDuration: '0.75s', animationDirection: 'reverse' }} />
              </div>
              <div>
                <p className="text-[13px] text-white font-medium">Validating session</p>
                <p className="text-[11px] text-[#A1A1B5] font-mono mt-0.5">Checking credentials…</p>
              </div>
            </div>
          ) : isAuthenticated && user ? (
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
