const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { renderCard, renderPdf, downloadAsset, fetchExportedFile } = require('../controllers/exportController');

router.use(protect);

router.post('/render-card', renderCard);
router.post('/render-pdf', renderPdf);
router.get('/download/:assetId', downloadAsset);
router.get('/fetch', fetchExportedFile);

module.exports = router;
