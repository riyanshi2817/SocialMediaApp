import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [logoutError, setLogoutError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    const refresh = () => api.unreadNotificationCount()
      .then(result => { if (active) setUnreadCount(result.unreadCount); })
      .catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('notifications:updated', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('notifications:updated', refresh);
    };
  }, [user?.id, location.pathname]);

  async function handleLogout() {
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error.message);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand"><span className="brand-mark">✦</span><span>Caption<br />Studio</span></NavLink>
        <button type="button" className="menu-toggle" aria-controls="main-navigation" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button>
        <p className="eyebrow">Workspace</p>
        <nav id="main-navigation" className={`main-nav${menuOpen ? ' is-open' : ''}`}>
          <NavLink to="/" end>Home feed</NavLink>
          {user && <NavLink to="/explore">Explore</NavLink>}
          {user && <NavLink to="/search" className="nav-search"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 5 5" /></svg><span>Search people</span></NavLink>}
          {user && <NavLink to="/saved">Saved posts</NavLink>}
          {user && <NavLink to="/notifications">Notifications{unreadCount > 0 && <span className="unread-badge" aria-label={`${unreadCount} unread notifications`}>{unreadCount}</span>}</NavLink>}
          <NavLink to="/dashboard">Overview</NavLink>
          <NavLink to="/create">New caption</NavLink>
          <NavLink to="/history">Caption history</NavLink>
          {user && <NavLink to={`/profile/${encodeURIComponent(user.username)}`}>My profile</NavLink>}
        </nav>
        <div className={`sidebar-foot${menuOpen ? ' is-open' : ''}`}>
          {user ? <><div className="user-chip"><span className="avatar">{user.username[0]?.toUpperCase()}</span><span>{user.username}</span></div><button className="text-button" onClick={handleLogout}>Sign out <span>↗</span></button></> : <Link to="/login" className="quiet-link">Sign in</Link>}
        </div>
        {logoutError && <div className="form-error" role="alert">{logoutError}</div>}
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
