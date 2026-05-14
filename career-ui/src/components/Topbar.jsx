// src/components/Topbar.jsx — refined professional topbar, no emojis
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
    { id: 'jobs',     label: 'Jobs'     },
    ...(user ? [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'saved',     label: 'Saved'     },
    ] : []),
  ];

  const notifications = [
    { text: 'AI matched 3 new roles for your profile', time: '2m ago', dot: 'var(--blue-500)'  },
    { text: 'Profile visibility increased by 40%',      time: '1h ago', dot: 'var(--emerald)'  },
    { text: 'New Data Engineer role at InstaDeep',      time: '3h ago', dot: 'var(--amber)'    },
  ];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,.97)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)',
      height: 58,
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      boxShadow: 'var(--shadow-xs)',
    }}>
      {/* Logo */}
      <button
        onClick={() => onNavigate('discover')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <CompassIcon />
        <span style={{
          fontFamily: 'var(--f-display)', fontSize: 16,
          color: 'var(--text-primary)', letterSpacing: '-.3px',
        }}>
          Tuni<em style={{ color: 'var(--blue-500)', fontStyle: 'normal' }}>DataCompass</em>
        </span>
      </button>

      <div style={{ width: 1, height: 18, background: 'var(--border)', marginLeft: 4 }} />

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: 2 }}>
        {navLinks.map(link => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.id)}
            style={{
              background: currentPage === link.id ? 'var(--blue-50)' : 'transparent',
              border: currentPage === link.id ? '1px solid var(--blue-200)' : '1px solid transparent',
              borderRadius: 'var(--r-sm)',
              padding: '6px 13px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: currentPage === link.id ? 600 : 400,
              color: currentPage === link.id ? 'var(--blue-600)' : 'var(--text-secondary)',
              fontFamily: 'var(--f-ui)',
              transition: 'all .18s',
            }}
            onMouseEnter={e => {
              if (currentPage !== link.id) {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (currentPage !== link.id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {user ? (
          <>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
                style={{
                  background: notifOpen ? 'var(--blue-50)' : 'transparent',
                  border: `1px solid ${notifOpen ? 'var(--blue-200)' : 'transparent'}`,
                  borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', padding: 7, transition: 'all .18s',
                }}
                onMouseEnter={e => { if (!notifOpen) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Bell SVG */}
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="var(--text-muted)" />
                </svg>
                {/* unread dot */}
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--rose)',
                  border: '1.5px solid #fff',
                }} />
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 320, background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden', zIndex: 200,
                  animation: 'fadeUp .2s ease',
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: 2,
                    color: 'var(--blue-600)', textTransform: 'uppercase', fontWeight: 500,
                  }}>Notifications</div>
                  {notifications.map((n, i) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background .18s',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Dot indicator */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: n.dot, flexShrink: 0, marginTop: 5,
                      }} />
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 500 }}>{n.text}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--f-mono)', marginTop: 3 }}>{n.time}</div>
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
                  background: menuOpen ? 'var(--blue-50)' : 'transparent',
                  border: `1px solid ${menuOpen ? 'var(--blue-200)' : 'transparent'}`,
                  borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 8px', transition: 'all .18s',
                }}
                onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                <Avatar initials={initials} size={28} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {user.first_name}
                </span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 200, background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden', zIndex: 200,
                  animation: 'fadeUp .2s ease',
                }}>
                  <div style={{ padding: '6px' }}>
                    {[
                      { label: 'Profile',    page: 'profile'   },
                      { label: 'Dashboard',  page: 'dashboard' },
                      { label: 'Saved Jobs', page: 'saved'     },
                    ].map(item => (
                      <button key={item.page} onClick={() => { onNavigate(item.page); setMenuOpen(false); }} style={{
                        display: 'flex', alignItems: 'center', width: '100%', padding: '9px 12px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)',
                        fontFamily: 'var(--f-ui)', borderRadius: 'var(--r-sm)',
                        transition: 'all .18s', gap: 8,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <MenuDot color="var(--border-med)" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', padding: '6px' }}>
                    <button onClick={() => { logout(); setMenuOpen(false); }} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '9px 12px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', fontSize: 13, color: 'var(--rose)',
                      fontFamily: 'var(--f-ui)', borderRadius: 'var(--r-sm)',
                      transition: 'all .18s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--rose-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <MenuDot color="var(--rose)" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate('auth-login')} style={{
              background: 'transparent', border: '1px solid var(--border-med)',
              borderRadius: 'var(--r-sm)', padding: '7px 16px',
              color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--f-ui)', fontWeight: 500,
              transition: 'all .18s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >Sign In</button>
            <button onClick={() => onNavigate('auth-register')} style={{
              background: 'var(--blue-500)', border: 'none',
              borderRadius: 'var(--r-sm)', padding: '7px 18px',
              color: '#fff', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--f-ui)', fontWeight: 600,
              transition: 'all .18s', boxShadow: 'var(--shadow-xs)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-600)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-500)'; }}
            >Join Free</button>
          </>
        )}
      </div>

      {(menuOpen || notifOpen) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150 }}
          onClick={() => { setMenuOpen(false); setNotifOpen(false); }} />
      )}
    </header>
  );
}

function CompassIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" fill="var(--blue-500)" />
      <circle cx="16" cy="16" r="10" stroke="rgba(255,255,255,.25)" strokeWidth="1" fill="none" />
      <path d="M16 6L18 16L16 14.5L14 16Z" fill="white" />
      <path d="M16 26L18 16L16 17.5L14 16Z" fill="rgba(255,255,255,.45)" />
      <circle cx="16" cy="16" r="2" fill="white" />
    </svg>
  );
}

function MenuDot({ color }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: color, flexShrink: 0, display: 'inline-block',
    }} />
  );
}