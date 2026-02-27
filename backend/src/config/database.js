const mongoose = require("mongoose");
const { MongoClient, ServerApiVersion } = require("mongodb");
const Redis = require("ioredis");
const logger = require("../utils/logger");

let mongoClient = null;
let mongoDB = null;
let redisClient = null;

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
    await mongoClient.db("admin").command({ ping: 1 });
    logger.info("Connected to MongoDB (native driver)");

    mongoDB = mongoClient.db();
    logger.info("Database: " + mongoDB.databaseName);
    return mongoDB;
  } catch (err) {
    logger.error("MongoDB native connection failed", { error: err.message });
    throw err;
  }
}

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  try {
    await mongoose.connect(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    logger.info("Connected to MongoDB via Mongoose");
    logger.info("Database: " + mongoose.connection.db.databaseName);
  } catch (mongooseErr) {
    logger.error("Mongoose connection failed", { error: mongooseErr.message });
    logger.info("Attempting native MongoDB driver...");

    try {
      await connectMongoDBNative();
    } catch (nativeErr) {
      logger.error("Both Mongoose and native driver failed");
      throw nativeErr;
    }
  }
}

async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  return new Promise((resolve, reject) => {
    redisClient = new Redis(url, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    redisClient.on("connect", () => {
      logger.info("Connected to Redis");
    });

    redisClient.on("error", () => {});

    redisClient
      .connect()
      .then(() => {
        resolve(redisClient);
      })
      .catch((err) => {
        logger.error("Redis connection failed", { error: err.message });
        redisClient = null;
        reject(err);
      });
  });
}

function getRedisClient() {
  return redisClient;
}

function getMongoDatabase() {
  return mongoDB;
}

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
