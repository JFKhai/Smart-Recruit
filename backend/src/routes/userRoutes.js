const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { updateMySettings, getMyProfile, getEmployerStats, getCompanyProfile, updateCompanyProfile } = require('../controllers/userController');

router.get('/me/profile', protect, getMyProfile);

router.put('/me/settings', protect, updateMySettings);

router.get('/employer/stats', protect, authorize('employer', 'admin'), getEmployerStats);

router.get('/me/company-profile', protect, authorize('candidate', 'employer', 'admin'), getCompanyProfile);

router.put('/me/company-profile', protect, authorize('candidate', 'employer', 'admin'), updateCompanyProfile);

module.exports = router;
