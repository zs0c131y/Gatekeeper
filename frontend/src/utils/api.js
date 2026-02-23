import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let accessToken = null;
let refreshToken = null;
let isRefreshing = false;
let refreshQueue = [];

function setAuthHeader(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

function resolveRefreshQueue(newToken) {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (
      status === 401 &&
      refreshToken &&
      !originalRequest._retry &&
      !String(originalRequest.url || "").includes("/api/auth/refresh")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken) => {
            if (!newToken) return reject(error);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshed = await apiClient.post("/api/auth/refresh", { refreshToken });
        accessToken = refreshed.accessToken;
        setAuthHeader(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        resolveRefreshQueue(accessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        resolveRefreshQueue(null);
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

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
  setToken(token) {
    accessToken = token || null;
    setAuthHeader(accessToken);
  },

  setRefreshToken(token) {
    refreshToken = token || null;
  },

  // Auth
  login: (data) => apiClient.post("/api/auth/login", data),
  logout: () => apiClient.post("/api/auth/logout"),
  refreshToken: (data) => apiClient.post("/api/auth/refresh", data),
  getMe: () => apiClient.get("/api/auth/me"),
  updateProfile: (data) => apiClient.put("/api/auth/profile", data),
  getPreferences: () => apiClient.get("/api/auth/preferences"),
  updatePreferences: (data) => apiClient.put("/api/auth/preferences", data),
  updateAvatar: (data) => apiClient.put("/api/auth/avatar", data),
  changePassword: (data) => apiClient.post("/api/auth/change-password", data),

  // Overview
  getOverview: () => apiClient.get("/api/overview"),
  getOverviewAlerts: () => apiClient.get("/api/overview/alerts"),
  markAlertRead: (id) => apiClient.patch(`/api/overview/alerts/${id}/read`),
  markAllAlertsRead: () => apiClient.patch("/api/overview/alerts/read-all"),
  searchDashboard: (query) => apiClient.get("/api/overview/search", { params: { q: query } }),

  // Analytics
  getTraffic: (params) => apiClient.get("/api/analytics/traffic", { params }),
  getEndpoints: (params) => apiClient.get("/api/analytics/endpoints", { params }),
  getErrors: (params) => apiClient.get("/api/analytics/errors", { params }),
  getSummary: (params) => apiClient.get("/api/analytics/summary", { params }),
  getAnalysis: (params) => apiClient.get("/api/analytics/analysis", { params }),
  getClients: () => apiClient.get("/api/analytics/clients"),

  // Logs
  getLogs: (params) => apiClient.get("/api/logs", { params }),
  getLogByTraceId: (traceId) => apiClient.get(`/api/logs/${traceId}`),

  // Settings
  getSettings: async () => normalizeSettings(await apiClient.get("/api/settings")),
  updateSettings: (data) => apiClient.put("/api/settings", data),
  getGeneralSettings: () => apiClient.get("/api/settings/general"),
  updateGeneralSettings: (data) => apiClient.put("/api/settings/general", data),
  getRateLimitingSettings: () => apiClient.get("/api/settings/rate-limiting"),
  updateRateLimitingSettings: (data) => apiClient.put("/api/settings/rate-limiting", data),
  getCircuitBreakerSettings: () => apiClient.get("/api/settings/circuit-breakers"),
  updateCircuitBreakerSettings: (data) => apiClient.put("/api/settings/circuit-breakers", data),
  getSecuritySettings: () => apiClient.get("/api/settings/security"),
  updateSecuritySettings: (data) => apiClient.put("/api/settings/security", data),
  getAlertSettings: () => apiClient.get("/api/settings/alerts"),
  updateAlertSettings: (data) => apiClient.put("/api/settings/alerts", data),

  // Backends
  getBackends: async () => normalizeBackends(await apiClient.get("/api/settings/backends")),
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
};
