import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

// Create the context
const DataContext = createContext();

// Custom hook to use the context
export const useData = () => useContext(DataContext);

// Provider component
export const DataProvider = ({ children }) => {
  // Shared state
  const [counts, setCounts] = useState({ critical: 0, warning: 0, unknown: 0 });
  const [pollers, setPollers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [ackStatus, setAckStatus] = useState({});
  const [lastUpdate, setLastUpdate] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Fetch counts
  const fetchCounts = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/all');
      setCounts(response.data);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }, []);

  // Fetch pollers
  const fetchPollers = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/pollers/data');
      setPollers(response.data.pollers || []);
    } catch (error) {
      console.error('Error fetching pollers:', error);
    }
  }, []);

  // Fetch all acknowledgements
  const fetchAllAcknowledgements = useCallback(async () => {
    try {
      console.log('📡 Fetching all acknowledgements...');
      const response = await apiClient.get('/api/acknowledgements/all');
      const data = response.data || {};
      console.log(`✅ Loaded ${Object.keys(data).length} acknowledgements`);
      setAckStatus(data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching all acknowledgements:', error);
      return {};
    }
  }, []);

  // Normalize service data
  const normalizeService = (service, status) => {
    let host = service.host || service.host_name || service.name || 'Unknown';
    if (host.endsWith('.')) {
      host = host.slice(0, -1);
    }
    host = host.trim();
    
    let serviceName = service.service || service.description || service.service_name || 'Unknown';
    serviceName = serviceName.trim();
    
    return {
      host: host,
      service: serviceName,
      output: service.output || service.plugin_output || '',
      duration: service.duration || '0s',
      poller: service.poller || service.instance_name || 'Unknown',
      status: status,
      _original: service
    };
  };

  // Fetch all services
  const fetchAllServices = useCallback(async () => {
    try {
      console.log('📡 Fetching services from API...');
      const response = await apiClient.get('/api/all');
      const data = response.data;
      
      const criticalWithStatus = (data.critical_services || []).map(s => normalizeService(s, 'critical'));
      const warningWithStatus = (data.warning_services || []).map(s => normalizeService(s, 'warning'));
      const unknownWithStatus = (data.unknown_services || []).map(s => normalizeService(s, 'unknown'));
      
      const combined = [...criticalWithStatus, ...warningWithStatus, ...unknownWithStatus];
      console.log(`✅ Combined ${combined.length} services`);
      setAllServices(combined);
      
      await fetchAllAcknowledgements();
    } catch (error) {
      console.error('❌ Error fetching all services:', error);
    }
  }, [fetchAllAcknowledgements]);

  // Silent refresh (background update)
  const silentRefresh = useCallback(async () => {
    console.log('🔄 Silent refreshing data...');
    try {
      await fetchCounts();
      await fetchPollers();
      await fetchAllServices();
      setLastUpdate(new Date().toLocaleTimeString());
      console.log('✅ Silent refresh complete');
    } catch (error) {
      console.error('Error during silent refresh:', error);
    }
  }, [fetchCounts, fetchPollers, fetchAllServices]);

  // Initial load - fetches all data once
  const loadAllData = useCallback(async () => {
    if (initialLoadDone) {
      console.log('⏭️ Data already loaded, skipping...');
      return;
    }
    
    console.log('📥 Loading all data for the first time...');
    setLoading(true);
    try {
      await fetchCounts();
      await fetchPollers();
      await fetchAllServices();
      setLastUpdate(new Date().toLocaleTimeString());
      setInitialLoadDone(true);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  }, [fetchCounts, fetchPollers, fetchAllServices, initialLoadDone]);

  // Update acknowledgement status (for toggling)
  const updateAckStatus = useCallback((serviceKey, data) => {
    setAckStatus(prev => ({
      ...prev,
      [serviceKey]: data
    }));
  }, []);

  // Values provided to consumers
  const value = {
    // Data
    counts,
    pollers,
    allServices,
    ackStatus,
    lastUpdate,
    loading,
    initialLoadDone,
    
    // Functions
    loadAllData,
    silentRefresh,
    updateAckStatus,
    setLastUpdate,
    setLoading,
    setCounts,
    setPollers,
    setAllServices,
    setAckStatus,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};