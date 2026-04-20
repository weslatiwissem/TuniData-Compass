// src/App.jsx
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Topbar from './components/Topbar';
import DiscoverPage from './pages/DiscoverPage';
import JobsPage from './pages/JobsPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import SavedPage from './pages/SavedPage';
import './App.css';

function Router() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('discover');
  const [pageParams, setPageParams] = useState({});

  // Redirect to dashboard as soon as user becomes authenticated
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
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'var(--ink)' }}>
        <div style={{ width:36, height:36, border:'2px solid var(--line)', borderTop:'2px solid var(--gold)', borderRadius:'50%', animation:'spin .75s linear infinite' }} />
        <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--ivory3)', letterSpacing:2 }}>LOADING</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--ink)' }}>
      {page !== 'auth' && <Topbar currentPage={page} onNavigate={navigate} />}

      {page === 'discover'  && <DiscoverPage onNavigate={navigate} />}
      {page === 'jobs'      && <JobsPage initialSearch={pageParams.search||''} initialDomain={pageParams.domain||''} />}
      {page === 'auth'      && <AuthPage initialTab={pageParams.tab||'login'} onSuccess={() => setPage('dashboard')} />}
      {page === 'profile'   && (user ? <ProfilePage onNavigate={navigate} /> : <AuthPage initialTab="login" onSuccess={() => setPage('profile')} />)}
      {page === 'dashboard' && (user ? <DashboardPage onNavigate={navigate} /> : <AuthPage initialTab="login" onSuccess={() => setPage('dashboard')} />)}
      {page === 'saved'     && <SavedPage onNavigate={navigate} />}
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
