import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  process.env.NODE_ENV === 'production' 
    ? 'https://multi-org-integration-platform-645l.onrender.com/api'
    : 'http://localhost:3000/api';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication and logging
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    };

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      });
    }

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }

    return response;
  },
  (error) => {
    // Enhanced error handling
    const errorInfo = {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase()
    };

    console.error('❌ API Error:', errorInfo);

    // Handle specific error cases
    if (error.response?.status === 404) {
      toast.error('Resource not found');
    } else if (error.response?.status === 500) {
      toast.error('Server error occurred');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout - please try again');
    } else if (!error.response) {
      toast.error('Network error - please check your connection');
    } else {
      toast.error(errorInfo.message || 'An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Generic HTTP methods
  async get(url, params = {}) {
    try {
      const response = await apiClient.get(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async post(url, data = {}) {
    try {
      const response = await apiClient.post(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async put(url, data = {}) {
    try {
      const response = await apiClient.put(url, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async delete(url) {
    try {
      const response = await apiClient.delete(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Integration-specific methods
  integrations: {
    async getAll(params = {}) {
      return apiService.get('/integrations', params);
    },

    async getById(id) {
      return apiService.get(`/integrations/${id}`);
    },

    async create(data) {
      const result = await apiService.post('/integrations', data);
      toast.success('Integration created successfully');
      return result;
    },

    async update(id, data) {
      const result = await apiService.put(`/integrations/${id}`, data);
      toast.success('Integration updated successfully');
      return result;
    },

    async delete(id) {
      const result = await apiService.delete(`/integrations/${id}`);
      toast.success('Integration deleted successfully');
      return result;
    },

    async sync(id) {
      const result = await apiService.post(`/integrations/${id}/sync`);
      toast.success('Sync triggered successfully');
      return result;
    },

    async testConnection(id) {
      return apiService.post(`/integrations/${id}/test-connection`);
    },

    async getLogs(id, params = {}) {
      return apiService.get(`/integrations/${id}/logs`, params);
    },

    async getFieldSuggestions(id) {
      return apiService.get(`/integrations/${id}/field-suggestions`);
    }
  },

  // Analytics methods
  analytics: {
    async getDashboard(timeRange = '24h') {
      return apiService.get('/analytics/dashboard', { timeRange });
    },

    async getPerformance(params = {}) {
      return apiService.get('/analytics/performance', params);
    },

    async getTrends(params = {}) {
      return apiService.get('/analytics/trends', params);
    }
  },

  // Webhook methods
  webhooks: {
    async getLogs(params = {}) {
      return apiService.get('/webhooks/logs', params);
    },

    async test() {
      const result = await apiService.post('/webhooks/test');
      toast.success('Test webhook completed');
      return result;
    }
  },

  // Health check methods
  health: {
    async check() {
      return apiService.get('/health');
    },

    async detailed() {
      return apiService.get('/health/detailed');
    },

    async database() {
      return apiService.get('/health/database');
    },

    async integrations() {
      return apiService.get('/health/integrations');
    }
  },

  // Utility methods
  async ping() {
    try {
      const start = Date.now();
      await this.get('/health');
      const latency = Date.now() - start;
      return { success: true, latency };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Error handling utility
  handleError(error) {
    const errorData = {
      message: error.response?.data?.error || error.message,
      status: error.response?.status,
      code: error.code,
      timestamp: new Date().toISOString()
    };

    // Log error for debugging
    console.error('API Service Error:', errorData);

    return errorData;
  },

  // Connection testing
  async testConnection() {
    try {
      const response = await apiClient.get('/health', { timeout: 5000 });
      return {
        connected: true,
        latency: response.headers['x-response-time'] || 'unknown',
        status: response.data.status
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
};

// Export axios instance for direct use if needed
export { apiClient };

// Connection status hook
export const useApiConnection = () => {
  const [connectionStatus, setConnectionStatus] = React.useState({
    connected: false,
    testing: false,
    latency: null,
    lastChecked: null
  });

  const testConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, testing: true }));
    
    try {
      const result = await apiService.testConnection();
      setConnectionStatus({
        connected: result.connected,
        testing: false,
        latency: result.latency,
        lastChecked: new Date(),
        error: result.error
      });
    } catch (error) {
      setConnectionStatus({
        connected: false,
        testing: false,
        latency: null,
        lastChecked: new Date(),
        error: error.message
      });
    }
  };

  React.useEffect(() => {
    testConnection();
    
    // Test connection every 30 seconds
    const interval = setInterval(testConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { connectionStatus, testConnection };
};

export default apiService;