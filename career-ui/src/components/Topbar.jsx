// src/components/Topbar.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';

export default function Topbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const initials = user
    ? (user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase()
    : 'U';

  const navLinks = [
    { id: 'discover', label: 'Discover' },
    { id: 'jobs', label: 'Jobs' },
    ...(user ? [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'saved', label: 'Saved' },
    ] : []),
  ];

  const notifications = [
    { icon: '🤖', text: 'AI matched 3 new roles for you', time: '2m ago', color: 'var(--gold)' },
    { icon: '📈', text: 'Profile views increased 40%', time: '1h ago', color: 'var(--green)' },
    { icon: '⭐', text: 'New: Data Engineer at InstaDeep', time: '3h ago', color: 'var(--blue)' },
  ];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,12,16,.9)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--line)', height: 60,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 20,
    }}>
      {/* Logo */}
      <button
        onClick={() => onNavigate('discover')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <CompassIcon />
        <span style={{ fontFamily: 'var(--f-display)', fontSize: 17, color: 'var(--ivory)' }}>
          Tuni<span style={{ color: 'var(--gold)' }}>Data</span> Compass
        </span>
      </button>

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
        {navLinks.map(link => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.id)}
            style={{
              background: currentPage === link.id ? 'var(--gold-dim)' : 'transparent',
              border: 'none', borderRadius: 'var(--r-sm)',
              padding: '6px 13px', cursor: 'pointer', fontSize: 13,
              color: currentPage === link.id ? 'var(--gold)' : 'var(--ivory2)',
              fontFamily: 'var(--f-ui)', transition: 'all .18s',
            }}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative', padding: 6 }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="var(--ivory2)" />
                </svg>
                <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', border: '1.5px solid var(--ink)' }} />
              </button>
              {notifOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 320, background: 'var(--ink2)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r)', overflow: 'hidden', zIndex: 200,
                  animation: 'fadeUp .2s ease',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase' }}>
                    Notifications
                  </div>
                  {notifications.map((n, i) => (
                    <div key={i} style={{ padding: '12px 16px', borderBottom: i < notifications.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', transition: 'background .18s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--ink3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{n.icon}</span>
                        <div>
                          <div style={{ fontSize: 13 }}>{n.text}</div>
                          <div style={{ fontSize: 11, color: 'var(--ivory3)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>{n.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 8px', borderRadius: 'var(--r-sm)',
                  transition: 'background .18s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--ink3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar initials={initials} size={32} color={user.avatar_color || 'var(--gold-dim)'} />
                <span style={{ fontSize: 13, color: 'var(--ivory2)' }}>{user.first_name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="var(--ivory3)" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 200, background: 'var(--ink2)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r)', overflow: 'hidden', zIndex: 200,
                  animation: 'fadeUp .2s ease',
                }}>
                  {[
                    { label: '👤  Profile', page: 'profile' },
                    { label: '📊  Dashboard', page: 'dashboard' },
                    { label: '⭐  Saved Jobs', page: 'saved' },
                  ].map(item => (
                    <button key={item.page} onClick={() => { onNavigate(item.page); setMenuOpen(false); }} style={{
                      display: 'block', width: '100%', padding: '11px 16px', background: 'none',
                      border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13,
                      color: 'var(--ivory2)', fontFamily: 'var(--f-ui)', transition: 'background .18s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--ink3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--line)' }}>
                    <button onClick={() => { logout(); setMenuOpen(false); }} style={{
                      display: 'block', width: '100%', padding: '11px 16px', background: 'none',
                      border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13,
                      color: 'var(--red)', fontFamily: 'var(--f-ui)', transition: 'background .18s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      ↩  Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate('auth-login')} style={{
              background: 'transparent', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
              padding: '8px 16px', color: 'var(--ivory2)', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--f-ui)', transition: 'all .18s',
            }}>Sign In</button>
            <button onClick={() => onNavigate('auth-register')} style={{
              background: 'var(--gold)', border: 'none', borderRadius: 'var(--r-sm)',
              padding: '8px 16px', color: '#0A0C10', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--f-ui)', fontWeight: 600, transition: 'all .18s',
            }}>Join Free</button>
          </>
        )}
      </div>

      {/* Close dropdowns on outside click */}
      {(menuOpen || notifOpen) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150 }} onClick={() => { setMenuOpen(false); setNotifOpen(false); }} />
      )}
    </header>
  );
}

function CompassIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="#e8a020" strokeWidth="1" strokeOpacity=".4" />
      <circle cx="16" cy="16" r="9" stroke="#e8a020" strokeWidth=".5" strokeOpacity=".25" />
      <path d="M16 4L18 16L16 14L14 16Z" fill="#e8a020" />
      <path d="M16 28L18 16L16 18L14 16Z" fill="#444a60" />
      <line x1="16" y1="2" x2="16" y2="5" stroke="#e8a020" strokeWidth="1.5" strokeOpacity=".6" />
      <circle cx="16" cy="16" r="2" fill="#e8a020" />
    </svg>
  );
}
