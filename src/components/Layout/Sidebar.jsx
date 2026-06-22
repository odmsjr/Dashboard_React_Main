import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import '../../styles/style.css';

const Sidebar = ({ onRefresh, lastUpdate }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-icon">📊</span>
        <span className="logo-text">Centreon</span>
      </div>
      <nav className="nav-menu">
        <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
          <span className="nav-icon">📋</span>
          <span className="nav-text">Dashboard</span>
        </Link>
        <Link to="/pollers" className={`nav-item ${isActive('/pollers')}`}>
          <span className="nav-icon">📡</span>
          <span className="nav-text">Pollers</span>
        </Link>
        <a href="#" className="nav-item" data-page="sla">
          <span className="nav-icon">📊</span>
          <span className="nav-text">Ceva Monitoring SLA</span>
        </a>
      </nav>
      <div className="sidebar-footer">
        <div className="refresh-info">
          <span className="refresh-icon">🔄</span>
          <span className="refresh-text">
            {lastUpdate || '--:--:--'}
          </span>
        </div>
        <button className="logout-btn-sidebar" onClick={logout}>
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;