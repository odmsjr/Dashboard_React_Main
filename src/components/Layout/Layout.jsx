import React from 'react';
import Sidebar from './Sidebar';
import '../../styles/style.css';

const Layout = ({ children, onRefresh, lastUpdate }) => {
  return (
    <div className="app-container">
      <Sidebar onRefresh={onRefresh} lastUpdate={lastUpdate} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;