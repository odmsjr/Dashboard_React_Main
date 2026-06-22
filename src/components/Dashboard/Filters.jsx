import React from 'react';
import '../../styles/style.css';

const Filters = ({ filters, onFilterChange, pollers }) => {
  return (
    <div className="filter-section">
      <div className="filter-controls-vertical">
        <div className="filter-input-group">
          <label>Search Host</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Filter by host name..."
            value={filters.host || ''}
            onChange={(e) => onFilterChange('host', e.target.value)}
          />
        </div>
        <div className="filter-input-group">
          <label>Search Service</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Filter by service name..."
            value={filters.service || ''}
            onChange={(e) => onFilterChange('service', e.target.value)}
          />
        </div>
        <div className="filter-input-group">
          <label>Poller</label>
          <select
            className="filter-select"
            value={filters.poller || 'all'}
            onChange={(e) => onFilterChange('poller', e.target.value)}
          >
            <option value="all">All Pollers</option>
            {pollers && pollers.length > 0 ? (
              pollers.map((poller) => (
                <option key={poller.Poller || poller} value={poller.Poller || poller}>
                  {poller.Poller || poller || 'Unknown'}
                </option>
              ))
            ) : (
              <option value="" disabled>No pollers available</option>
            )}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Filters;