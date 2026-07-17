const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  listBrandKits, createBrandKit, getBrandKit,
  updateBrandKit, deleteBrandKit, uploadLogo,
  setActiveKit, extractColors,
} = require('../controllers/brandKitController');

router.use(protect);

router.get('/', listBrandKits);
router.post('/', createBrandKit);
router.post('/extract-colors', extractColors);
router.get('/:id', getBrandKit);
router.put('/:id', updateBrandKit);
router.delete('/:id', deleteBrandKit);
router.post('/:id/logo', uploadLogo);
router.post('/:id/set-active', setActiveKit);

module.exports = router;
