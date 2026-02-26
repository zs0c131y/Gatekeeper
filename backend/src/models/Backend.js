const mongoose = require("mongoose");

const backendSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    baseUrl: {
      type: String,
      required: true,
    },
    healthCheckPath: {
      type: String,
      default: "/health",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    weight: {
      type: Number,
      default: 1,
    },
    timeout: {
      type: Number,
      default: 5000,
    },
    healthyAbove: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    degradedAbove: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    tags: {
      type: [String],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Backend", backendSchema);
