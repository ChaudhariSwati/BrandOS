const express = require('express');
const router = express.Router();
const { signup, login, refresh, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Rate-limited auth endpoints
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);

// Token refresh — uses its own rate limit to prevent abuse
router.post('/refresh', authLimiter, refresh);

// Logout (revoke refresh token)
router.post('/logout', logout);

// Protected route
router.get('/me', protect, getMe);

module.exports = router;
