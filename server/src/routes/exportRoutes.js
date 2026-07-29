const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { renderCard, renderPdf, downloadAsset } = require('../controllers/exportController');

router.use(protect);

router.post('/render-card', renderCard);
router.post('/render-pdf', renderPdf);
router.get('/download/:assetId', downloadAsset);

module.exports = router;
