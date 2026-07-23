const AuditLog = require('../models/AuditLog');

/**
 * Safely log an administrative action to the AuditLog collection.
 */
const logAdminAction = async ({ req, adminId, action, targetModel, targetId, details = {} }) => {
  try {
    const effectiveAdminId = adminId || req?.user?._id;
    if (!effectiveAdminId) return;

    const ipAddress =
      req?.headers['x-forwarded-for']?.split(',')[0] ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';
      
    const userAgent = req?.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      adminId: effectiveAdminId,
      action,
      targetModel,
      targetId,
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('[AuditLog] Error recording admin action:', error.message);
  }
};

module.exports = { logAdminAction };
