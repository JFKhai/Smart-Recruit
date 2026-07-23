const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOCK_USER',
        'UNLOCK_USER',
        'DELETE_USER',
        'CHANGE_ROLE',
        'APPROVE_JOB',
        'REJECT_JOB',
        'DELETE_JOB',
        'RETRY_AI_PARSING',
        'CREATE_SYSTEM_BROADCAST',
        'UPDATE_SYSTEM_SETTINGS',
      ],
      index: true,
    },
    targetModel: {
      type: String,
      required: true,
      enum: ['User', 'Job', 'CvProfile', 'SystemSetting', 'SystemBroadcast'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    details: {
      type: Object,
      default: {},
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
    },
    userAgent: {
      type: String,
      default: 'Unknown',
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
