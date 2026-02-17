const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    keyHash: {
      type: String,
      required: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
    },
    rateLimit: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

apiKeySchema.index({ keyPrefix: 1 });
apiKeySchema.index({ clientId: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
