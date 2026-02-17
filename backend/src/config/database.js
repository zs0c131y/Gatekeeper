const mongoose = require('mongoose');
const Redis = require('ioredis');

let redisClient = null;

/**
 * Connect to MongoDB using Mongoose.
 * Connection string is read from process.env.MONGODB_URI.
 */
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    throw err;
  }
}

/**
 * Connect to Redis using ioredis.
 * Connection string is read from process.env.REDIS_URL.
 * @returns {Redis} The Redis client instance.
 */
async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  return new Promise((resolve, reject) => {
    redisClient = new Redis(url);

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
      resolve(redisClient);
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err.message);
      if (!redisClient.status || redisClient.status === 'connecting') {
        reject(err);
      }
    });
  });
}

/**
 * Get the existing Redis client instance.
 * @returns {Redis|null}
 */
function getRedisClient() {
  return redisClient;
}

module.exports = { connectMongoDB, connectRedis, getRedisClient };
