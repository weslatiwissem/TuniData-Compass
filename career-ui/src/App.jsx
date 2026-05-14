// src/App.jsx — white/blue redesign
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Topbar from './components/Topbar';
import DiscoverPage from './pages/DiscoverPage';
import JobsPage from './pages/JobsPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import UserDashboardPage from './pages/UserDashboardPage';
import SavedPage from './pages/SavedPage';
import './App.css';

function Router() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('discover');
  const [pageParams, setPageParams] = useState({});

  useEffect(() => {
    if (user && page === 'auth') {
      setPage('dashboard');
      setPageParams({});
    }
  }, [user]);

  const navigate = (target, params = {}) => {
    const protected_ = ['profile', 'dashboard', 'saved'];
    if (protected_.includes(target) && !user) {
      setPage('auth');
      setPageParams({ tab: 'login' });
      return;
    }
    if (target === 'auth-login')    { setPage('auth'); setPageParams({ tab: 'login' });    return; }
    if (target === 'auth-register') { setPage('auth'); setPageParams({ tab: 'register' }); return; }
    setPage(target);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 20,
        background: 'var(--surface-1)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--blue-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(37,99,235,.25)',
        }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="1" fill="none" />
            <path d="M16 7L17.5 16L16 15L14.5 16Z" fill="white" />
            <path d="M16 25L17.5 16L16 17L14.5 16Z" fill="rgba(255,255,255,.5)" />
            <circle cx="16" cy="16" r="2" fill="white" />
          </svg>
        </div>
        <div style={{
          width: 36, height: 36, border: '2px solid var(--border)',
          borderTop: '2px solid var(--blue-500)', borderRadius: '50%',
          animation: 'spin .75s linear infinite',
        }} />
        <span style={{
          fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: 3, textTransform: 'uppercase',
        }}>Loading</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }}>
      {page !== 'auth' && <Topbar currentPage={page} onNavigate={navigate} />}

      {page === 'discover'  && <DiscoverPage onNavigate={navigate} />}
      {page === 'jobs'      && (
        <JobsPage
          initialSearch={pageParams.search || ''}
          initialDomain={pageParams.domain || ''}
          initialJobId={pageParams.jobId ?? null}
        />
      )}
      {page === 'auth'      && <AuthPage initialTab={pageParams.tab || 'login'} onSuccess={() => setPage('dashboard')} />}

      {page === 'dashboard' && (
        user
          ? <UserDashboardPage onNavigate={navigate} />
          : <AuthPage initialTab="login" onSuccess={() => setPage('dashboard')} />
      )}

      {page === 'profile' && (user ? <ProfilePage onNavigate={navigate} /> : <AuthPage initialTab="login" onSuccess={() => setPage('profile')} />)}
      {page === 'saved'   && <SavedPage onNavigate={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}