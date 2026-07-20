const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  demoLogin,
  getDemoOrg,
  createDemoBrandKit,
  getDemoBrandKits,
  getDemoBrandKitById,
  updateDemoBrandKit,
  deleteDemoBrandKit,
  uploadDemoLogo,
  setActiveDemoKit,
  extractDemoColors,
  getDemoAssets,
  getDemoStats,
  getDemoMembers,
} = require('../controllers/demoController');

// Demo auth — no rate limit, always works
router.post('/login', demoLogin);

// Demo data endpoints — require a valid demo token
router.get('/org', protect, getDemoOrg);
router.get('/brandkits', protect, getDemoBrandKits);
router.post('/brandkits', protect, createDemoBrandKit);
// Static routes must come BEFORE parameterized /:id routes
router.post('/brandkits/extract-colors', protect, extractDemoColors);
router.get('/brandkits/:id', protect, getDemoBrandKitById);
router.put('/brandkits/:id', protect, updateDemoBrandKit);
router.delete('/brandkits/:id', protect, deleteDemoBrandKit);
router.post('/brandkits/:id/logo', protect, uploadDemoLogo);
router.post('/brandkits/:id/set-active', protect, setActiveDemoKit);
router.get('/assets', protect, getDemoAssets);
router.get('/stats', protect, getDemoStats);
router.get('/members', protect, getDemoMembers);

module.exports = router;
