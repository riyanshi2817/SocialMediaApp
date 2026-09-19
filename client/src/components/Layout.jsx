import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand"><span className="brand-mark">✦</span><span>Caption<br />Studio</span></NavLink>
        <p className="eyebrow">Workspace</p>
        <nav className="main-nav">
          <NavLink to="/" end>Overview</NavLink>
          <NavLink to="/create">New caption</NavLink>
          <NavLink to="/history">Caption history</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip"><span className="avatar">{user?.username?.[0]?.toUpperCase()}</span><span>{user?.username}</span></div>
          <button className="text-button" onClick={handleLogout}>Sign out <span>↗</span></button>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
