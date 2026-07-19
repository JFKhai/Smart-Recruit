const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    getCurrentUser,
    googleAuth,
    googleCallback,
    facebookAuth,
    facebookCallback
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/facebook', facebookAuth);
router.get('/facebook/callback', facebookCallback);

module.exports = router;