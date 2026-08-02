const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { generateCard, generateCardCopy, aiHealth } = require('../controllers/aiController');

// Health check for AI config (protected — only logged-in users need to know)
router.get('/health', protect, aiHealth);

// Generate a complete card design from a text prompt
router.post('/generate-card', protect, generateCard);

// Generate headline/subheadline/CTA copy
router.post('/generate-card-copy', protect, generateCardCopy);

module.exports = router;

