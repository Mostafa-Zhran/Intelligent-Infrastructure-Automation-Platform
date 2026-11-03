import React, { useState, useEffect } from 'react';
import { BackgroundEffects } from './components/layout/BackgroundEffects';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Toast } from './components/ui/Toast';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ResetLinkExpiredPage } from './pages/ResetLinkExpiredPage';
import { ProfilePage } from './pages/ProfilePage';
import { NoAccessPage } from './pages/NoAccessPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { DeploymentDetailsPage } from './pages/DeploymentDetailsPage';
import { DeploymentLogsPage } from './pages/DeploymentLogsPage';
import { PageId, UserProfile, ToastNotification, ProjectItem, DeploymentRecord } from './types';
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

  // Navigation state (sync with URL path)
  const [currentPage, setCurrentPage] = useState<PageId>(() => {
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    if (path === 'reset-link-expired') {
      return 'reset-link-expired';
    }
    if (path === 'reset-password' || params.has('token')) {
      return 'reset-password';
    }
    if (path === 'signup') {
      return 'signup';
    }
    if (path === 'signin') {
      return 'signin';
    }
    if (path === 'forgot-password') {
      return 'forgot-password';
    }
    if (path === 'dashboard') {
      return cachedUser ? 'dashboard' : 'signin';
    }
    if (path === 'profile') {
      return cachedUser ? 'profile' : 'signin';
    }
    if (path === 'projects') {
      return cachedUser ? 'projects' : 'signin';
    }
    if (path === 'new-project') {
      return cachedUser ? 'new-project' : 'signin';
    }
    if (path === 'project-details') {
      return cachedUser ? 'project-details' : 'signin';
    }
    if (path === 'deployments') {
      return cachedUser ? 'deployments' : 'signin';
    }
    if (path === 'deployment-details') {
      return cachedUser ? 'deployment-details' : 'signin';
    }
    if (path === 'deployment-logs') {
      return cachedUser ? 'deployment-logs' : 'signin';
    }
    if (path === 'no-access') {
      return 'no-access';
    }
    return 'landing';
  });

  // Selected project & deployment entity tracking for drill-down views
  const [selectedProject, setSelectedProject] = useState<ProjectItem | undefined>(undefined);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentRecord | undefined>(undefined);

  // Toast notification state
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });
  };

  // Revalidate session with backend on load
  useEffect(() => {
    if (!authApi.hasToken()) {
      setIsAuthChecking(false);
      return;
    }

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
          const protectedPages = ['profile', 'dashboard', 'projects', 'new-project', 'project-details', 'deployments', 'deployment-details', 'deployment-logs'];
          if (protectedPages.includes(path)) {
            setCurrentPage(path as PageId);
          } else if (path === '') {
            setCurrentPage('dashboard');
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
          const protectedPages = ['profile', 'dashboard', 'projects', 'new-project', 'project-details', 'deployments', 'deployment-details', 'deployment-logs'];
          if (protectedPages.includes(path)) {
            setCurrentPage('signin');
            window.history.replaceState({}, document.title, '/signin');
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
          const protectedPages = ['profile', 'dashboard', 'projects', 'new-project', 'project-details', 'deployments', 'deployment-details', 'deployment-logs'];
          if (protectedPages.includes(path)) {
            setCurrentPage('signin');
            window.history.replaceState({}, document.title, '/signin');
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
      if (path === 'reset-link-expired') {
        setCurrentPage('reset-link-expired');
      } else if (path === 'reset-password' || params.has('token')) {
        setCurrentPage('reset-password');
      } else if (path === 'signup') {
        setCurrentPage('signup');
      } else if (path === 'signin') {
        setCurrentPage('signin');
      } else if (path === 'forgot-password') {
        setCurrentPage('forgot-password');
      } else if (path === 'dashboard') {
        setCurrentPage('dashboard');
      } else if (path === 'profile') {
        setCurrentPage('profile');
      } else if (path === 'projects') {
        setCurrentPage('projects');
      } else if (path === 'new-project') {
        setCurrentPage('new-project');
      } else if (path === 'project-details') {
        setCurrentPage('project-details');
      } else if (path === 'deployments') {
        setCurrentPage('deployments');
      } else if (path === 'deployment-details') {
        setCurrentPage('deployment-details');
      } else if (path === 'deployment-logs') {
        setCurrentPage('deployment-logs');
      } else if (path === 'no-access') {
        setCurrentPage('no-access');
      } else {
        setCurrentPage('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guarded navigation
  const handleNavigate = (page: PageId) => {
    // Prevent navigating to protected views without an active account session
    const protectedPages: PageId[] = [
      'profile',
      'dashboard',
      'projects',
      'new-project',
      'project-details',
      'deployments',
      'deployment-details',
      'deployment-logs',
    ];
    if (protectedPages.includes(page) && !isAuthenticated && !user && !isAuthChecking) {
      showToast('error', 'Authentication Required', 'Please sign in or create an account to access this console view.');
      setCurrentPage('signin');
      window.history.pushState({}, document.title, '/signin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const newPath = page === 'landing' ? '/' : `/${page}`;
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
    setCurrentPage('dashboard');
    window.history.pushState({}, document.title, '/dashboard');
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
    setCurrentPage('landing');
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

  // Fallback guest user for 403 / dashboard fallback
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

      {/* Shared Header on every page with Auth Awareness & Navigation */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isAuthenticated={isAuthenticated}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main Content View with transition */}
      <main className="flex-1 flex flex-col justify-center relative z-10 w-full animate-slideUpFade">
        {currentPage === 'landing' && (
          <LandingPage
            onNavigate={handleNavigate}
            isAuthenticated={isAuthenticated}
          />
        )}

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

        {currentPage === 'reset-link-expired' && (
          <ResetLinkExpiredPage
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

        {currentPage === 'dashboard' && (
          <DashboardPage
            user={fallbackUser}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentPage === 'projects' && (
          <ProjectsPage
            onNavigate={handleNavigate}
            onSelectProject={(project) => {
              setSelectedProject(project);
              handleNavigate('project-details');
            }}
            onShowToast={showToast}
          />
        )}

        {currentPage === 'new-project' && (
          <NewProjectPage
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentPage === 'project-details' && (
          <ProjectDetailsPage
            project={selectedProject}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentPage === 'deployments' && (
          <DeploymentsPage
            onNavigate={handleNavigate}
            onSelectDeployment={(dep) => {
              setSelectedDeployment(dep);
              handleNavigate('deployment-details');
            }}
            onShowToast={showToast}
          />
        )}

        {currentPage === 'deployment-details' && (
          <DeploymentDetailsPage
            deployment={selectedDeployment}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentPage === 'deployment-logs' && (
          <DeploymentLogsPage
            onNavigate={handleNavigate}
            onShowToast={showToast}
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
