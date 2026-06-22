import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/style.css';
import './Login.css';  // We'll create this for login-specific styles

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">📊</span>
          <span className="logo-text">Centreon Dashboard</span>
          <span className="logo-sub">Service Status Monitoring</span>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              id="username"
              placeholder="Enter your Centreon username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your Centreon password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="info-message">
          Use your Centreon credentials to login
        </div>
      </div>
    </div>
  );
};

export default Login;