const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Config = require('../models/Config');

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@gateway.local',
  password: 'Admin@1234',
  role: 'admin',
};

const DEFAULT_CONFIGS = [
  {
    key: 'rate_limiting.default_rpm',
    value: 100,
    description: 'Default requests per minute limit',
    category: 'rate_limiting',
  },
  {
    key: 'rate_limiting.burst_multiplier',
    value: 1.5,
    description: 'Burst multiplier for rate limiting bucket',
    category: 'rate_limiting',
  },
  {
    key: 'rate_limiting.manual_override_enabled',
    value: false,
    description: 'Enable fixed manual rate limit override for all clients',
    category: 'rate_limiting',
  },
  {
    key: 'rate_limiting.manual_override_rpm',
    value: 0,
    description: 'Manual override requests-per-minute when enabled',
    category: 'rate_limiting',
  },
  {
    key: 'circuit_breaker.failure_threshold',
    value: 5,
    description: 'Number of failures before circuit opens',
    category: 'circuit_breaker',
  },
  {
    key: 'circuit_breaker.recovery_timeout_ms',
    value: 30000,
    description: 'Time in ms before circuit moves to half-open',
    category: 'circuit_breaker',
  },
  {
    key: 'circuit_breaker.half_open_max_calls',
    value: 3,
    description: 'Max test calls allowed in half-open state',
    category: 'circuit_breaker',
  },
  {
    key: 'routing.health_check_interval_ms',
    value: 30000,
    description: 'Interval in ms between backend health checks',
    category: 'routing',
  },
  {
    key: 'routing.custom_headers',
    value: {},
    description: 'Custom headers injected into proxied upstream requests',
    category: 'routing',
  },
  {
    key: 'security.jwt_expiry',
    value: 3600,
    description: 'JWT access token expiry in seconds',
    category: 'security',
  },
  {
    key: 'security.api_key_header',
    value: 'x-api-key',
    description: 'HTTP header name for API key authentication',
    category: 'security',
  },
  {
    key: 'alerts.email',
    value: '',
    description: 'Alert notification email recipient',
    category: 'alerts',
  },
  {
    key: 'alerts.webhook',
    value: '',
    description: 'Alert notification webhook URL',
    category: 'alerts',
  },
  {
    key: 'alerts.rules',
    value: [
      { name: 'Circuit Breaker State Changes', enabled: true },
      { name: 'High Error Rate', enabled: true },
      { name: 'High Latency', enabled: true },
      { name: 'Rate Limit Violations', enabled: false },
    ],
    description: 'Alert rule enablement configuration',
    category: 'alerts',
  },
];

/**
 * Seed the database with default admin user and config documents.
 */
async function seed() {
  // Seed admin user
  const existingAdmin = await User.findOne({ username: DEFAULT_ADMIN.username });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
    await User.create({
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      passwordHash,
      role: DEFAULT_ADMIN.role,
    });
    console.log('Seeded default admin user');
  } else {
    console.log('Admin user already exists, skipping');
  }

  // Seed config documents
  for (const config of DEFAULT_CONFIGS) {
    const existing = await Config.findOne({ key: config.key });
    if (!existing) {
      await Config.create(config);
      console.log(`Seeded config: ${config.key}`);
    } else {
      console.log(`Config already exists: ${config.key}, skipping`);
    }
  }
}

// Run standalone if executed directly
if (require.main === module) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  mongoose
    .connect(uri)
    .then(() => {
      console.log('Connected to MongoDB for seeding');
      return seed();
    })
    .then(() => {
      console.log('Seeding complete');
      return mongoose.disconnect();
    })
    .catch((err) => {
      console.error('Seeding failed:', err.message);
      process.exit(1);
    });
}

module.exports = seed;
