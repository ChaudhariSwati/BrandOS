const BrandKit = require('../models/BrandKit');
const Organization = require('../models/Organization');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadsDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only jpg, png, svg, webp files are allowed'));
  },
}).single('logo');

// GET /api/brandkits
const listBrandKits = async (req, res, next) => {
  try {
    const kits = await BrandKit.find({ org: req.orgId }).sort('-createdAt');
    res.json(kits);
  } catch (err) {
    next(err);
  }
};

// POST /api/brandkits
const createBrandKit = async (req, res, next) => {
  try {
    const { name, colors, fonts, logoUrl } = req.body;
    const kit = await BrandKit.create({
      org: req.orgId,
      name: name || 'Untitled Brand Kit',
      colors: colors || [],
      fonts: fonts || { heading: 'Poppins', body: 'Inter' },
      logoUrl: logoUrl || '',
      createdBy: req.user._id,
    });

    // Auto-set as active if org has none
    const org = await Organization.findById(req.orgId);
    if (!org.activeBrandKit) {
      org.activeBrandKit = kit._id;
      await org.save();
    }

    res.status(201).json(kit);
  } catch (err) {
    next(err);
  }
};

// GET /api/brandkits/:id
const getBrandKit = async (req, res, next) => {
  try {
    const kit = await BrandKit.findOne({ _id: req.params.id, org: req.orgId });
    if (!kit) {
      res.status(404);
      throw new Error('Brand kit not found');
    }
    res.json(kit);
  } catch (err) {
    next(err);
  }
};

// PUT /api/brandkits/:id
const updateBrandKit = async (req, res, next) => {
  try {
    const { name, colors, fonts, logoUrl } = req.body;
    const kit = await BrandKit.findOne({ _id: req.params.id, org: req.orgId });
    if (!kit) {
      res.status(404);
      throw new Error('Brand kit not found');
    }
    if (name !== undefined) kit.name = name;
    if (colors !== undefined) kit.colors = colors;
    if (fonts !== undefined) kit.fonts = fonts;
    if (logoUrl !== undefined) kit.logoUrl = logoUrl;
    kit.version += 1;
    await kit.save();
    res.json(kit);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/brandkits/:id
const deleteBrandKit = async (req, res, next) => {
  try {
    const kit = await BrandKit.findOneAndDelete({ _id: req.params.id, org: req.orgId });
    if (!kit) {
      res.status(404);
      throw new Error('Brand kit not found');
    }

    // If this was the active kit, clear it
    const org = await Organization.findById(req.orgId);
    if (org.activeBrandKit && org.activeBrandKit.toString() === req.params.id) {
      org.activeBrandKit = null;
      await org.save();
    }

    res.json({ message: 'Brand kit deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/brandkits/:id/logo — upload logo for a kit
const uploadLogo = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      res.status(400);
      return next(new Error('Logo upload failed: ' + err.message));
    }
    if (!req.file) {
      res.status(400);
      return next(new Error('No file uploaded'));
    }
    try {
      const kit = await BrandKit.findOne({ _id: req.params.id, org: req.orgId });
      if (!kit) {
        res.status(404);
        throw new Error('Brand kit not found');
      }
      kit.logoUrl = req.file.path;
      kit.version += 1;
      await kit.save();
      res.json({ logoUrl: kit.logoUrl });
    } catch (err2) {
      next(err2);
    }
  });
};

// POST /api/brandkits/:id/set-active
const setActiveKit = async (req, res, next) => {
  try {
    const kit = await BrandKit.findOne({ _id: req.params.id, org: req.orgId });
    if (!kit) {
      res.status(404);
      throw new Error('Brand kit not found');
    }
    const org = await Organization.findById(req.orgId);
    org.activeBrandKit = kit._id;
    await org.save();
    res.json({ activeBrandKit: kit._id });
  } catch (err) {
    next(err);
  }
};

// POST /api/brandkits/extract-colors — AI color extraction via Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');

const extractColors = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      res.status(400);
      throw new Error('imageUrl is required');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) throw new Error('Failed to fetch image');
    const imageBuffer = await imageResp.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const prompt = `Extract the 5 most dominant colors from this brand logo/image. 
Return ONLY a JSON array of hex color codes. Example: ["#1A2B3C","#E74C3C","#2ECC71","#3498DB","#F39C12"]`;

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/png', data: base64Image } },
      prompt,
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    let colors;
    if (jsonMatch) {
      colors = JSON.parse(jsonMatch[0]);
    } else {
      colors = ['#1A2B3C', '#E74C3C', '#2ECC71', '#3498DB', '#F39C12'];
    }

    res.json({ colors });
  } catch (err) {
    next(err);
  }
};

module.exports = { listBrandKits, createBrandKit, getBrandKit, updateBrandKit, deleteBrandKit, uploadLogo, setActiveKit, extractColors };
