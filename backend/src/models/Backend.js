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
    tags: {
      type: [String],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Backend", backendSchema);
