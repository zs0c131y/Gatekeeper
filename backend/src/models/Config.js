const mongoose = require('mongoose');

const configSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      required: true,
      enum: ['rate_limiting', 'circuit_breaker', 'routing', 'security', 'general', 'alerts'],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    updatedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

configSchema.index({ category: 1 });

module.exports = mongoose.model('Config', configSchema);
