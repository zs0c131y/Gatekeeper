const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
    },
    period: {
      type: String,
      required: true,
      enum: ['minute', 'hour', 'day'],
    },
    totalRequests: {
      type: Number,
      required: true,
    },
    successCount: {
      type: Number,
      required: true,
    },
    errorCount: {
      type: Number,
      required: true,
    },
    avgLatency: {
      type: Number,
      required: true,
    },
    p50Latency: {
      type: Number,
    },
    p95Latency: {
      type: Number,
    },
    p99Latency: {
      type: Number,
    },
    throughput: {
      type: Number,
    },
    backendId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Backend',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsSchema.index({ timestamp: 1, period: 1 });
analyticsSchema.index({ backendId: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
