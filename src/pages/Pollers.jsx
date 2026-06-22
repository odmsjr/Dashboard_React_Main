import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { useData } from '../contexts/DataContext';
import '../styles/style.css';

const Pollers = () => {
  const navigate = useNavigate();
  
  const {
    pollers,
    lastUpdate,
    loading,
    silentRefresh,
    setLoading,
  } = useData();

  const [filteredPollers, setFilteredPollers] = useState([]);
  const [paginatedPollers, setPaginatedPollers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, unknown: 0, total: 0 });
  
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [countdown, setCountdown] = useState(60);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const refreshTimerRef = useRef(null);
  const initialLoadDone = useRef(false);

  // Calculate summary from pollers data
  useEffect(() => {
    if (pollers && pollers.length > 0) {
      const totalCritical = pollers.reduce((sum, p) => sum + (p.Critical || 0), 0);
      const totalWarning = pollers.reduce((sum, p) => sum + (p.Warning || 0), 0);
      const totalUnknown = pollers.reduce((sum, p) => sum + (p.Unknown || 0), 0);
      const totalAll = totalCritical + totalWarning + totalUnknown;
      
      setSummary({
        critical: totalCritical,
        warning: totalWarning,
        unknown: totalUnknown,
        total: totalAll
      });
    }
  }, [pollers]);

  // Apply search filter
  const applyFilters = useCallback(() => {
    if (!pollers || pollers.length === 0) {
      setFilteredPollers([]);
      return;
    }
    
    let filtered = [...pollers];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.Poller && p.Poller.toLowerCase().includes(term)
      );
    }
    setFilteredPollers(filtered);
    setCurrentPage(1);
  }, [pollers, searchTerm]);

  // Apply pagination
  useEffect(() => {
    if (!filteredPollers || filteredPollers.length === 0) {
      setPaginatedPollers([]);
      return;
    }
    
    const currentSize = pageSize === 'all' ? filteredPollers.length : pageSize;
    const startIndex = (currentPage - 1) * currentSize;
    const endIndex = Math.min(startIndex + currentSize, filteredPollers.length);
    const paginated = filteredPollers.slice(startIndex, endIndex);
    setPaginatedPollers(paginated);
  }, [filteredPollers, currentPage, pageSize]);

  // Initial load - mark loading as false once data is available
  useEffect(() => {
    if (pollers && pollers.length > 0 && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [pollers, setLoading]);

  // Apply filters when search or pollers change
  useEffect(() => {
    applyFilters();
  }, [pollers, searchTerm, applyFilters]);

  // Auto-refresh
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    if (!isAutoRefreshEnabled || refreshInterval === 0) {
      setCountdown(0);
      return;
    }
    
    setCountdown(refreshInterval);
    
    refreshTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          silentRefresh();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [refreshInterval, isAutoRefreshEnabled, silentRefresh]);

  // Handle page change
  const handlePageChange = (direction) => {
    const currentSize = pageSize === 'all' ? filteredPollers.length || 1 : pageSize;
    const totalPages = Math.ceil((filteredPollers.length || 0) / currentSize);
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    const newSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Handle refresh
  const handleRefresh = () => {
    setCountdown(refreshInterval);
    silentRefresh();
  };

  // Handle interval change
  const handleIntervalChange = (e) => {
    const val = parseInt(e.target.value);
    setRefreshInterval(val);
    setCountdown(val);
    setIsAutoRefreshEnabled(val > 0);
  };

  // Navigate to dashboard with poller filter
  const navigateToDashboard = (pollerName, status = null) => {
    localStorage.setItem('poller_filter_target', pollerName);
    localStorage.setItem('poller_filter_type', status || 'all');
    navigate('/dashboard');
  };

  // Calculate pagination info
  const totalItems = filteredPollers.length;
  const currentSize = pageSize === 'all' ? totalItems || 1 : pageSize;
  const totalPages = Math.ceil(totalItems / currentSize);

  // Loading state
  if (loading && !initialLoadDone.current) {
    return (
      <Layout onRefresh={handleRefresh} lastUpdate={lastUpdate}>
        <div className="loading-cell">Loading pollers...</div>
      </Layout>
    );
  }

  return (
    <Layout onRefresh={handleRefresh} lastUpdate={lastUpdate}>
      <div className="content-header">
        <h1>Pollers</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            className="dashboard-page-size-select"
            value={refreshInterval}
            onChange={handleIntervalChange}
            style={{ width: '70px' }}
          >
            <option value="15">15s</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
            <option value="120">2m</option>
            <option value="300">5m</option>
            <option value="0">Off</option>
          </select>
          <button className="refresh-btn" onClick={handleRefresh}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="top-row">
        <div className="filter-section" style={{ width: '100%' }}>
          <div className="filter-controls-vertical">
            <div className="filter-input-group">
              <label>Search Pollers</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Filter by poller name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card all" style={{ borderLeftColor: '#58a6ff' }}>
            <div className="stat-number" style={{ color: '#58a6ff' }}>{summary.total}</div>
            <div className="stat-label">TOTAL ISSUES</div>
          </div>
          <div className="stat-card critical">
            <div className="stat-number">{summary.critical}</div>
            <div className="stat-label">CRITICAL</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-number">{summary.warning}</div>
            <div className="stat-label">WARNING</div>
          </div>
          <div className="stat-card unknown">
            <div className="stat-number">{summary.unknown}</div>
            <div className="stat-label">UNKNOWN</div>
          </div>
        </div>
      </div>

      <div className="services-section">
        <div className="section-header">
          <div className="section-header-left">
            <h3 className="section-title">Pollers</h3>
            <span className="service-count">{filteredPollers.length}</span>
          </div>
          <div className="dashboard-pagination-controls">
            <span className="dashboard-pagination-label">Show:</span>
            <select 
              className="dashboard-page-size-select" 
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="40">40</option>
              <option value="50">50</option>
              <option value="60">60</option>
              <option value="70">70</option>
              <option value="80">80</option>
              <option value="90">90</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
            <div className="dashboard-pagination-buttons">
              <button 
                className="dashboard-page-btn" 
                onClick={() => handlePageChange(-1)}
                disabled={currentPage <= 1 || totalPages === 0}
              >
                ◀ Prev
              </button>
              <span className="dashboard-page-info">
                Page {totalPages === 0 ? 0 : currentPage} of {totalPages === 0 ? 0 : totalPages}
              </span>
              <button 
                className="dashboard-page-btn" 
                onClick={() => handlePageChange(1)}
                disabled={currentPage >= totalPages || totalPages === 0}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="services-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Poller</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Critical</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Warning</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Unknown</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {!paginatedPollers || paginatedPollers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="loading-cell">No pollers found</td>
                </tr>
              ) : (
                paginatedPollers.map((poller, index) => {
                  // Safety check: if poller is not an object, skip
                  if (!poller || typeof poller !== 'object') {
                    return null;
                  }
                  
                  return (
                    <tr key={index}>
                      <td 
                        className="poller-name" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown')}
                        style={{ cursor: 'pointer', color: '#88ccff', fontWeight: '500' }}
                      >
                        {poller.Poller || 'Unknown'}
                      </td>
                      <td 
                        className="critical-number" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown', 'critical')}
                        style={{ 
                          cursor: 'pointer', 
                          textAlign: 'center',
                          color: '#d44a3a',
                          fontWeight: 'bold'
                        }}
                      >
                        {poller.Critical || 0}
                      </td>
                      <td 
                        className="warning-number" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown', 'warning')}
                        style={{ 
                          cursor: 'pointer', 
                          textAlign: 'center',
                          color: '#ff9830',
                          fontWeight: 'bold'
                        }}
                      >
                        {poller.Warning || 0}
                      </td>
                      <td 
                        className="unknown-number" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown', 'unknown')}
                        style={{ 
                          cursor: 'pointer', 
                          textAlign: 'center',
                          color: '#8b949e',
                          fontWeight: 'bold'
                        }}
                      >
                        {poller.Unknown || 0}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#e6edf3' }}>
                        {(poller.Critical || 0) + (poller.Warning || 0) + (poller.Unknown || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Pollers;