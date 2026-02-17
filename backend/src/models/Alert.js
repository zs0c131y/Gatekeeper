const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['error', 'warning', 'info'],
    },
    message: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    backendId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Backend',
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
    },
    resolvedAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

alertSchema.index({ type: 1 });
alertSchema.index({ isRead: 1 });
alertSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Alert', alertSchema);
