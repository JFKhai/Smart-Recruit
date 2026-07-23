const mongoose = require('mongoose');

const systemBroadcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    targetGroup: {
      type: String,
      enum: ['all', 'candidates', 'employers'],
      default: 'all',
      required: true,
    },
    sendEmail: {
      type: Boolean,
      default: true,
    },
    sendInApp: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['draft', 'processing', 'completed', 'failed'],
      default: 'processing',
      index: true,
    },
    stats: {
      totalTargets: { type: Number, default: 0 },
      sentCount: { type: Number, default: 0 },
      failCount: { type: Number, default: 0 },
    },
    createdAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemBroadcast', systemBroadcastSchema);
