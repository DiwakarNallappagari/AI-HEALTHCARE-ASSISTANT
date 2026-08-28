/**
 * Sidebar Navigation Component
 * Main navigation with icons, active state, and user info
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiMessageCircle, FiShield, FiAlertTriangle, FiFileText, FiUser, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
  { path: '/chat', icon: FiMessageCircle, label: 'Symptom Chat' },
  { path: '/drugs', icon: FiShield, label: 'Drug Interactions' },
  { path: '/emergency', icon: FiAlertTriangle, label: 'Emergency' },
  { path: '/history', icon: FiFileText, label: 'Medical History' },
  { path: '/profile', icon: FiUser, label: 'Profile' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)} id="sidebar-toggle">
        {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} id="main-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="11" y="4" width="6" height="20" rx="2" fill="url(#logo-grad)" />
              <rect x="4" y="11" width="20" height="6" rx="2" fill="url(#logo-grad)" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#00d4aa" />
                  <stop offset="1" stopColor="#00b4d8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="sidebar-logo-text">HealthCare AI</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/dashboard'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={() => setMobileOpen(false)}
              id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span className="sidebar-user-email">{user?.email || ''}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} id="logout-btn" title="Logout">
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
