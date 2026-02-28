const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    traceId: {
      type: String,
      required: true,
      unique: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    method: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
      required: true,
    },
    latency: {
      type: Number,
      required: true,
    },
    gatewayOverhead: {
      type: Number,
    },
    clientIp: {
      type: String,
      required: true,
    },
    backendId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Backend",
    },
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    errorMessage: {
      type: String,
    },
    errorStack: {
      type: String,
    },
    requestSize: {
      type: Number,
    },
    responseSize: {
      type: Number,
    },
    /**
     * Marks logs produced by the real request proxy.
     * Seeded / simulated logs will not have this field set.
     * Use source:'gateway' to differentiate live traffic from demo data.
     */
    source: {
      type: String,
      enum: ["gateway"],
    },
  },
  { timestamps: false },
);

logSchema.index({ timestamp: -1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
logSchema.index({ endpoint: 1, timestamp: -1 });
logSchema.index({ clientIp: 1, timestamp: -1 });
logSchema.index({ status: 1 });
logSchema.index({ source: 1 });

module.exports = mongoose.model("Log", logSchema);
