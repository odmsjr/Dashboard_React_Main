import React from 'react';
import '../../styles/style.css';

const StatsCards = ({ counts, onStatusClick, activeStatus, filteredCounts }) => {
  // Use filtered counts if provided (for "All" view), otherwise use raw counts
  const displayCounts = filteredCounts || counts;
  const total = (displayCounts.critical || 0) + (displayCounts.warning || 0) + (displayCounts.unknown || 0);
  
  return (
    <div className="stats-grid">
      <div 
        className={`stat-card all ${activeStatus === 'all' ? 'active' : ''}`}
        onClick={() => onStatusClick('all')}
        style={{ borderLeftColor: '#58a6ff', cursor: 'pointer' }}
      >
        <div className="stat-number" style={{ color: '#58a6ff' }}>{total}</div>
        <div className="stat-label">ALL SERVICES</div>
      </div>
      <div 
        className={`stat-card critical ${activeStatus === 'critical' ? 'active' : ''}`}
        onClick={() => onStatusClick('critical')}
      >
        <div className="stat-number">{displayCounts.critical || 0}</div>
        <div className="stat-label">CRITICAL</div>
      </div>
      <div 
        className={`stat-card warning ${activeStatus === 'warning' ? 'active' : ''}`}
        onClick={() => onStatusClick('warning')}
      >
        <div className="stat-number">{displayCounts.warning || 0}</div>
        <div className="stat-label">WARNING</div>
      </div>
      <div 
        className={`stat-card unknown ${activeStatus === 'unknown' ? 'active' : ''}`}
        onClick={() => onStatusClick('unknown')}
      >
        <div className="stat-number">{displayCounts.unknown || 0}</div>
        <div className="stat-label">UNKNOWN</div>
      </div>
    </div>
  );
};

export default StatsCards;