const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', '*'],
    },
    backendId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Backend',
      required: true,
    },
    stripPrefix: {
      type: String,
    },
    addPrefix: {
      type: String,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    requiresAuth: {
      type: Boolean,
      required: true,
      default: false,
    },
    rateLimit: {
      type: Number,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

routeSchema.index({ path: 1, method: 1 });
routeSchema.index({ backendId: 1 });

module.exports = mongoose.model('Route', routeSchema);
