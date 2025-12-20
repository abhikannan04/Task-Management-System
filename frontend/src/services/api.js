import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('psm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('psm_token');
      localStorage.removeItem('psm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add a method to handle file uploads
api.uploadFile = async (url, formData) => {
  try {
    const token = localStorage.getItem('psm_token');
    const headers = {
      'Content-Type': 'multipart/form-data',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await axios.post(`/api${url}`, formData, {
      baseURL: '',
      headers,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add PUT method
api.update = async (url, data) => {
  try {
    const response = await api.put(url, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add DELETE method
api.remove = async (url) => {
  try {
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;