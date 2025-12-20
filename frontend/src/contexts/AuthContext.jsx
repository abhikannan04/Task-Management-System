import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('psm_token');
    const userData = localStorage.getItem('psm_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('psm_token');
        localStorage.removeItem('psm_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (emp_code, password) => {
    try {
      console.log('Attempting login with emp_code:', emp_code); // Debug log
      const response = await api.post('/auth/login', { emp_code, password });
      console.log('Login API response:', response.data); // Debug log
      const { user, token } = response.data;
      
      localStorage.setItem('psm_token', token);
      localStorage.setItem('psm_user', JSON.stringify(user));
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login API error:', error); // Debug log
      return { 
        success: false, 
        message: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('psm_token');
    localStorage.removeItem('psm_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('psm_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    login,
    logout,
    loading,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};