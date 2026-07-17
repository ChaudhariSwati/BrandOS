const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listAssets, createAsset, getAsset, updateAsset, deleteAsset } = require('../controllers/assetController');

router.use(protect);

router.get('/', listAssets);
router.post('/', createAsset);
router.get('/:id', getAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

module.exports = router;
