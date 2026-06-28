import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/client';
import Layout from '../components/Layout/Layout';
import '../styles/alertLogs.css';

const AlertLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [paginatedLogs, setPaginatedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auto-refresh
  const [refreshInterval] = useState(60);
  const refreshTimerRef = useRef(null);
  const initialLoadDone = useRef(false);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: pageSize === 'all' ? 999999 : pageSize,
        page: currentPage,
      });
      
      if (eventType !== 'all') params.append('event_type', eventType);
      if (searchTerm) {
        params.append('host', searchTerm);
        params.append('service', searchTerm);
      }
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await apiClient.get(`/api/logs?${params.toString()}`);
      setLogs(response.data.logs || []);
      setFilteredLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 0);
      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
    }
  }, [currentPage, pageSize, eventType, searchTerm, startDate, endDate]);

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...logs];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(log =>
        log.host.toLowerCase().includes(term) ||
        log.service.toLowerCase().includes(term)
      );
    }
    
    if (eventType !== 'all') {
      filtered = filtered.filter(log => log.event_type === eventType);
    }
    
    if (startDate) {
      filtered = filtered.filter(log => log.timestamp.split(' ')[0] >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(log => log.timestamp.split(' ')[0] <= endDate);
    }
    
    setFilteredLogs(filtered);
    setTotal(filtered.length);
    setCurrentPage(1);
  }, [logs, searchTerm, eventType, startDate, endDate]);

  // Apply pagination
  useEffect(() => {
    const currentSize = pageSize === 'all' ? filteredLogs.length : pageSize;
    const startIndex = (currentPage - 1) * currentSize;
    const endIndex = Math.min(startIndex + currentSize, filteredLogs.length);
    const paginated = filteredLogs.slice(startIndex, endIndex);
    setPaginatedLogs(paginated);
    setTotalPages(Math.ceil(filteredLogs.length / currentSize));
  }, [filteredLogs, currentPage, pageSize]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchLogs();
    }
  }, [fetchLogs]);

  // Apply filters when filters change
  useEffect(() => {
    if (logs.length > 0) {
      applyFilters();
    }
  }, [logs, searchTerm, eventType, startDate, endDate, applyFilters]);

  // Auto-refresh
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setInterval(() => {
      fetchLogs();
    }, refreshInterval * 1000);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval, fetchLogs]);

  // Handle page change
  const handlePageChange = (direction) => {
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
    fetchLogs();
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setEventType('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Get event type badge class (solid colors)
  const getEventBadgeClass = (type) => {
    switch (type?.toLowerCase()) {
      case 'critical': return 'badge-critical';
      case 'warning': return 'badge-warning';
      case 'unknown': return 'badge-unknown';
      case 'acknowledged': return 'badge-acknowledged';
      case 'recovered': return 'badge-recovered';
      default: return 'badge-info';
    }
  };

  // Get event type display text
  const getEventDisplay = (type) => {
    switch (type?.toLowerCase()) {
      case 'critical': return 'CRITICAL';
      case 'warning': return 'WARNING';
      case 'unknown': return 'UNKNOWN';
      case 'acknowledged': return 'ACKNOWLEDGED';
      case 'recovered': return 'RECOVERED';
      default: return type || 'Unknown';
    }
  };

  if (loading) {
    return (
      <Layout onRefresh={handleRefresh} lastUpdate={lastUpdate}>
        <div className="loading-cell">Loading alert logs...</div>
      </Layout>
    );
  }

  return (
    <Layout onRefresh={handleRefresh} lastUpdate={lastUpdate}>
      <div className="logs-container">
        {/* Header */}
        <div className="logs-header">
          <div className="header-top-row">
            <h2>📜 Event History / Audit Log</h2>
            <span className="last-update-badge">
              Last update: {lastUpdate}
            </span>
          </div>

          {/* Filters */}
          <div className="logs-filter-row">
            <div className="filter-group">
              <label>Search Host or Service:</label>
              <input
                type="text"
                className="filter-input-small"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Event Type:</label>
              <select
                className="filter-select-small"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="critical">CRITICAL</option>
                <option value="warning">WARNING</option>
                <option value="unknown">UNKNOWN</option>
                <option value="acknowledged">ACKNOWLEDGED</option>
                <option value="recovered">RECOVERED</option>
              </select>
            </div>
            <div className="filter-group">
              <label>From Date:</label>
              <input
                type="date"
                className="date-filter-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>To Date:</label>
              <input
                type="date"
                className="date-filter-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button className="filter-btn" onClick={handleRefresh}>Apply Filters</button>
            <button className="filter-btn clear-btn" onClick={handleResetFilters}>Clear</button>
          </div>
        </div>

        {/* Table */}
        <div className="logs-table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Service</th>
                <th>Status Information</th>
                <th>Event Type</th>
                <th>Acknowledged By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="loading-cell">No logs found</td>
                </tr>
              ) : (
                paginatedLogs.map((log, index) => {
                  const badgeClass = getEventBadgeClass(log.event_type);
                  const displayText = getEventDisplay(log.event_type);
                  const isAcknowledged = log.event_type?.toLowerCase() === 'acknowledged';
                  
                  return (
                    <tr key={index}>
                      <td className="host-name">{log.host}</td>
                      <td className="service-name">{log.service}</td>
                      <td className="status-info">{log.message || log.output || '-'}</td>
                      <td>
                        <span className={`event-badge ${badgeClass}`}>
                          {displayText}
                        </span>
                      </td>
                      <td>{isAcknowledged ? (log.username || '-') : '-'}</td>
                      <td className="timestamp-cell">{log.timestamp}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="logs-footer">
          <div className="logs-pagination">
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
                Page {totalPages === 0 ? 0 : currentPage} of {totalPages === 0 ? 0 : totalPages}
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
          <div className="logs-count">
            Showing {paginatedLogs.length} of {filteredLogs.length} logs
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AlertLogs;