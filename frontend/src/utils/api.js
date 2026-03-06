import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// better-auth uses HTTP-only cookies; withCredentials ensures the browser
// sends them with every cross-origin request.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  },
);

function normalizeBackends(payload) {
  if (!payload) return { backends: [] };
  if (Array.isArray(payload)) return { backends: payload };
  if (Array.isArray(payload.backends)) return { backends: payload.backends };
  return { backends: [] };
}

function normalizeSettings(payload) {
  return payload || {};
}

export const api = {
  // User profile (served from /api/user — NOT the better-auth handler)
  getMe: () => apiClient.get("/api/user/me"),
  updateProfile: (data) => apiClient.put("/api/user/profile", data),
  getPreferences: () => apiClient.get("/api/user/preferences"),
  updatePreferences: (data) => apiClient.put("/api/user/preferences", data),
  updateAvatar: (data) => apiClient.put("/api/user/avatar", data),
  // Password change is handled by better-auth's built-in endpoint
  changePassword: (data) => apiClient.post("/api/auth/change-password", data),

  // Overview
  getOverview: (params) => apiClient.get("/api/overview", { params }),
  getOverviewAlerts: () => apiClient.get("/api/overview/alerts"),
  markAlertRead: (id) => apiClient.patch(`/api/overview/alerts/${id}/read`),
  markAllAlertsRead: () => apiClient.patch("/api/overview/alerts/read-all"),
  searchDashboard: (query) =>
    apiClient.get("/api/overview/search", { params: { q: query } }),

  // Analytics
  getTraffic: (params) => apiClient.get("/api/analytics/traffic", { params }),
  getEndpoints: (params) =>
    apiClient.get("/api/analytics/endpoints", { params }),
  getErrors: (params) => apiClient.get("/api/analytics/errors", { params }),
  getSummary: (params) => apiClient.get("/api/analytics/summary", { params }),
  getAnalysis: (params) => apiClient.get("/api/analytics/analysis", { params }),
  getPredictions: (params) => apiClient.get("/api/analytics/predictions", { params }),
  getClients: () => apiClient.get("/api/analytics/clients"),

  // Logs
  getLogs: (params) => apiClient.get("/api/logs", { params }),
  getLogByTraceId: (traceId) => apiClient.get(`/api/logs/${traceId}`),

  // Settings
  getSettings: async () =>
    normalizeSettings(await apiClient.get("/api/settings")),
  updateSettings: (data) => apiClient.put("/api/settings", data),
  getGeneralSettings: () => apiClient.get("/api/settings/general"),
  updateGeneralSettings: (data) => apiClient.put("/api/settings/general", data),
  getRateLimitingSettings: () => apiClient.get("/api/settings/rate-limiting"),
  updateRateLimitingSettings: (data) =>
    apiClient.put("/api/settings/rate-limiting", data),
  getCircuitBreakerSettings: () =>
    apiClient.get("/api/settings/circuit-breakers"),
  updateCircuitBreakerSettings: (data) =>
    apiClient.put("/api/settings/circuit-breakers", data),
  getSecuritySettings: () => apiClient.get("/api/settings/security"),
  updateSecuritySettings: (data) =>
    apiClient.put("/api/settings/security", data),
  getAlertSettings: () => apiClient.get("/api/settings/alerts"),
  updateAlertSettings: (data) => apiClient.put("/api/settings/alerts", data),

  // Backends
  getBackends: async () =>
    normalizeBackends(await apiClient.get("/api/settings/backends")),
  createBackend: (data) =>
    apiClient.post("/api/settings/backends", {
      name: data.name,
      url: data.url || data.base_url,
      healthPath: data.healthPath || data.health_endpoint,
      weight: data.weight,
      timeout: data.timeout,
    }),
  updateBackend: (nameOrId, data) =>
    apiClient.put(`/api/settings/backends/${encodeURIComponent(nameOrId)}`, {
      url: data.url || data.base_url,
      healthPath: data.healthPath || data.health_endpoint,
      weight: data.weight,
      timeout: data.timeout,
      isActive: data.isActive,
    }),
  deleteBackend: (nameOrId) =>
    apiClient.delete(`/api/settings/backends/${encodeURIComponent(nameOrId)}`),

  // API keys
  listApiKeys: () => apiClient.get("/api/admin/api-keys"),
  createApiKey: (data) => apiClient.post("/api/admin/api-keys", data),
  revokeApiKey: (id) => apiClient.patch(`/api/admin/api-keys/${id}/revoke`),
  deleteApiKey: (id) => apiClient.delete(`/api/admin/api-keys/${id}`),

  // Services (unified backend + route)
  getServices: () => apiClient.get("/api/settings/services"),
  createService: (data) => apiClient.post("/api/settings/services", data),
  deleteService: (nameOrId) =>
    apiClient.delete(`/api/settings/services/${encodeURIComponent(nameOrId)}`),

  // Routes
  getRoutes: () => apiClient.get("/api/settings/routes"),
  createRoute: (data) => apiClient.post("/api/settings/routes", data),
  updateRoute: (id, data) => apiClient.put(`/api/settings/routes/${id}`, data),
  deleteRoute: (id) => apiClient.delete(`/api/settings/routes/${id}`),
};
