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
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/jobs', getJobs);
router.patch('/jobs/:id/close', closeJob);
router.delete('/jobs/:id', deleteJob);

router.get('/system', getSystemInfo);
router.get('/system/email-settings', getEmailSettings);
router.put('/system/email-settings', updateEmailSettings);
router.post('/trigger-matching', triggerMatchingJob);

module.exports = router;
