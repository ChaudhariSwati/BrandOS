import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">Brand<span>OS</span></div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            ⬡ Dashboard
          </NavLink>
          <NavLink to="/brandkits" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            🎨 Brand Kits
          </NavLink>
          <NavLink to="/assets" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            📦 Assets
          </NavLink>
          <NavLink to="/org" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            ⚙️ Organization
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            {user?.name}<br />
            <span style={{ fontSize: 11, color: '#666' }}>{user?.role?.toUpperCase()} · {user?.email}</span>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
