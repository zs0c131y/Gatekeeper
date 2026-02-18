const mongoose = require("mongoose");
const { MongoClient, ServerApiVersion } = require("mongodb");
const Redis = require("ioredis");

let mongoClient = null;
let mongoDB = null;
let redisClient = null;

/**
 * Connect to MongoDB using native MongoDB driver (fallback if Mongoose fails).
 * Connection string is read from process.env.MONGODB_URI.
 */
async function connectMongoDBNative() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  try {
    mongoClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await mongoClient.connect();

    // Send a ping to confirm successful connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    mongoDB = mongoClient.db();
    console.log("Connected to MongoDB (native driver)");
    console.log("Database:", mongoDB.databaseName);
    return mongoDB;
  } catch (err) {
    console.error("MongoDB native connection failed:", err.message);
    throw err;
  }
}

/**
 * Connect to MongoDB using Mongoose.
 * Connection string is read from process.env.MONGODB_URI.
 */
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  try {
    // Try Mongoose first with Stable API
    await mongoose.connect(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB via Mongoose");
    console.log("Database:", mongoose.connection.db.databaseName);
  } catch (mongooseErr) {
    console.error("Mongoose connection failed:", mongooseErr.message);
    console.log("Attempting native MongoDB driver...");

    // Fallback to native driver
    try {
      await connectMongoDBNative();
    } catch (nativeErr) {
      console.error("Both Mongoose and native driver failed");
      throw nativeErr;
    }
  }
}

/**
 * Connect to Redis using ioredis.
 * Connection string is read from process.env.REDIS_URL.
 * @returns {Redis|null} The Redis client instance, or null if unavailable.
 */
async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL not set - Redis disabled");
    return null;
  }

  return new Promise((resolve) => {
    redisClient = new Redis(url, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // Disable retries
      lazyConnect: true,
    });

    redisClient.on("connect", () => {
      console.log("Connected to Redis");
      resolve(redisClient);
    });

    redisClient.on("error", () => {
      // Suppress repeated errors - logged once on connect failure
    });

    // Attempt connection with timeout fallback
    redisClient
      .connect()
      .then(() => {
        resolve(redisClient);
      })
      .catch((err) => {
        console.warn("Redis unavailable:", err.message);
        console.warn("Server will continue without Redis caching");
        redisClient = null;
        resolve(null);
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

/**
 * Get the MongoDB database instance.
 * @returns {Db|null}
 */
function getMongoDatabase() {
  return mongoDB;
}

/**
 * Get the MongoDB client instance.
 * @returns {MongoClient|null}
 */
function getMongoClient() {
  return mongoClient;
}

module.exports = {
  connectMongoDB,
  connectRedis,
  getRedisClient,
  getMongoDatabase,
  getMongoClient,
};
