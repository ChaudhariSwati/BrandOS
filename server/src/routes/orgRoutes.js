const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const { getCurrentOrg, updateOrg, getMembers, addMember, getStats } = require('../controllers/orgController');

router.use(protect);

router.get('/current', getCurrentOrg);
router.put('/current', updateOrg);
router.get('/members', getMembers);
router.post('/members', requireRole('owner'), addMember);
router.get('/stats', getStats);

module.exports = router;
