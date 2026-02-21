import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor to extract data
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  },
);

export const api = {
  /** Inject or clear the Authorization header on all subsequent requests. */
  setToken(token) {
    if (token) {
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common["Authorization"];
    }
  },

  // Auth
  login: (data) => apiClient.post("/api/auth/login", data),
  logout: () => apiClient.post("/api/auth/logout"),
  refreshToken: (data) => apiClient.post("/api/auth/refresh", data),
  getMe: () => apiClient.get("/api/auth/me"),
  changePassword: (data) => apiClient.post("/api/auth/change-password", data),

  // Overview
  getOverview: () => apiClient.get("/api/overview"),

  // Analytics
  getTraffic: (params) => apiClient.get("/api/analytics/traffic", { params }),
  getEndpoints: () => apiClient.get("/api/analytics/endpoints"),
  getErrors: (params) => apiClient.get("/api/analytics/errors", { params }),
  getAnalysis: () => apiClient.get("/api/analytics/analysis"),

  // Logs
  getLogs: (params) => apiClient.get("/api/logs", { params }),
  getLogByTraceId: (traceId) => apiClient.get(`/api/logs/${traceId}`),

  // Settings
  getSettings: () => apiClient.get("/api/settings"),
  updateSettings: (d) => apiClient.put("/api/settings", d),

  // Backends
  getBackends: () => apiClient.get("/api/settings/backends"),
  createBackend: (data) => apiClient.post("/api/settings/backends", data),
  updateBackend: (name, d) =>
    apiClient.put(`/api/settings/backends/${name}`, d),
  deleteBackend: (name) => apiClient.delete(`/api/settings/backends/${name}`),

  // Admin API keys
  listApiKeys: () => apiClient.get("/api/admin/api-keys"),
  createApiKey: (d) => apiClient.post("/api/admin/api-keys", d),
  revokeApiKey: (id) => apiClient.patch(`/api/admin/api-keys/${id}/revoke`),
  deleteApiKey: (id) => apiClient.delete(`/api/admin/api-keys/${id}`),
};
