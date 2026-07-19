const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  demoLogin,
  getDemoOrg,
  getDemoBrandKits,
  getDemoAssets,
  getDemoStats,
  getDemoMembers,
} = require('../controllers/demoController');

// Demo auth — no rate limit, always works
router.post('/login', demoLogin);

// Demo data endpoints — require a valid demo token
router.get('/org', protect, getDemoOrg);
router.get('/brandkits', protect, getDemoBrandKits);
router.get('/assets', protect, getDemoAssets);
router.get('/stats', protect, getDemoStats);
router.get('/members', protect, getDemoMembers);

module.exports = router;
