const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { createClient } = require("redis");
require("dotenv").config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Configuration
const mongoUri = process.env.MONGO_URI;
const mongoClient = new MongoClient(mongoUri);

// Redis Configuration
const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

// Initialize connections
async function initializeConnections() {
  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log("Connected to MongoDB successfully");

    // Connect to Redis
    await redisClient.connect();
    console.log("Connected to Redis successfully");
  } catch (error) {
    console.error("Error connecting to databases:", error);
    process.exit(1);
  }
}

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Gatekeeper API is running" });
});

// Initialize connections and start server
initializeConnections().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

// Export clients for use in other modules
module.exports = {
  mongoClient,
  redisClient,
  app,
};
