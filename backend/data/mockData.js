/**
 * In-memory mock data store that simulates a live API gateway.
 * Mutates over time to give realistic demo behaviour.
 */

const crypto = require("crypto");

// ── Helpers ────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const traceId = () => "trace-" + crypto.randomBytes(5).toString("hex");

// ── Static reference data ──────────────────────────────────────────────────
const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const ENDPOINTS = [
  "/api/users",
  "/api/products",
  "/api/orders",
  "/api/auth/login",
  "/api/cart",
  "/api/search",
  "/api/checkout",
  "/api/reviews",
  "/api/wishlist",
  "/api/notifications",
];
const STATUS_CODES = [200, 200, 200, 200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
const CLIENT_IPS = [
  "192.168.1.45",
  "10.0.0.123",
  "172.16.0.89",
  "192.168.2.67",
  "10.1.1.56",
  "203.0.113.22",
  "198.51.100.7",
];

// ── In-memory state ────────────────────────────────────────────────────────
let requestCounter = 1_200_000;
let logs = [];

// Seed initial logs (last 50 requests)
for (let i = 49; i >= 0; i--) {
  logs.push(generateLogEntry(i));
}

function generateLogEntry(secondsAgo = 0) {
  const status = pick(STATUS_CODES);
  return {
    id: ++requestCounter,
    timestamp: new Date(Date.now() - secondsAgo * 1000).toISOString(),
    method: pick(METHODS),
    endpoint: pick(ENDPOINTS),
    status,
    latency: rand(10, 500),
    clientIp: pick(CLIENT_IPS),
    traceId: traceId(),
    gatewayOverhead: rand(8, 18),
  };
}

// Add a new log entry every second
setInterval(() => {
  logs.unshift(generateLogEntry(0));
  if (logs.length > 2000) logs.pop();
}, 1000);

// ── Circuit-breaker state ──────────────────────────────────────────────────
let circuitBreakers = [
  { name: "users-service",     state: "CLOSED",    health: 98, lastChange: "2 hours ago" },
  { name: "products-service",  state: "CLOSED",    health: 95, lastChange: "5 hours ago" },
  { name: "orders-service",    state: "HALF_OPEN", health: 72, lastChange: "15 minutes ago" },
  { name: "payments-service",  state: "CLOSED",    health: 99, lastChange: "1 day ago" },
  { name: "inventory-service", state: "OPEN",      health: 45, lastChange: "3 minutes ago" },
];

// Slowly drift health values
setInterval(() => {
  circuitBreakers = circuitBreakers.map((cb) => {
    const drift = rand(-2, 2);
    const health = Math.max(0, Math.min(100, cb.health + drift));
    let state = cb.state;
    if (health < 50) state = "OPEN";
    else if (health < 80) state = "HALF_OPEN";
    else state = "CLOSED";
    return { ...cb, health, state };
  });
}, 5000);

// ── Recent alerts ──────────────────────────────────────────────────────────
const alertMessages = [
  { type: "error",   msg: "High error rate on /api/checkout" },
  { type: "warning", msg: "Circuit breaker opened for inventory-service" },
  { type: "info",    msg: "Rate limit reached for client 192.168.1.45" },
  { type: "error",   msg: "Backend timeout on orders-service" },
  { type: "warning", msg: "High latency detected on /api/search" },
  { type: "info",    msg: "Deployment completed for users-service" },
  { type: "error",   msg: "503 Service Unavailable on /api/products" },
];

let alerts = alertMessages.map((a, i) => ({
  id: i + 1,
  time: `${(i + 1) * 2}m ago`,
  type: a.type,
  message: a.msg,
  timestamp: new Date(Date.now() - (i + 1) * 2 * 60000).toISOString(),
}));

setInterval(() => {
  const a = pick(alertMessages);
  alerts.unshift({
    id: Date.now(),
    time: "just now",
    type: a.type,
    message: a.msg,
    timestamp: new Date().toISOString(),
  });
  if (alerts.length > 50) alerts.pop();
  // Re-label older entries
  alerts = alerts.map((al, i) => ({
    ...al,
    time: i === 0 ? "just now" : `${i * 2}m ago`,
  }));
}, 30000);

// ── Settings (persisted in memory for demo) ───────────────────────────────
let settings = {
  general: {
    gatewayName: "Gatekeeper API Gateway",
    loggingLevel: "info",
    logRetentionDays: 30,
    adaptiveRateLimiting: true,
    circuitBreaking: true,
    realtimeAnalytics: true,
  },
  rateLimiting: {
    global: { requestsPerMinute: 1000, burstAllowance: 100 },
    adaptive: { enabled: true, sensitivity: "Medium", minLimit: 100, maxLimit: 10000 },
    endpoints: [
      { endpoint: "/api/auth/login", rateLimit: "10/min", adaptive: true },
    ],
  },
  circuitBreakerConfig: {
    failureThreshold: 50,
    requestCount: 10,
    timeoutSeconds: 60,
    halfOpenTestRequests: 3,
  },
  backends: [
    { name: "users-service",    url: "http://localhost:3001", healthPath: "/health", status: "healthy",  weight: 1 },
    { name: "products-service", url: "http://localhost:3002", healthPath: "/health", status: "healthy",  weight: 1 },
    { name: "orders-service",   url: "http://localhost:3003", healthPath: "/health", status: "degraded", weight: 1 },
    { name: "payments-service", url: "http://localhost:3004", healthPath: "/health", status: "healthy",  weight: 2 },
  ],
  security: {
    jwtExpiration: "1h",
    refreshTokenValidity: "7 days",
    concurrentSessions: 5,
    idleSessionTimeout: "30 minutes",
    mfaEnabled: true,
    passwordRotation: false,
    bruteForceProtection: true,
    ipAccessControl: true,
    cors: {
      allowedOrigins: ["https://example.com", "https://app.example.com"],
      allowedMethods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: "Authorization, Content-Type",
      maxAge: "86400s",
      credentials: true,
    },
    ipRules: { whitelist: [], blacklist: ["192.0.2.100"] },
    securityHeaders: {
      xFrameOptions: true,
      xContentTypeOptions: true,
      xXssProtection: true,
      hsts: true,
      referrerPolicy: true,
      csp: true,
    },
  },
  apiKeys: [
    { id: 1, key: "gk_live_abc123...", created: "2024-01-15", lastUsed: "2 hours ago" },
    { id: 2, key: "gk_live_def456...", created: "2024-01-10", lastUsed: "5 minutes ago" },
    { id: 3, key: "gk_test_xyz789...", created: "2024-01-05", lastUsed: "Never" },
  ],
  alerts: {
    rules: [
      { name: "Circuit Breaker State Changes", enabled: true,  threshold: null },
      { name: "High Error Rate",               enabled: true,  threshold: 5 },
      { name: "High Latency",                  enabled: true,  threshold: 1000 },
      { name: "Rate Limit Violations",         enabled: false, threshold: 100 },
    ],
    notifications: { email: "", webhookUrl: "" },
  },
};

// ── Getters / mutators ─────────────────────────────────────────────────────
module.exports = {
  // Live metrics snapshot
  getMetrics() {
    const recentLogs = logs.slice(0, 100);
    const errors = recentLogs.filter((l) => l.status >= 400).length;
    const avgLatency = Math.round(recentLogs.reduce((s, l) => s + l.latency, 0) / recentLogs.length);
    const activeBackends = settings.backends.filter((b) => b.status === "healthy").length;

    return {
      totalRequests: { value: requestCounter.toLocaleString(), change: 12.5 },
      avgLatency:    { value: `${avgLatency}ms`, change: -8.3 },
      errorRate:     { value: `${((errors / recentLogs.length) * 100).toFixed(1)}%`, change: 15.2 },
      activeBackends:{ value: `${activeBackends}/${settings.backends.length}`, change: -20 },
    };
  },

  // Live traffic point (one datapoint for streaming)
  getLiveTrafficPoint() {
    return { time: Date.now(), requests: rand(20, 70) };
  },

  // Last N seconds of live traffic
  getLiveTraffic(seconds = 60) {
    return Array.from({ length: seconds }, (_, i) => ({
      time: i,
      requests: rand(20, 70),
    }));
  },

  // Top endpoints summary
  getTopEndpoints() {
    return ENDPOINTS.map((ep) => ({
      endpoint: ep,
      requests: rand(1000, 15000),
      latency:  rand(20, 250),
      errorRate: parseFloat((Math.random() * 4).toFixed(1)),
    })).sort((a, b) => b.requests - a.requests);
  },

  getCircuitBreakers: () => [...circuitBreakers],

  getAlerts: () => alerts.slice(0, 20),

  // Analytics
  getTrafficOverTime(hours = 24) {
    return Array.from({ length: hours }, (_, i) => ({
      time: `${i}:00`,
      successful: rand(150, 600),
      errors: rand(5, 60),
    }));
  },

  getLatencyDistribution() {
    return [
      { range: "0-10ms",   count: rand(800,  1600) },
      { range: "10-50ms",  count: rand(2500, 4000) },
      { range: "50-100ms", count: rand(1500, 2500) },
      { range: "100-200ms",count: rand(600,  1100) },
      { range: "200-500ms",count: rand(200,  500)  },
      { range: "500ms+",   count: rand(50,   200)  },
    ];
  },

  getErrorsByType() {
    return [
      { name: "4xx Client Errors", value: rand(2000, 5000), color: "#f59e0b" },
      { name: "5xx Server Errors", value: rand(500,  2000), color: "#ef4444" },
    ];
  },

  getEndpointPerformance() {
    return ENDPOINTS.slice(0, 5).map((ep) => ({
      endpoint: ep,
      requests:    rand(10000, 130000),
      avgLatency:  rand(20, 180),
      p95:         rand(80,  300),
      p99:         rand(150, 500),
      successRate: parseFloat((97 + Math.random() * 3).toFixed(1)),
      errors:      rand(10,  200),
    }));
  },

  getClientActivity() {
    return CLIENT_IPS.map((ip) => ({
      client:    ip,
      requests:  rand(1000, 15000),
      errorRate: parseFloat((Math.random() * 25).toFixed(1)),
      violations:rand(0, 50),
      lastSeen:  `${rand(1, 30)}m ago`,
      suspicious: Math.random() > 0.7,
    }));
  },

  // Logs
  getLogs({ page = 1, limit = 25, method, status, search, clientIp } = {}) {
    let filtered = [...logs];
    if (method)   filtered = filtered.filter((l) => l.method === method.toUpperCase());
    if (clientIp) filtered = filtered.filter((l) => l.clientIp.includes(clientIp));
    if (search)   filtered = filtered.filter((l) => l.traceId.includes(search));
    if (status) {
      const code = parseInt(status);
      if (!isNaN(code)) {
        filtered = filtered.filter((l) => l.status === code);
      } else {
        const prefix = parseInt(status.charAt(0));
        filtered = filtered.filter((l) => Math.floor(l.status / 100) === prefix);
      }
    }
    const total = filtered.length;
    const start = (page - 1) * limit;
    return {
      logs: filtered.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  getLogById(id) {
    return logs.find((l) => l.id === Number(id));
  },

  // Settings getters / setters
  getSettings:           () => ({ ...settings }),
  getGeneralSettings:    () => ({ ...settings.general }),
  getRateLimiting:       () => ({ ...settings.rateLimiting }),
  getCBConfig:           () => ({ ...settings.circuitBreakerConfig }),
  getBackends:           () => [...settings.backends],
  getSecurity:           () => ({ ...settings.security }),
  getApiKeys:            () => [...settings.apiKeys],
  getAlertSettings:      () => ({ ...settings.alerts }),

  updateGeneralSettings(data) { settings.general = { ...settings.general, ...data }; return settings.general; },
  updateRateLimiting(data)    { settings.rateLimiting = { ...settings.rateLimiting, ...data }; return settings.rateLimiting; },
  updateCBConfig(data)        { settings.circuitBreakerConfig = { ...settings.circuitBreakerConfig, ...data }; return settings.circuitBreakerConfig; },
  updateSecurity(data)        { settings.security = { ...settings.security, ...data }; return settings.security; },
  updateAlertSettings(data)   { settings.alerts = { ...settings.alerts, ...data }; return settings.alerts; },

  addBackend(backend) {
    const entry = { ...backend, status: "healthy" };
    settings.backends.push(entry);
    return entry;
  },
  updateBackend(name, data) {
    settings.backends = settings.backends.map((b) => b.name === name ? { ...b, ...data } : b);
    return settings.backends.find((b) => b.name === name);
  },
  deleteBackend(name) {
    settings.backends = settings.backends.filter((b) => b.name !== name);
  },

  generateApiKey() {
    const key = "gk_live_" + crypto.randomBytes(8).toString("hex");
    const entry = { id: Date.now(), key, created: new Date().toISOString().split("T")[0], lastUsed: "Never" };
    settings.apiKeys.push(entry);
    return entry;
  },
  revokeApiKey(id) {
    settings.apiKeys = settings.apiKeys.filter((k) => k.id !== Number(id));
  },

  manuallyTripCircuitBreaker(name) {
    circuitBreakers = circuitBreakers.map((cb) =>
      cb.name === name ? { ...cb, state: "OPEN", lastChange: "just now" } : cb
    );
  },
  resetCircuitBreaker(name) {
    circuitBreakers = circuitBreakers.map((cb) =>
      cb.name === name ? { ...cb, state: "CLOSED", health: 90, lastChange: "just now" } : cb
    );
  },
};
