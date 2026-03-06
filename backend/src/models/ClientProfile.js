const mongoose = require("mongoose");

const clientProfileSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
    },
    clientType: {
      type: String,
      required: true,
      enum: ["ip", "apikey"],
    },
    totalRequests: {
      type: Number,
      required: true,
      default: 0,
    },
    blockedRequests: {
      type: Number,
      required: true,
      default: 0,
    },
    avgLatency: {
      type: Number,
    },
    firstSeen: {
      type: Date,
    },
    lastSeen: {
      type: Date,
    },
    avgRequestInterval: {
      type: Number,
      default: 0,
    },
    rateLimitViolations: {
      type: Number,
      default: 0,
    },
    behaviorScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    isBlocked: {
      type: Boolean,
      required: true,
      default: false,
    },
    isWhitelisted: {
      type: Boolean,
      default: false,
    },
    customRateLimit: {
      type: Number,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ClientProfile", clientProfileSchema);
