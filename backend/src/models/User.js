const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'viewer'],
      default: 'viewer',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    avatar: {
      data: {
        type: String,
      },
      mimeType: {
        type: String,
        enum: ['image/png', 'image/jpeg', 'image/webp'],
      },
      updatedAt: {
        type: Date,
      },
    },
    preferences: {
      emailAlerts: {
        type: Boolean,
        default: true,
      },
      liveDashboard: {
        type: Boolean,
        default: true,
      },
      compactTables: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
