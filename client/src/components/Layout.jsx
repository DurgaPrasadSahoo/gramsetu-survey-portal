import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants/roles';
import ConfirmDialog from './ConfirmDialog';

const ALL_ROLES = Object.keys(ROLE_LABELS);
const MANAGER_ROLES = ['developer', 'admin', 'head_of_district', 'head_of_panchayat'];
const CAN_REGISTER_ROLES = ['developer', 'admin', 'head_of_district', 'head_of_panchayat'];

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ALL_ROLES },
  { to: '/surveys', label: 'Household Records', icon: '📋', roles: ALL_ROLES },
  { to: '/surveys/new', label: 'New Survey Entry', icon: '📝', roles: ALL_ROLES },
  { to: '/schemes', label: 'Govt Schemes', icon: '📜', roles: ALL_ROLES },
  { to: '/team', label: 'Team Directory', icon: '🧑‍💼', roles: MANAGER_ROLES },
  { to: '/edit-requests', label: 'Edit Requests', icon: '🔓', roles: ['developer'] },
  { to: '/account-requests', label: 'Account Requests', icon: '📨', roles: ['developer'] },
  { to: '/register', label: 'Register New User', icon: '➕', roles: CAN_REGISTER_ROLES },
  { to: '/profile', label: 'My Profile', icon: '👤', roles: ALL_ROLES },
];

const BOTTOM_NAV_ITEMS = [
  { to: '/software-functionality', label: 'Software Functionality', icon: '⚙️', roles: ['developer'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));
  const visibleBottomItems = BOTTOM_NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const renderLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/surveys'}
      className={({ isActive }) => `sidenav-link ${isActive ? 'active' : ''}`}
      onClick={() => setMenuOpen(false)}
    >
      <span className="sidenav-icon">{item.icon}</span>
      {item.label}
    </NavLink>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="hamburger"
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="brand">
          <span className="brand-emblem">🇮🇳</span>
          <div>
            <div className="brand-title">GramSetu</div>
            <div className="brand-subtitle">Household Survey Portal — Bhubaneswar, Odisha</div>
          </div>
        </div>
        <div className="topbar-user">
          <span className="user-badge" data-role={user?.role}>{ROLE_LABELS[user?.role] || user?.role}</span>
          <span className="user-name">{user?.name}</span>
          <button className="btn btn-ghost" onClick={() => setConfirmLogout(true)}>Log out</button>
        </div>
      </header>

      <div className="app-body">
        <nav className={`sidenav ${menuOpen ? 'open' : ''}`}>
          <div className="sidenav-links">{visibleItems.map(renderLink)}</div>
          {visibleBottomItems.length > 0 && (
            <div className="sidenav-links sidenav-links--bottom">{visibleBottomItems.map(renderLink)}</div>
          )}
        </nav>
        {menuOpen && <div className="sidenav-backdrop" onClick={() => setMenuOpen(false)} />}

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        GramSetu Survey Portal — a demonstration e-governance household survey system for Bhubaneswar, Odisha.
      </footer>

      <ConfirmDialog
        open={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        onConfirm={logout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
