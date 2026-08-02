const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  demoLogin,
  getDemoOrg,
  updateDemoOrg,
  getDemoBrandKits,
  createDemoBrandKit,
  getDemoBrandKitById,
  updateDemoBrandKit,
  deleteDemoBrandKit,
  uploadDemoLogo,
  setActiveDemoKit,
  extractDemoColors,
  getDemoAssets,
  getDemoAssetById,
  createDemoAsset,
  updateDemoAsset,
  deleteDemoAsset,
  getDemoStats,
  getDemoMembers,
  addDemoMember,
} = require('../controllers/demoController');

// Demo auth — no rate limit, always works
router.post('/login', demoLogin);

// Demo data endpoints — require a valid demo token
router.get('/org', protect, getDemoOrg);
router.put('/org', protect, updateDemoOrg);

// Brand kits
router.get('/brandkits', protect, getDemoBrandKits);
router.post('/brandkits', protect, createDemoBrandKit);
// Static route must come BEFORE parameterized /:id routes
router.post('/brandkits/extract-colors', protect, extractDemoColors);
router.get('/brandkits/:id', protect, getDemoBrandKitById);
router.put('/brandkits/:id', protect, updateDemoBrandKit);
router.delete('/brandkits/:id', protect, deleteDemoBrandKit);
router.post('/brandkits/:id/logo', protect, uploadDemoLogo);
router.post('/brandkits/:id/set-active', protect, setActiveDemoKit);

// Assets
router.get('/assets', protect, getDemoAssets);
router.post('/assets', protect, createDemoAsset);
router.get('/assets/:id', protect, getDemoAssetById);
router.put('/assets/:id', protect, updateDemoAsset);
router.delete('/assets/:id', protect, deleteDemoAsset);

// Stats & members
router.get('/stats', protect, getDemoStats);
router.get('/members', protect, getDemoMembers);
router.post('/members', protect, addDemoMember);

module.exports = router;

