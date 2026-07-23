const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getStats,
  getUsers,
  updateUserStatus,
  deleteUser,
  getJobs,
  closeJob,
  deleteJob,
  getSystemInfo,
  triggerMatchingJob,
  getEmailSettings,
  updateEmailSettings,
  getAuditLogs,
  getAiMonitor,
  retryCvAi,
  retryAllFailedCvAi,
  createBroadcast,
  getBroadcasts,
  resetUserPasswordByAdmin,
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/audit-logs', getAuditLogs);

router.get('/ai-monitor', getAiMonitor);
router.post('/ai-monitor/:id/retry', retryCvAi);
router.post('/ai-monitor/retry-all-failed', retryAllFailedCvAi);

router.get('/broadcast', getBroadcasts);
router.post('/broadcast', createBroadcast);

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.post('/users/:id/reset-password-request', resetUserPasswordByAdmin);
router.delete('/users/:id', deleteUser);

router.get('/jobs', getJobs);
router.patch('/jobs/:id/close', closeJob);
router.delete('/jobs/:id', deleteJob);

router.get('/system', getSystemInfo);
router.get('/system/email-settings', getEmailSettings);
router.put('/system/email-settings', updateEmailSettings);
router.post('/trigger-matching', triggerMatchingJob);

module.exports = router;
