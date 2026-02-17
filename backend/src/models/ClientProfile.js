const mongoose = require('mongoose');

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
      enum: ['ip', 'apikey'],
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
    lastSeen: {
      type: Date,
    },
    isBlocked: {
      type: Boolean,
      required: true,
      default: false,
    },
    customRateLimit: {
      type: Number,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

clientProfileSchema.index({ clientId: 1 }, { unique: true });

module.exports = mongoose.model('ClientProfile', clientProfileSchema);
