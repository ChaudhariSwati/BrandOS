const Asset = require('../models/Asset');
const BrandKit = require('../models/BrandKit');

// GET /api/assets
const listAssets = async (req, res, next) => {
  try {
    const filter = { org: req.orgId };
    if (req.query.type) filter.type = req.query.type;
    const assets = await Asset.find(filter)
      .populate('brandKit', 'name colors fonts')
      .populate('createdBy', 'name')
      .sort('-updatedAt');
    res.json(assets);
  } catch (err) {
    next(err);
  }
};

// POST /api/assets
const createAsset = async (req, res, next) => {
  try {
    const { brandKit, type, name, data } = req.body;
    if (!brandKit || !type) {
      res.status(400);
      throw new Error('brandKit and type are required');
    }
    const validTypes = ['card', 'letterhead', 'invoice'];
    if (!validTypes.includes(type)) {
      res.status(400);
      throw new Error(`type must be one of: ${validTypes.join(', ')}`);
    }
    // Verify brand kit belongs to org
    const kit = await BrandKit.findOne({ _id: brandKit, org: req.orgId });
    if (!kit) {
      res.status(404);
      throw new Error('Brand kit not found in your organization');
    }
    const asset = await Asset.create({
      org: req.orgId,
      brandKit: kit._id,
      type,
      name: name || undefined,
      data: data || {},
      createdBy: req.user._id,
    });
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
};

// GET /api/assets/:id
const getAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, org: req.orgId })
      .populate('brandKit', 'name colors fonts logoUrl')
      .populate('createdBy', 'name email');
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }
    res.json(asset);
  } catch (err) {
    next(err);
  }
};

// PUT /api/assets/:id
const updateAsset = async (req, res, next) => {
  try {
    const { name, data } = req.body;
    const asset = await Asset.findOne({ _id: req.params.id, org: req.orgId });
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }
    if (name !== undefined) asset.name = name;
    if (data !== undefined) asset.data = data;
    await asset.save();
    res.json(asset);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/assets/:id
const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findOneAndDelete({ _id: req.params.id, org: req.orgId });
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAssets, createAsset, getAsset, updateAsset, deleteAsset };
