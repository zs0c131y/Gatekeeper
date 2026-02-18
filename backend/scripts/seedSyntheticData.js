#!/usr/bin/env node

/**
 * Synthetic Data Seeder for Gatekeeper API Gateway
 * =================================================
 * Generates realistic API gateway traffic data and seeds it into MongoDB and Redis.
 *
 * Usage:
 *   node scripts/seedSyntheticData.js [options]
 *
 * Options:
 *   --count=N   Number of log entries to generate (default: 50000)
 *   --days=N    Spread logs across N days (default: 30)
 *   --clean     Drop existing seeded data before inserting
 *
 * Environment:
 *   MONGODB_URI  MongoDB connection string (default: mongodb://localhost:27017/gateway_db)
 *   REDIS_URL    Redis connection string   (default: redis://localhost:6379)
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const Redis = require("ioredis");
const crypto = require("crypto");

// ── Models ─────────────────────────────────────────────────────────────────
const Backend = require("../src/models/Backend");
const Route = require("../src/models/Route");
const Log = require("../src/models/Log");
const Analytics = require("../src/models/Analytics");
const Alert = require("../src/models/Alert");
const ClientProfile = require("../src/models/ClientProfile");

// ── Redis key helpers ──────────────────────────────────────────────────────
const redisKeys = require("../src/config/redisKeys");

// ── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2).reduce((acc, arg) => {
    if (arg.startsWith("--")) {
        const [key, val] = arg.slice(2).split("=");
        acc[key] = val === undefined ? true : val;
    }
    return acc;
}, {});

const LOG_COUNT = parseInt(args.count) || 50000;
const DAYS = parseInt(args.days) || 30;
const CLEAN = !!args.clean;

// ── Reference data (blueprint from mockData.js) ───────────────────────────
const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const METHOD_WEIGHTS = [40, 25, 15, 10, 10]; // percentage weights

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

const STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
const STATUS_WEIGHTS = [40, 15, 10, 8, 7, 5, 8, 4, 2, 1]; // percentage weights

const CLIENT_IPS = [
    "192.168.1.45", "10.0.0.123", "172.16.0.89", "192.168.2.67",
    "10.1.1.56", "203.0.113.22", "198.51.100.7", "192.168.10.101",
    "10.0.5.33", "172.16.2.200", "203.0.113.55", "198.51.100.42",
    "192.168.3.88", "10.2.0.15", "172.16.5.77", "203.0.113.100",
    "198.51.100.200", "192.168.100.1", "10.10.10.10", "172.16.0.1",
];

const BACKEND_SERVICES = [
    { name: "users-service", baseUrl: "http://users-service:3001", healthCheckPath: "/health", weight: 1, timeout: 5000, tags: ["core", "auth"] },
    { name: "products-service", baseUrl: "http://products-service:3002", healthCheckPath: "/health", weight: 1, timeout: 5000, tags: ["core", "catalog"] },
    { name: "orders-service", baseUrl: "http://orders-service:3003", healthCheckPath: "/health", weight: 1, timeout: 8000, tags: ["core", "transactions"] },
    { name: "payments-service", baseUrl: "http://payments-service:3004", healthCheckPath: "/health", weight: 2, timeout: 10000, tags: ["core", "transactions"] },
    { name: "inventory-service", baseUrl: "http://inventory-service:3005", healthCheckPath: "/health", weight: 1, timeout: 5000, tags: ["support"] },
];

// Maps endpoints to backend service names
const ENDPOINT_BACKEND_MAP = {
    "/api/users": "users-service",
    "/api/auth/login": "users-service",
    "/api/products": "products-service",
    "/api/search": "products-service",
    "/api/reviews": "products-service",
    "/api/wishlist": "products-service",
    "/api/orders": "orders-service",
    "/api/checkout": "payments-service",
    "/api/cart": "orders-service",
    "/api/notifications": "inventory-service",
};

const ROUTE_DEFINITIONS = [
    { path: "/api/users/*", method: "*", backend: "users-service", requiresAuth: true, rateLimit: 200 },
    { path: "/api/auth/*", method: "*", backend: "users-service", requiresAuth: false, rateLimit: 30 },
    { path: "/api/products/*", method: "GET", backend: "products-service", requiresAuth: false, rateLimit: 500 },
    { path: "/api/products/*", method: "POST", backend: "products-service", requiresAuth: true, rateLimit: 50 },
    { path: "/api/orders/*", method: "*", backend: "orders-service", requiresAuth: true, rateLimit: 100 },
    { path: "/api/cart/*", method: "*", backend: "orders-service", requiresAuth: true, rateLimit: 200 },
    { path: "/api/checkout/*", method: "*", backend: "payments-service", requiresAuth: true, rateLimit: 20 },
    { path: "/api/search/*", method: "GET", backend: "products-service", requiresAuth: false, rateLimit: 300 },
    { path: "/api/reviews/*", method: "*", backend: "products-service", requiresAuth: false, rateLimit: 100 },
    { path: "/api/notifications/*", method: "GET", backend: "inventory-service", requiresAuth: true, rateLimit: 100 },
];

const ERROR_MESSAGES = {
    400: ["Bad Request: invalid JSON payload", "Bad Request: missing required field 'id'", "Bad Request: validation failed for field 'email'"],
    401: ["Unauthorized: token expired", "Unauthorized: invalid credentials", "Unauthorized: missing authorization header"],
    403: ["Forbidden: insufficient permissions", "Forbidden: IP address blacklisted", "Forbidden: API key revoked"],
    404: ["Not Found: resource does not exist", "Not Found: endpoint not registered", "Not Found: user not found"],
    500: ["Internal Server Error: database connection timeout", "Internal Server Error: unhandled exception in handler", "Internal Server Error: null pointer in serializer"],
    502: ["Bad Gateway: upstream service unreachable", "Bad Gateway: connection refused by backend"],
    503: ["Service Unavailable: circuit breaker OPEN", "Service Unavailable: backend overloaded"],
};

const ALERT_TEMPLATES = [
    { type: "error", message: "High error rate on /api/checkout — 15% errors in last 5 minutes", source: "health_monitor" },
    { type: "error", message: "Backend timeout on orders-service — 3 consecutive failures", source: "circuit_breaker" },
    { type: "error", message: "503 Service Unavailable on /api/products — circuit breaker tripped", source: "circuit_breaker" },
    { type: "error", message: "Database connection pool exhausted on payments-service", source: "health_monitor" },
    { type: "error", message: "JWT validation failure spike — 50 invalid tokens in 1 minute", source: "rate_limiter" },
    { type: "warning", message: "Circuit breaker moved to HALF_OPEN for inventory-service", source: "circuit_breaker" },
    { type: "warning", message: "High latency detected on /api/search — p95 exceeds 800ms", source: "health_monitor" },
    { type: "warning", message: "Rate limit threshold reached for client 203.0.113.22", source: "rate_limiter" },
    { type: "warning", message: "Backend health score degraded for orders-service: 72/100", source: "health_monitor" },
    { type: "warning", message: "Disk usage on MongoDB approaching 80%", source: "health_monitor" },
    { type: "info", message: "Rate limit adjusted for /api/auth/login — reduced to 10/min", source: "rate_limiter" },
    { type: "info", message: "Deployment completed for users-service v2.3.1", source: "health_monitor" },
    { type: "info", message: "Circuit breaker reset for inventory-service — service recovered", source: "circuit_breaker" },
    { type: "info", message: "New API key generated for client mobile-app", source: "health_monitor" },
    { type: "info", message: "Backend products-service scaled to weight=2", source: "health_monitor" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const traceId = () => "trace-" + crypto.randomBytes(8).toString("hex");

/** Weighted random selection */
function weightedPick(items, weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

/** Gaussian random number using Box-Muller transform */
function gaussian(mean, stddev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
}

/** Progress bar for terminal output */
function printProgress(label, current, total) {
    const pct = Math.round((current / total) * 100);
    const barLen = 30;
    const filled = Math.round((current / total) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
    process.stdout.write(`\r  ${label} [${bar}] ${pct}% (${current}/${total})`);
    if (current === total) process.stdout.write("\n");
}

// ── Database connections ───────────────────────────────────────────────────
async function connectMongoDB() {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/gateway_db";
    console.log(`  Connecting to MongoDB: ${uri.replace(/\/\/.*@/, "//***@")}`);
    await mongoose.connect(uri);
    console.log("  ✓ MongoDB connected");
}

async function connectRedis() {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    console.log(`  Connecting to Redis: ${url.replace(/\/\/.*@/, "//***@")}`);
    return new Promise((resolve, reject) => {
        const client = new Redis(url);
        client.on("connect", () => {
            console.log("  ✓ Redis connected");
            resolve(client);
        });
        client.on("error", (err) => {
            reject(new Error(`Redis connection failed: ${err.message}`));
        });
    });
}

// ── Seeder functions ───────────────────────────────────────────────────────

/**
 * Seed Backend services into MongoDB.
 * Returns a Map of backend name → ObjectId.
 */
async function seedBackends() {
    console.log("\n📦 Seeding Backends...");
    const backendMap = new Map();

    for (const svc of BACKEND_SERVICES) {
        let existing = await Backend.findOne({ name: svc.name });
        if (!existing) {
            existing = await Backend.create(svc);
            console.log(`  + Created backend: ${svc.name}`);
        } else {
            console.log(`  ○ Backend exists: ${svc.name}`);
        }
        backendMap.set(svc.name, existing._id);
    }

    return backendMap;
}

/**
 * Seed Routes into MongoDB.
 */
async function seedRoutes(backendMap) {
    console.log("\n🛤️  Seeding Routes...");

    for (const route of ROUTE_DEFINITIONS) {
        const backendId = backendMap.get(route.backend);
        const exists = await Route.findOne({ path: route.path, method: route.method });
        if (!exists) {
            await Route.create({
                path: route.path,
                method: route.method,
                backendId,
                requiresAuth: route.requiresAuth,
                rateLimit: route.rateLimit,
                isActive: true,
                priority: route.rateLimit ? 10 : 0,
            });
            console.log(`  + Created route: ${route.method} ${route.path} → ${route.backend}`);
        } else {
            console.log(`  ○ Route exists: ${route.method} ${route.path}`);
        }
    }
}

/**
 * Seed Log entries into MongoDB.
 * Returns the generated logs array for analytics aggregation.
 */
async function seedLogs(backendMap) {
    console.log(`\n📝 Seeding ${LOG_COUNT.toLocaleString()} Log entries across ${DAYS} days...`);

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const startMs = now - DAYS * msPerDay;
    const batchSize = 5000;
    const batches = Math.ceil(LOG_COUNT / batchSize);
    const allLogs = [];

    for (let b = 0; b < batches; b++) {
        const batch = [];
        const count = Math.min(batchSize, LOG_COUNT - b * batchSize);

        for (let i = 0; i < count; i++) {
            const timestamp = new Date(startMs + Math.random() * (now - startMs));
            const method = weightedPick(METHODS, METHOD_WEIGHTS);
            const endpoint = pick(ENDPOINTS);
            const status = weightedPick(STATUS_CODES, STATUS_WEIGHTS);
            const latency = Math.max(5, Math.min(2000, Math.round(gaussian(120, 80))));
            const gatewayOverhead = rand(3, 18);
            const clientIp = pick(CLIENT_IPS);
            const backendName = ENDPOINT_BACKEND_MAP[endpoint] || "users-service";
            const backendId = backendMap.get(backendName);

            const entry = {
                traceId: traceId(),
                timestamp,
                method,
                endpoint,
                status,
                latency,
                gatewayOverhead,
                clientIp,
                backendId,
                requestSize: Math.max(0, Math.round(gaussian(1200, 500))),
                responseSize: Math.max(0, Math.round(gaussian(5000, 2000))),
            };

            // Add error message for 4xx/5xx
            if (status >= 400 && ERROR_MESSAGES[status]) {
                entry.errorMessage = pick(ERROR_MESSAGES[status]);
            }

            batch.push(entry);
        }

        // Bulk insert
        await Log.insertMany(batch, { ordered: false }).catch((err) => {
            // Ignore duplicate key errors if re-running
            if (err.code !== 11000) throw err;
        });

        allLogs.push(...batch);
        printProgress("Logs", Math.min((b + 1) * batchSize, LOG_COUNT), LOG_COUNT);
    }

    return allLogs;
}

/**
 * Seed Analytics from generated logs.
 * Aggregates into hourly buckets.
 */
async function seedAnalytics(logs, backendMap) {
    console.log("\n📊 Seeding Analytics (hourly aggregates)...");

    // Group logs by hour
    const hourlyBuckets = new Map();
    for (const log of logs) {
        const d = new Date(log.timestamp);
        const hourKey = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).toISOString();
        if (!hourlyBuckets.has(hourKey)) {
            hourlyBuckets.set(hourKey, []);
        }
        hourlyBuckets.get(hourKey).push(log);
    }

    const analyticsDocs = [];
    let count = 0;
    const total = hourlyBuckets.size;

    for (const [hourKey, bucket] of hourlyBuckets) {
        const latencies = bucket.map((l) => l.latency).sort((a, b) => a - b);
        const successCount = bucket.filter((l) => l.status >= 200 && l.status < 400).length;
        const errorCount = bucket.length - successCount;
        const avgLatency = Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length);
        const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
        const throughput = parseFloat((bucket.length / 3600).toFixed(2));

        analyticsDocs.push({
            timestamp: new Date(hourKey),
            period: "hour",
            totalRequests: bucket.length,
            successCount,
            errorCount,
            avgLatency,
            p50Latency: p50,
            p95Latency: p95,
            p99Latency: p99,
            throughput,
        });

        count++;
        if (count % 50 === 0 || count === total) {
            printProgress("Analytics", count, total);
        }
    }

    if (analyticsDocs.length > 0) {
        await Analytics.insertMany(analyticsDocs, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
        });
    }

    console.log(`  → Inserted ${analyticsDocs.length} hourly analytics documents`);
}

/**
 * Seed Alerts into MongoDB.
 */
async function seedAlerts(backendMap) {
    console.log("\n🔔 Seeding Alerts...");

    const alertDocs = [];
    const backendIds = [...backendMap.values()];
    const now = Date.now();

    for (let i = 0; i < 50; i++) {
        const template = pick(ALERT_TEMPLATES);
        const minutesAgo = rand(1, DAYS * 24 * 60);

        alertDocs.push({
            type: template.type,
            message: template.message,
            source: template.source,
            backendId: pick(backendIds),
            isRead: Math.random() > 0.3, // 70% read
            resolvedAt: template.type === "info" ? new Date(now - (minutesAgo - rand(1, 10)) * 60000) : undefined,
            metadata: {
                severity: template.type === "error" ? "critical" : template.type === "warning" ? "medium" : "low",
                autoResolved: Math.random() > 0.5,
            },
            createdAt: new Date(now - minutesAgo * 60000),
        });
    }

    await Alert.insertMany(alertDocs);
    console.log(`  → Inserted ${alertDocs.length} alerts`);
}

/**
 * Seed ClientProfiles from generated logs.
 */
async function seedClientProfiles(logs) {
    console.log("\n👤 Seeding ClientProfiles...");

    const ipStats = new Map();
    for (const log of logs) {
        if (!ipStats.has(log.clientIp)) {
            ipStats.set(log.clientIp, { total: 0, blocked: 0, latencySum: 0, lastSeen: log.timestamp });
        }
        const stats = ipStats.get(log.clientIp);
        stats.total++;
        if (log.status === 429) stats.blocked++;
        stats.latencySum += log.latency;
        if (new Date(log.timestamp) > new Date(stats.lastSeen)) {
            stats.lastSeen = log.timestamp;
        }
    }

    const profiles = [];
    for (const [ip, stats] of ipStats) {
        profiles.push({
            clientId: ip,
            clientType: "ip",
            totalRequests: stats.total,
            blockedRequests: stats.blocked,
            avgLatency: Math.round(stats.latencySum / stats.total),
            lastSeen: stats.lastSeen,
            isBlocked: false,
            notes: "",
        });
    }

    // Upsert to avoid duplicates
    for (const profile of profiles) {
        await ClientProfile.findOneAndUpdate(
            { clientId: profile.clientId },
            { $set: profile },
            { upsert: true }
        );
    }

    console.log(`  → Upserted ${profiles.length} client profiles`);
}

/**
 * Seed Redis with circuit breaker state, health scores, rate-limit counters,
 * and metrics cache.
 */
async function seedRedis(redis, backendMap, logs) {
    console.log("\n🔴 Seeding Redis...");

    const pipeline = redis.pipeline();

    // ── Circuit breaker state ────────────────────────────────────────────
    const cbStates = [
        { name: "users-service", state: "CLOSED", failures: 0, health: 98 },
        { name: "products-service", state: "CLOSED", failures: 1, health: 95 },
        { name: "orders-service", state: "HALF_OPEN", failures: 4, health: 72 },
        { name: "payments-service", state: "CLOSED", failures: 0, health: 99 },
        { name: "inventory-service", state: "OPEN", failures: 8, health: 45 },
    ];

    for (const cb of cbStates) {
        pipeline.set(redisKeys.circuitState(cb.name), cb.state);
        pipeline.set(redisKeys.circuitFailureCount(cb.name), cb.failures.toString());
        pipeline.set(redisKeys.circuitLastFailure(cb.name), new Date(Date.now() - rand(60, 86400) * 1000).toISOString());
        pipeline.set(redisKeys.healthScore(cb.name), cb.health.toString());
        pipeline.set(redisKeys.healthLastCheck(cb.name), new Date().toISOString());
        console.log(`  ⚡ CB state: ${cb.name} → ${cb.state} (health: ${cb.health})`);
    }

    // ── Rate limit counters ──────────────────────────────────────────────
    for (const ip of CLIENT_IPS) {
        const counter = rand(10, 150);
        const bucketTokens = rand(50, 200);
        pipeline.set(redisKeys.rateLimitCounter(ip), counter.toString());
        pipeline.expire(redisKeys.rateLimitCounter(ip), 60);
        pipeline.set(redisKeys.rateLimitBucket(ip), JSON.stringify({
            tokens: bucketTokens,
            lastRefill: new Date().toISOString(),
            capacity: 200,
        }));
        pipeline.expire(redisKeys.rateLimitBucket(ip), 120);
    }
    console.log(`  ⚡ Rate limit state seeded for ${CLIENT_IPS.length} IPs`);

    // ── Metrics cache ────────────────────────────────────────────────────
    const recentLogs = logs.slice(-200);
    const errors = recentLogs.filter((l) => l.status >= 400).length;
    const avgLat = Math.round(recentLogs.reduce((s, l) => s + l.latency, 0) / (recentLogs.length || 1));

    const overviewCache = JSON.stringify({
        totalRequests: logs.length,
        avgLatency: avgLat,
        errorRate: parseFloat(((errors / (recentLogs.length || 1)) * 100).toFixed(1)),
        activeBackends: 4,
        totalBackends: 5,
        cachedAt: new Date().toISOString(),
    });

    pipeline.set(redisKeys.overviewCache(), overviewCache);
    pipeline.expire(redisKeys.overviewCache(), 300);

    // Hourly metrics cache
    const hourlyCache = JSON.stringify({
        period: "hour",
        totalRequests: rand(1500, 3000),
        successCount: rand(1200, 2800),
        errorCount: rand(50, 200),
        avgLatency: avgLat,
        cachedAt: new Date().toISOString(),
    });
    pipeline.set(redisKeys.metricsCache("hour"), hourlyCache);
    pipeline.expire(redisKeys.metricsCache("hour"), 3600);

    console.log("  ⚡ Metrics cache seeded");

    await pipeline.exec();
    console.log("  ✓ Redis pipeline executed");
}

/**
 * Clean existing seeded data.
 */
async function cleanData(redis) {
    console.log("\n🧹 Cleaning existing data...");

    await Promise.all([
        Log.deleteMany({}),
        Analytics.deleteMany({}),
        Alert.deleteMany({}),
        ClientProfile.deleteMany({}),
        Route.deleteMany({}),
        Backend.deleteMany({}),
    ]);
    console.log("  ✓ MongoDB collections cleared");

    // Flush Redis keys we manage
    const allKeys = [];
    for (const svc of BACKEND_SERVICES) {
        allKeys.push(
            redisKeys.circuitState(svc.name),
            redisKeys.circuitFailureCount(svc.name),
            redisKeys.circuitLastFailure(svc.name),
            redisKeys.healthScore(svc.name),
            redisKeys.healthLastCheck(svc.name)
        );
    }
    for (const ip of CLIENT_IPS) {
        allKeys.push(redisKeys.rateLimitCounter(ip), redisKeys.rateLimitBucket(ip));
    }
    allKeys.push(redisKeys.overviewCache(), redisKeys.metricsCache("hour"));

    if (allKeys.length > 0) {
        await redis.del(...allKeys);
    }
    console.log("  ✓ Redis keys cleared");
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║   Gatekeeper — Synthetic Data Seeder            ║");
    console.log("╚══════════════════════════════════════════════════╝");
    console.log(`  Config: ${LOG_COUNT.toLocaleString()} logs, ${DAYS} days, clean=${CLEAN}`);
    console.log("");

    const startTime = Date.now();

    // Connect
    console.log("🔌 Connecting to databases...");
    await connectMongoDB();
    const redis = await connectRedis();

    try {
        // Clean if requested
        if (CLEAN) {
            await cleanData(redis);
        }

        // Seed in dependency order
        const backendMap = await seedBackends();
        await seedRoutes(backendMap);
        const logs = await seedLogs(backendMap);
        await seedAnalytics(logs, backendMap);
        await seedAlerts(backendMap);
        await seedClientProfiles(logs);
        await seedRedis(redis, backendMap, logs);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log("\n╔══════════════════════════════════════════════════╗");
        console.log("║   ✅ Seeding Complete                            ║");
        console.log("╚══════════════════════════════════════════════════╝");
        console.log(`  Time: ${elapsed}s`);
        console.log(`  Logs: ${LOG_COUNT.toLocaleString()}`);
        console.log(`  Analytics: hourly aggregates for ${DAYS} days`);
        console.log(`  Alerts: 50`);
        console.log(`  Backends: ${BACKEND_SERVICES.length}`);
        console.log(`  Routes: ${ROUTE_DEFINITIONS.length}`);
        console.log(`  Client Profiles: ${CLIENT_IPS.length}`);
        console.log(`  Redis keys: circuit breakers, health, rate limits, metrics`);
    } catch (err) {
        console.error("\n❌ Seeding failed:", err.message);
        console.error(err.stack);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        redis.disconnect();
        console.log("\n🔌 Disconnected from databases");
    }
}

main();
