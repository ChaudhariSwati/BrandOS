const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { renderCard, renderPdf } = require('../controllers/exportController');

router.use(protect);

router.post('/render-card', renderCard);
router.post('/render-pdf', renderPdf);

module.exports = router;
