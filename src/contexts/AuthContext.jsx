import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await apiClient.get('/auth/verify');
      if (response.data.valid) {
        setLoading(false);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
  };

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      if (response.data.success) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('auth_user', JSON.stringify({ username }));
        setUser({ username });
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);