import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Layout from '../components/Layout/Layout';
import StatsCards from '../components/Dashboard/StatsCards';
import Filters from '../components/Dashboard/Filters';
import { useData } from '../contexts/DataContext';
import '../styles/style.css';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Use shared data from context
  const {
    counts,
    pollers,
    allServices,
    ackStatus,
    lastUpdate,
    loading,
    loadAllData,
    silentRefresh,
    updateAckStatus,
    setCounts,
    setPollers,
    setAllServices,
    setAckStatus,
    setLastUpdate,
    setLoading,
  } = useData();

  // Local state
  const [activeStatus, setActiveStatus] = useState('all');
  const [filters, setFilters] = useState({ host: '', service: '', poller: 'all' });
  const [filteredServices, setFilteredServices] = useState([]);
  const [filteredCounts, setFilteredCounts] = useState(null);
  const [acknowledging, setAcknowledging] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedServices, setPaginatedServices] = useState([]);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ 
    key: 'duration', 
    direction: 'asc' 
  });
  
  // Auto-refresh state
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [countdown, setCountdown] = useState(60);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  
  const refreshTimerRef = useRef(null);
  const initialLoadDone = useRef(false);

  // Parse duration string to seconds for sorting
  const parseDurationToSeconds = (durationStr) => {
    if (!durationStr || durationStr === '0s' || durationStr === 'Unknown') return 0;
    let total = 0;
    const days = durationStr.match(/(\d+)d/);
    const hours = durationStr.match(/(\d+)h/);
    const minutes = durationStr.match(/(\d+)m/);
    const seconds = durationStr.match(/(\d+)s/);
    if (days) total += parseInt(days[1]) * 86400;
    if (hours) total += parseInt(hours[1]) * 3600;
    if (minutes) total += parseInt(minutes[1]) * 60;
    if (seconds) total += parseInt(seconds[1]);
    return total;
  };

  // Sort services
  const sortServices = (services, sortKey, direction) => {
    if (!sortKey) return services;
    
    const sorted = [...services];
    sorted.sort((a, b) => {
      let valA, valB;
      
      if (sortKey === 'duration') {
        valA = parseDurationToSeconds(a.duration);
        valB = parseDurationToSeconds(b.duration);
      } else {
        valA = (a[sortKey] || '').toLowerCase();
        valB = (b[sortKey] || '').toLowerCase();
      }
      
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  // Apply filters to services
  const applyFilters = useCallback((status, currentFilters) => {
    let filtered = [...allServices];
    
    if (status !== 'all') {
      filtered = filtered.filter(s => s.status === status);
    }
    
    if (currentFilters.host) {
      const hostFilter = currentFilters.host.toLowerCase();
      filtered = filtered.filter(s => 
        s.host && s.host.toLowerCase().includes(hostFilter)
      );
    }
    
    if (currentFilters.service) {
      const serviceFilter = currentFilters.service.toLowerCase();
      filtered = filtered.filter(s => 
        s.service && s.service.toLowerCase().includes(serviceFilter)
      );
    }
    
    if (currentFilters.poller !== 'all') {
      filtered = filtered.filter(s => s.poller === currentFilters.poller);
    }
    
    filtered = sortServices(filtered, sortConfig.key, sortConfig.direction);
    
    setFilteredServices(filtered);
    setCurrentPage(1);
    
    const criticalCount = filtered.filter(s => s.status === 'critical').length;
    const warningCount = filtered.filter(s => s.status === 'warning').length;
    const unknownCount = filtered.filter(s => s.status === 'unknown').length;
    
    setFilteredCounts({ 
      critical: criticalCount, 
      warning: warningCount, 
      unknown: unknownCount 
    });
  }, [allServices, sortConfig.key, sortConfig.direction]);

  // Apply pagination to filtered services
  useEffect(() => {
    const startIndex = (currentPage - 1) * (pageSize === 'all' ? filteredServices.length || 1 : pageSize);
    const endIndex = pageSize === 'all' ? filteredServices.length : startIndex + pageSize;
    const paginated = filteredServices.slice(startIndex, endIndex);
    setPaginatedServices(paginated);
  }, [filteredServices, currentPage, pageSize]);

  // Initial load - only if data is not loaded yet
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadAllData();
    }
  }, [loadAllData]);

  // Re-apply filters when services, filters, or sort changes
  useEffect(() => {
    if (allServices.length > 0) {
      applyFilters(activeStatus, filters);
    }
  }, [allServices, activeStatus, filters, sortConfig.key, sortConfig.direction, applyFilters]);

  // Check for poller filter from navigation
// Check for poller filter from navigation
  useEffect(() => {
    const targetPoller = localStorage.getItem('poller_filter_target');
    const targetType = localStorage.getItem('poller_filter_type');
    
    if (targetPoller) {
      setFilters(prev => ({ ...prev, poller: targetPoller }));
      if (targetType && targetType !== 'all') {
        setActiveStatus(targetType);
      }
      localStorage.removeItem('poller_filter_target');
      localStorage.removeItem('poller_filter_type');
    }
  }, []);

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

  // Handle status click
  const handleStatusClick = (status) => {
    setActiveStatus(status);
    applyFilters(status, filters);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(activeStatus, newFilters);
  };

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle page change
  const handlePageChange = (direction) => {
    const currentSize = pageSize === 'all' ? filteredServices.length || 1 : pageSize;
    const totalPages = Math.ceil(filteredServices.length / currentSize);
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

  // Handle acknowledge
  const handleAcknowledge = async (serviceKey, host, service, isAcknowledged) => {
    if (acknowledging[serviceKey]) return;
    
    const confirmMessage = isAcknowledged 
      ? 'Are you sure you want to remove acknowledgement for this service?'
      : 'Are you sure you want to acknowledge this service?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setAcknowledging(prev => ({ ...prev, [serviceKey]: true }));
    
    try {
      if (isAcknowledged) {
        const response = await apiClient.delete(`/api/acknowledge/${encodeURIComponent(serviceKey)}`);
        if (response.data.success) {
          updateAckStatus(serviceKey, { acknowledged: false });
        }
      } else {
        const response = await apiClient.post('/api/acknowledge', {
          service_key: serviceKey,
          host: host,
          service: service,
          status: activeStatus === 'all' ? 'critical' : activeStatus
        });
        
        if (response.data.success) {
          updateAckStatus(serviceKey, {
            acknowledged: true,
            acknowledged_by: response.data.acknowledged_by,
            acknowledged_at: response.data.acknowledged_at
          });
        }
      }
    } catch (error) {
      console.error(`Error ${isAcknowledged ? 'un' : ''}acknowledging service:`, error);
      alert(`Failed to ${isAcknowledged ? 'un' : ''}acknowledge service. Please try again.`);
    } finally {
      setAcknowledging(prev => ({ ...prev, [serviceKey]: false }));
    }
  };

  // Handle refresh - DON'T clear acknowledgements
  const handleRefresh = () => {
    setFilteredCounts(null);
    setCurrentPage(1);
    setCountdown(refreshInterval);
    silentRefresh();
  };


  const getStatusTitle = () => {
    if (activeStatus === 'all') return 'All Services';
    return activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1) + ' Services';
  };

  // Calculate pagination info
  const totalItems = filteredServices.length;
  const currentPageSize = pageSize === 'all' ? totalItems : pageSize;
  const totalPages = Math.ceil(totalItems / (pageSize === 'all' ? totalItems || 1 : pageSize));

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  if (loading && !initialLoadDone.current) {
    return (
      <Layout onRefresh={handleRefresh} lastUpdate={lastUpdate}>
        <div className="loading-cell">Loading dashboard...</div>
      </Layout>
    );
  }

  return (
    <Layout onRefresh={handleRefresh} lastUpdate={lastUpdate}>
      <div className="content-header">
        <h1>Service Status Dashboard</h1>
        <button className="refresh-btn" onClick={handleRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="top-row">
        <Filters 
          filters={filters} 
          onFilterChange={handleFilterChange}
          pollers={pollers}
        />
        <StatsCards 
          counts={counts} 
          onStatusClick={handleStatusClick}
          activeStatus={activeStatus}
          filteredCounts={filteredCounts}
        />
      </div>

      <div className="services-section">
        <div className="section-header">
          <div className="section-header-left">
            <h3 className="section-title">{getStatusTitle()}</h3>
            <span className="service-count">{filteredServices.length}</span>
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
                <th>Host</th>
                <th>Service</th>
                <th>Output</th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('duration')}
                  style={{ cursor: 'pointer' }}
                >
                  Duration{getSortIndicator('duration')}
                </th>
                <th>Acknowledged</th>
                <th>Acknowledged By</th>
              </tr>
            </thead>
            <tbody>
              {paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="loading-cell">No services found</td>
                </tr>
              ) : (
                paginatedServices.map((service, index) => {
                  const serviceKey = `${service.host}|${service.service}`;
                  const ackInfo = ackStatus[serviceKey] || { acknowledged: false };
                  const isAcknowledging = acknowledging[serviceKey] || false;
                  
                  let ackColumn;
                  if (ackInfo.acknowledged) {
                    ackColumn = (
                      <button 
                        className="ack-btn acknowledged"
                        onClick={() => handleAcknowledge(serviceKey, service.host, service.service, true)}
                        disabled={isAcknowledging}
                      >
                        {isAcknowledging ? '...' : 'Acknowledged'}
                      </button>
                    );
                  } else {
                    ackColumn = (
                      <button 
                        className="ack-btn acknowledge"
                        onClick={() => handleAcknowledge(serviceKey, service.host, service.service, false)}
                        disabled={isAcknowledging}
                      >
                        {isAcknowledging ? '...' : 'Acknowledge'}
                      </button>
                    );
                  }
                  
                  let ackByColumn;
                  if (ackInfo.acknowledged) {
                    ackByColumn = (
                      <span className="ack-info">
                        {ackInfo.acknowledged_by}
                        <span className="ack-time">({ackInfo.acknowledged_at})</span>
                      </span>
                    );
                  } else {
                    ackByColumn = <span className="ack-info not-acknowledged">—</span>;
                  }
                  
                  return (
                    <tr key={index}>
                      <td className="host-name">{service.host}</td>
                      <td className="service-name">{service.service}</td>
                      <td className="service-output">{service.output}</td>
                      <td style={{ color: '#8b949e' }}>{service.duration}</td>
                      <td className="ack-cell">{ackColumn}</td>
                      <td className="ack-by-cell">{ackByColumn}</td>
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

export default Dashboard;