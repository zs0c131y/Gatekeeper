import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor to extract data
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export const api = {
  // Overview
  getOverview: () => apiClient.get('/api/overview'),

  // Analytics
  getTraffic: (params) => apiClient.get('/api/analytics/traffic', { params }),
  getEndpoints: () => apiClient.get('/api/analytics/endpoints'),
  getErrors: (params) => apiClient.get('/api/analytics/errors', { params }),

  // Logs
  getLogs: (params) => apiClient.get('/api/logs', { params }),
  getLogByTraceId: (traceId) => apiClient.get(`/api/logs/${traceId}`),

  // Settings
  getSettings: () => apiClient.get('/api/settings'),
  updateSettings: (data) => apiClient.put('/api/settings', data),

  // Backends
  getBackends: () => apiClient.get('/api/backends'),
  createBackend: (data) => apiClient.post('/api/backends', data),
  updateBackend: (id, data) => apiClient.put(`/api/backends/${id}`, data),
  deleteBackend: (id) => apiClient.delete(`/api/backends/${id}`),
};
