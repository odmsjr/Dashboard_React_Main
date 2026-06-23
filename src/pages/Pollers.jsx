import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { useData } from '../contexts/DataContext';
import '../styles/pollers.css';

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
  const refreshTimerRef = useRef(null);
  const initialLoadDone = useRef(false);

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

  // Calculate filtered summary from filteredPollers
  useEffect(() => {
    if (filteredPollers && filteredPollers.length > 0) {
      const totalCritical = filteredPollers.reduce((sum, p) => sum + (p.Critical || 0), 0);
      const totalWarning = filteredPollers.reduce((sum, p) => sum + (p.Warning || 0), 0);
      const totalUnknown = filteredPollers.reduce((sum, p) => sum + (p.Unknown || 0), 0);
      const totalAll = totalCritical + totalWarning + totalUnknown;
      
      setSummary({
        critical: totalCritical,
        warning: totalWarning,
        unknown: totalUnknown,
        total: totalAll
      });
    } else {
      // If no filtered pollers, show zeros
      setSummary({
        critical: 0,
        warning: 0,
        unknown: 0,
        total: 0
      });
    }
  }, [filteredPollers]);

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
    
    if (refreshInterval === 0) {
      return;
    }
    
    refreshTimerRef.current = setInterval(() => {
      silentRefresh();
    }, refreshInterval * 1000);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [refreshInterval, silentRefresh]);

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
    silentRefresh();
  };

  // Handle interval change
  const handleIntervalChange = (e) => {
    const val = parseInt(e.target.value);
    setRefreshInterval(val);
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
      <div className="pollers-container">
        {/* Header */}
        <div className="pollers-header">
          <div className="header-top-row">
            <h2>Pollers</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select 
                className="page-size-select"
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
              <button className="refresh-btn-small" onClick={handleRefresh}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Summary Stats Cards - Now synced with search */}
          <div className="poller-stats-summary">
            <div className="stat-summary-card total">
              <div className="stat-label">Total Issues</div>
              <div className="stat-value">{summary.total}</div>
            </div>
            <div className="stat-summary-card critical">
              <div className="stat-label">Critical</div>
              <div className="stat-value">{summary.critical}</div>
            </div>
            <div className="stat-summary-card warning">
              <div className="stat-label">Warning</div>
              <div className="stat-value">{summary.warning}</div>
            </div>
            <div className="stat-summary-card unknown">
              <div className="stat-label">Unknown</div>
              <div className="stat-value">{summary.unknown}</div>
            </div>
          </div>

          {/* Search and Pagination */}
          <div className="search-pagination-row">
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search pollers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="pagination-controls">
              <span className="pagination-label">Show:</span>
              <select 
                className="page-size-select" 
                value={pageSize}
                onChange={handlePageSizeChange}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">All</option>
              </select>
              <div className="pagination-buttons">
                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(-1)}
                  disabled={currentPage <= 1 || totalPages === 0}
                >
                  ◀ Prev
                </button>
                <span className="page-info">
                  {totalPages === 0 ? 0 : currentPage} / {totalPages === 0 ? 0 : totalPages}
                </span>
                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage >= totalPages || totalPages === 0}
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="pollers-table-wrapper">
          <table className="pollers-table">
            <thead>
              <tr>
                <th>Poller</th>
                <th>Critical</th>
                <th>Warning</th>
                <th>Unknown</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {!paginatedPollers || paginatedPollers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="loading-cell">No pollers found</td>
                </tr>
              ) : (
                paginatedPollers.map((poller, index) => {
                  if (!poller || typeof poller !== 'object') {
                    return null;
                  }
                  
                  return (
                    <tr key={index}>
                      <td 
                        className="poller-name clickable-poller" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown')}
                      >
                        {poller.Poller || 'Unknown'}
                      </td>
                      <td 
                        className="critical-number clickable-number" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown', 'critical')}
                      >
                        {poller.Critical || 0}
                      </td>
                      <td 
                        className="warning-number clickable-number" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown', 'warning')}
                      >
                        {poller.Warning || 0}
                      </td>
                      <td 
                        className="unknown-number clickable-number" 
                        onClick={() => navigateToDashboard(poller.Poller || 'Unknown', 'unknown')}
                      >
                        {poller.Unknown || 0}
                      </td>
                      <td className="total-number">
                        {(poller.Critical || 0) + (poller.Warning || 0) + (poller.Unknown || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="table-count">
          Showing {paginatedPollers.length} of {filteredPollers.length} pollers
          {lastUpdate && ` • Last updated: ${lastUpdate}`}
        </div>
      </div>
    </Layout>
  );
};

export default Pollers;