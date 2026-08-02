const Asset = require('../models/Asset');
const User = require('../models/User');
const Organization = require('../models/Organization');
const PDFDocument = require('pdfkit');
const cloudinary = require('../config/cloudinary');
const demoStore = require('../utils/demoStore');
const { PassThrough } = require('stream');

// Helper — send a raw buffer as a downloadable response (used when Cloudinary
// uploads are unavailable / fail, so Export buttons never return a 500).
function sendBufferResponse(res, buffer, contentType, filename) {
  const safeName = String(filename || 'export').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'export';
  const encoded = encodeURIComponent(safeName);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`);
  res.setHeader('Content-Length', Buffer.isBuffer(buffer) ? buffer.length : Buffer.byteLength(buffer));
  res.end(buffer);
}

// ─── Demo Mode Helpers ──────────────────────────────────────────────────
// When a demo user hits the export endpoints, MongoDB may be unavailable or
// the demo assets are in-memory only. These helpers let demo users export
// the pre-seeded demo assets without touching the database.
const DEMO_KIT = {
  _id: '507f1f77bcf86cd799439013',
  name: 'Acme Brand Kit',
  colors: ['#FF4D4D', '#1A1A1A', '#FAFAFA', '#FFD166', '#06D6A0'],
  fonts: { heading: 'Poppins', body: 'Inter' },
  logoUrl: 'https://placehold.co/200x80/FF4D4D/FFFFFF?text=ACME',
};

const DEMO_ASSETS = [
  {
    _id: '507f1f77bcf86cd799439014',
    org: '507f1f77bcf86cd799439012',
    brandKit: DEMO_KIT,
    type: 'card',
    name: 'Welcome Card',
    data: {
      dimensions: { width: 1200, height: 675 },
      elements: [
        { type: 'rect', left: 0, top: 0, width: 1200, height: 675, fill: '#FF4D4D' },
        { type: 'text', left: 100, top: 200, fontSize: 64, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, text: 'Welcome to Acme Corp', width: 1000 },
      ],
    },
    exportUrl: '',
  },
  {
    _id: '507f1f77bcf86cd799439015',
    org: '507f1f77bcf86cd799439012',
    brandKit: DEMO_KIT,
    type: 'invoice',
    name: 'Invoice #001',
    data: {
      invoiceData: {
        gstin: '22AAAAA0000A1Z5',
        hsnCodes: '8471',
        isGstEnabled: true,
        lineItems: [
          { description: 'Website Design', quantity: 1, rate: 25000 },
          { description: 'Logo Design', quantity: 2, rate: 5000 },
        ],
      },
    },
    exportUrl: '',
  },
  {
    _id: '507f1f77bcf86cd799439016',
    org: '507f1f77bcf86cd799439012',
    brandKit: DEMO_KIT,
    type: 'letterhead',
    name: 'Company Letterhead',
    data: {
      header: 'Acme Corp\n123 Business Street, Mumbai - 400001\n+91 98765 43210',
      body: 'Dear Sir/Madam,\n\nThis is to certify that...\n\nThank you,\nDemo User',
      footer: 'info@acme.demo | www.acme.demo',
    },
    exportUrl: '',
  },
];

// Look up an asset — works for both real (MongoDB) and demo (in-memory) users
async function findAssetForUser(req, assetId) {
  if (req.user && req.user.isDemo) {
    return demoStore.findDemoAsset(assetId);
  }
  // Real (DB) path — but if MongoDB is disconnected (server started without a
  // database), fall back to the demo store so export buttons still work.
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return demoStore.findDemoAsset(assetId);
  }
  return Asset.findOne({ _id: assetId, org: req.orgId }).populate('brandKit');
}

// Demo assets are plain objects (no .save()) — persist only when it's a real Mongo doc
async function saveAssetIfPossible(asset) {
  if (asset && typeof asset.save === 'function') {
    return asset.save();
  }
  return null;
}

// Demo users bypass the free-tier limit (they get a fixed export quota anyway)
async function checkExportLimit(orgId, isDemo) {
  if (isDemo) return true;
  const org = await Organization.findById(orgId);
  if (org && org.tier === 'free') {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const exportCount = await Asset.countDocuments({
      org: orgId,
      updatedAt: { $gte: thisMonth },
      exportUrl: { $ne: '', $exists: true },
    });
    if (exportCount >= 10) {
      return false;
    }
  }
  return true;
}

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 */
function uploadToCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `brandos/${folder}`,
        public_id: publicId,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    const bufferStream = new PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
}

/**
 * Generate a PDF buffer using PDFKit (no Chromium needed).
 */
function generatePdfBuffer(asset, kit, canvasData, elements) {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        info: { Title: asset.name, Author: 'BrandOS' },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const bgColor = kit?.colors?.[0] || '#FFFFFF';
      const accentColor = kit?.colors?.[1] || '#1A1A1A';
      const headingFont = kit?.fonts?.heading || 'Helvetica-Bold';
      const bodyFont = kit?.fonts?.body || 'Helvetica';

      if (asset.type === 'invoice') {
        buildInvoicePdf(doc, kit, elements, canvasData, bgColor, accentColor, headingFont, bodyFont);
      } else if (asset.type === 'letterhead') {
        buildLetterheadPdf(doc, kit, elements, canvasData, bgColor, accentColor, headingFont, bodyFont);
      } else {
        buildCardPdf(doc, kit, elements, canvasData, bgColor, accentColor, headingFont, bodyFont);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// POST /api/export/render-card — renders a card to PNG, uploads to Cloudinary
const renderCard = async (req, res, next) => {
  try {
    const { assetId } = req.body;
    if (!assetId) {
      res.status(400);
      throw new Error('assetId is required');
    }

    const asset = await findAssetForUser(req, assetId);
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }

    const withinLimit = await checkExportLimit(req.orgId, !!(req.user && req.user.isDemo));
    if (!withinLimit) {
      res.status(403);
      throw new Error('Free tier limited to 10 exports per month. Upgrade to Pro for unlimited exports.');
    }

    const kit = asset.brandKit;
    const canvasData = asset.data || {};
    const dimensions = canvasData.dimensions || { width: 1200, height: 675 };
    const elements = canvasData.elements || [];

    const html = buildCardHtml(kit, elements, dimensions);

    let browser;
    try {
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.setViewport({ width: dimensions.width, height: dimensions.height, deviceScaleFactor: 2 });

      const screenshot = await page.screenshot({ type: 'png' });
      const buffer = Buffer.from(screenshot);

      const publicId = `card-${asset._id}-${Date.now()}`;
      const exportUrl = await uploadToCloudinary(buffer, 'exports/cards', publicId);

      asset.exportUrl = exportUrl;
      await saveAssetIfPossible(asset);

      res.json({ exportUrl, assetId: asset._id });
    } catch (puppeteerErr) {
      console.warn('Puppeteer render failed:', puppeteerErr.message);
      const placeholder = `https://placehold.co/${dimensions.width}x${dimensions.height}?text=Card:+${encodeURIComponent(asset.name)}&font=poppins`;
      asset.exportUrl = placeholder;
      await saveAssetIfPossible(asset);
      res.json({
        exportUrl: placeholder,
        assetId: asset._id,
        note: 'Server-side rendering unavailable. Install Chromium for full card export.',
      });
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/export/render-pdf — renders any asset to PDF, uploads to Cloudinary
const renderPdf = async (req, res, next) => {
  try {
    const { assetId } = req.body;
    if (!assetId) {
      res.status(400);
      throw new Error('assetId is required');
    }

    const asset = await findAssetForUser(req, assetId);
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }

    const withinLimit = await checkExportLimit(req.orgId, !!(req.user && req.user.isDemo));
    if (!withinLimit) {
      res.status(403);
      throw new Error('Free tier limited to 10 exports per month. Upgrade to Pro for unlimited exports.');
    }

    const kit = asset.brandKit;
    const canvasData = asset.data || {};
    const elements = canvasData.elements || [];

    let browser;
    try {
      const puppeteer = require('puppeteer');
      let html;
      if (asset.type === 'invoice') {
        html = buildInvoiceHtml(kit, elements, canvasData);
      } else {
        html = buildLetterheadHtml(kit, elements, canvasData);
      }

      if (!html || !html.trim()) {
        throw new Error('Failed to build HTML');
      }

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        timeout: 60000,
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' },
      });

      const publicId = `${asset.type}-${asset._id}-${Date.now()}`;
      const exportUrl = await uploadToCloudinary(Buffer.from(pdfBuffer), 'exports/pdfs', publicId);

      asset.exportUrl = exportUrl;
      await saveAssetIfPossible(asset);

      res.json({ exportUrl, assetId: asset._id });
    } catch (puppeteerErr) {
      console.warn('Puppeteer PDF render failed, using PDFKit fallback:', puppeteerErr.message);
      try {
        const pdfBuffer = await generatePdfBuffer(asset, kit, canvasData, elements);

        // Try Cloudinary upload; if unavailable/misconfigured, stream the PDF
        // directly back to the client so the Export buttons always work.
        let exportUrl = null;
        if (cloudinary.isConfigured && cloudinary.isConfigured()) {
          try {
            const publicId = `${asset.type}-${asset._id}-${Date.now()}-pdfkit`;
            exportUrl = await uploadToCloudinary(pdfBuffer, 'exports/pdfs', publicId);
          } catch (uploadErr) {
            console.warn('Cloudinary upload failed, streaming PDF directly:', uploadErr.message);
          }
        }

        if (exportUrl) {
          asset.exportUrl = exportUrl;
          await saveAssetIfPossible(asset);
          res.json({
            exportUrl,
            assetId: asset._id,
            note: 'Generated with PDFKit fallback (plain text, no rich styling)',
          });
        } else {
          // Cloudinary unavailable — return a download URL for the client to
          // hit. The /export/download/:assetId endpoint streams the buffer.
          res.json({
            downloadUrl: `/api/export/download/${asset._id}`,
            assetId: asset._id,
            note: 'Cloudinary is not configured — the PDF will be streamed directly as a download.',
          });
        }
      } catch (pdfkitErr) {
        console.error('PDFKit fallback also failed:', pdfkitErr.message);
        res.status(500);
        throw new Error('PDF export failed. Please try downloading instead.');
      }
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    next(err);
  }
};

// PDFKit only bundles standard AFM fonts. Custom Google fonts like
// 'Poppins' / 'Inter' are NOT available, and calling doc.font('Poppins')
// throws a synchronous error. Map unknown font names to safe built-ins.
const PDFKIT_SAFE_FONTS = [
  'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
  'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
  'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
  'Symbol', 'ZapfDingbats',
];

function safePdfFont(fontName, fallback) {
  if (!fontName) return fallback || 'Helvetica';
  if (PDFKIT_SAFE_FONTS.indexOf(fontName) !== -1) return fontName;


  // Map any custom brand font (Poppins, Inter, Montserrat…) to Helvetica
  if (fontName.toLowerCase().indexOf('bold') !== -1) return 'Helvetica-Bold';
  return 'Helvetica';
}

// GET /api/export/download/:assetId — streams PDF for download, uses Cloudinary if available
const downloadAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    if (!assetId) {
      res.status(400);
      throw new Error('assetId is required');
    }

    const asset = await findAssetForUser(req, assetId);
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }

    const kit = asset.brandKit;
    const canvasData = asset.data || {};
    const elements = canvasData.elements || [];

    // If there's already a Cloudinary export URL, proxy it through our server
    // (avoids CORS issues and keeps the Authorization header flow consistent)
    if (asset.exportUrl && asset.exportUrl.startsWith('https://res.cloudinary.com/')) {
      try {
        const https = require('https');
        const safeName = asset.name.replace(/[^a-zA-Z0-9 _-]/g, '');
        const filename = encodeURIComponent(safeName) + '.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"; filename*=UTF-8''${filename}`);

        const proxyReq = https.get(asset.exportUrl, (proxyRes) => {
          if (proxyRes.statusCode === 200) {
            proxyRes.pipe(res);
          } else {
            res.status(502);
            res.json({ message: 'Failed to fetch exported file from Cloudinary' });
          }
        });
        proxyReq.on('error', (err) => {
          console.warn('Cloudinary proxy failed:', err.message);
          res.status(502);
          res.json({ message: 'Failed to fetch exported file from Cloudinary' });
        });
        return;
      } catch (proxyErr) {
        console.warn('Cloudinary proxy error:', proxyErr.message);
        // Fall through to PDFKit generation
      }
    }

    // Generate the full PDF buffer FIRST (catches font/PDFKit errors safely),
    // THEN send the response. This avoids "headers already sent" crashes.
    const pdfBuffer = await generatePdfBuffer(asset, kit, canvasData, elements);

    const safeName = asset.name.replace(/[^a-zA-Z0-9 _-]/g, '');
    const filename = encodeURIComponent(safeName) + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

    // Also upload to Cloudinary asynchronously for future use
    uploadToCloudinary(pdfBuffer, 'exports/pdfs', `${asset.type}-${asset._id}-${Date.now()}`)
      .then((exportUrl) => {
        asset.exportUrl = exportUrl;
        return saveAssetIfPossible(asset).catch(() => {});
      })
      .catch((err) => console.warn('Cloudinary background upload failed:', err.message));
  } catch (err) {
    next(err);
  }
};

// ─── HTML Builders ──────────────────────────────────────────────────────

function buildCardHtml(kit, elements, dimensions) {
  const bgColor = kit.colors?.[0] || '#FFFFFF';
  const headingFont = kit.fonts?.heading || 'Poppins';
  const bodyFont = kit.fonts?.body || 'Inter';

  let bodyContent = '';
  for (const el of elements || []) {
    switch (el.type) {
      case 'text':
        bodyContent += `<div style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;font-family:${el.fontFamily || headingFont};font-size:${el.fontSize || 32}px;color:${el.fill || '#000000'};font-weight:${el.fontWeight || 700};text-align:${el.textAlign || 'center'};width:${el.width || 'auto'};transform:rotate(${el.angle || 0}deg);">${el.text || ''}</div>`;
        break;
      case 'image':
        if (el.src) {
          bodyContent += `<img src="${el.src}" style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;width:${el.width || 100}px;height:${el.height || 100}px;transform:rotate(${el.angle || 0}deg);" />`;
        }
        break;
      case 'rect':
        bodyContent += `<div style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;width:${el.width || 100}px;height:${el.height || 100}px;background:${el.fill || bgColor};border-radius:${el.rx || 0}px;transform:rotate(${el.angle || 0}deg);"></div>`;
        break;
    }
  }

  return `<!DOCTYPE html><html><head><link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(' ', '+')}:wght@400;700&family=${bodyFont.replace(' ', '+')}:wght@400;600&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}</style></head><body style="width:${dimensions.width}px;height:${dimensions.height}px;background:${bgColor};position:relative;overflow:hidden;font-family:${bodyFont},sans-serif;">${bodyContent}</body></html>`;
}

function buildLetterheadHtml(kit, elements, data) {
  const bgColor = kit.colors?.[0] || '#FFFFFF';
  const accentColor = kit.colors?.[1] || '#333333';
  const headingFont = kit.fonts?.heading || 'Poppins';
  const bodyFont = kit.fonts?.body || 'Inter';

  let bodyContent = '';

  if (!elements || elements.length === 0) {
    const header = (data && data.header) || '';
    const body = (data && data.body) || '';
    const footer = (data && data.footer) || '';

    if (header) {
      bodyContent += `<div style="font-family:${headingFont};font-size:18px;font-weight:700;margin-bottom:24px;border-bottom:2px solid ${accentColor};padding-bottom:12px;white-space:pre-line;">${header}</div>`;
    }
    if (body) {
      bodyContent += `<div style="font-family:${bodyFont};font-size:14px;line-height:1.8;white-space:pre-line;min-height:400px;">${body}</div>`;
    }
    if (footer) {
      bodyContent += `<div style="font-family:${bodyFont};font-size:12px;color:#888;margin-top:48px;border-top:2px solid ${accentColor};padding-top:12px;white-space:pre-line;">${footer}</div>`;
    }
  } else {
    for (const el of elements || []) {
      switch (el.type) {
        case 'text':
          bodyContent += `<div style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;font-family:${el.fontFamily || headingFont};font-size:${el.fontSize || 16}px;color:${el.fill || '#000000'};font-weight:${el.fontWeight || 400};line-height:1.5;width:${el.width || 'auto'};">${el.text || ''}</div>`;
          break;
        case 'image':
          if (el.src) {
            bodyContent += `<img src="${el.src}" style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;width:${el.width || 150}px;height:${el.height || 60}px;" />`;
          }
          break;
        case 'line':
          bodyContent += `<div style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;width:${el.width || 700}px;height:2px;background:${accentColor};"></div>`;
          break;
      }
    }
  }

  return `<!DOCTYPE html><html><head><link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(' ', '+')}:wght@400;700&family=${bodyFont.replace(' ', '+')}:wght@400;600&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}</style></head><body style="width:1240px;min-height:1754px;background:${bgColor};font-family:${bodyFont},sans-serif;padding:60px;">${bodyContent}</body></html>`;
}

function buildInvoiceHtml(kit, elements, data) {
  const bgColor = kit.colors?.[0] || '#FFFFFF';
  const accentColor = kit.colors?.[1] || '#333333';
  const headingFont = kit.fonts?.heading || 'Poppins';
  const bodyFont = kit.fonts?.body || 'Inter';

  const invoiceData = data.invoiceData || {};
  const lineItems = invoiceData.lineItems || [];
  const gstin = invoiceData.gstin || '';
  const hsnCodes = invoiceData.hsnCodes || '';
  const isGstEnabled = invoiceData.isGstEnabled || false;

  let subtotal = 0;
  let itemsHtml = '';
  lineItems.forEach((item, i) => {
    const amount = (item.quantity || 0) * (item.rate || 0);
    subtotal += amount;
    itemsHtml += `<tr>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd">${item.description || ''}</td>
      ${hsnCodes ? `<td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${hsnCodes}</td>` : ''}
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${item.quantity || 0}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">₹ ${(item.rate || 0).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">₹ ${amount.toFixed(2)}</td>
    </tr>`;
  });

  let cgst = 0;
  let sgst = 0;
  let grandTotal = subtotal;
  if (isGstEnabled) {
    cgst = subtotal * 0.09;
    sgst = subtotal * 0.09;
    grandTotal = subtotal + cgst + sgst;
  }

  let bodyContent = '';
  for (const el of elements || []) {
    if (el.type === 'text') {
      bodyContent += `<div style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;font-family:${el.fontFamily || headingFont};font-size:${el.fontSize || 16}px;color:${el.fill || '#000000'};font-weight:${el.fontWeight || 400};">${el.text || ''}</div>`;
    } else if (el.type === 'image' && el.src) {
      bodyContent += `<img src="${el.src}" style="position:absolute;left:${el.left || 0}px;top:${el.top || 0}px;width:${el.width || 150}px;height:${el.height || 60}px;" />`;
    }
  }

  return `<!DOCTYPE html>
<html><head>
  <link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(' ', '+')}:wght@400;700&family=${bodyFont.replace(' ', '+')}:wght@400;600&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box;}</style>
</head><body style="
  width: 1240px;
  min-height: 1754px;
  background: ${bgColor};
  font-family: ${bodyFont}, sans-serif;
  padding: 40px 60px;
  position: relative;
">
  ${bodyContent}
  <div style="margin-top:40px;">
    ${isGstEnabled && gstin ? `<p style="font-size:12px;color:#666;margin-bottom:4px;">GSTIN: ${gstin}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <thead>
        <tr style="background:${accentColor};color:#fff;">
          <th style="padding:10px;text-align:center">#</th>
          <th style="padding:10px;text-align:left">Description</th>
          ${hsnCodes ? '<th style="padding:10px;text-align:center">HSN</th>' : ''}
          <th style="padding:10px;text-align:center">Qty</th>
          <th style="padding:10px;text-align:right">Rate</th>
          <th style="padding:10px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#999">No items added</td></tr>'}
      </tbody>
    </table>
    <div style="margin-top:20px;text-align:right;font-size:16px;">
      <p>Subtotal: ₹ ${subtotal.toFixed(2)}</p>
      ${isGstEnabled ? `
        <p>CGST (9%): ₹ ${cgst.toFixed(2)}</p>
        <p>SGST (9%): ₹ ${sgst.toFixed(2)}</p>
      ` : ''}
      <p style="font-size:20px;font-weight:700;margin-top:8px;color:${accentColor};">Total: ₹ ${grandTotal.toFixed(2)}</p>
    </div>
  </div>
</body></html>`;
}

// ─── PDF Builder Functions (PDFKit) ──────────────────────────────────────

/**
 * Build an invoice PDF using PDFKit.
 * Uses safePdfFont() so custom brand fonts (Poppins/Inter) don't crash PDFKit.
 */
function buildInvoicePdf(doc, kit, elements, data, bgColor, accentColor, headingFont, bodyFont) {
  const invoiceData = data.invoiceData || {};
  const lineItems = invoiceData.lineItems || [];
  const gstin = invoiceData.gstin || '';
  const isGstEnabled = invoiceData.isGstEnabled !== false;
  const hFont = safePdfFont(headingFont, 'Helvetica-Bold');
  const bFont = safePdfFont(bodyFont, 'Helvetica');

  doc.fontSize(24).font(hFont).fillColor('#000').text('INVOICE', { align: 'center' });
  doc.moveDown(0.5);

  if (gstin && isGstEnabled) {
    doc.fontSize(10).font(bFont).fillColor('#666').text(`GSTIN: ${gstin}`, { align: 'center' });
    doc.moveDown(0.3);
  }

  doc.moveDown(1);
  doc.fontSize(10).font(hFont).fillColor('#fff');
  doc.rect(doc.x, doc.y, 500, 20).fill(accentColor);

  const colX = [40, 110, 280, 340, 410];
  const headers = ['#', 'Description', 'Qty', 'Rate', 'Amount'];
  doc.fillColor('#fff');
  headers.forEach((h, i) => {
    doc.text(h, colX[i], doc.y - 15, { width: 80, align: i >= 2 ? 'right' : 'left' });
  });
  doc.moveDown(1);

  let subtotal = 0;
  doc.fontSize(10).font(bFont).fillColor('#000');
  lineItems.forEach((item, i) => {
    const amount = (item.quantity || 0) * (item.rate || 0);
    subtotal += amount;
    const y = doc.y;
    doc.text(String(i + 1), colX[0], y);
    doc.text(item.description || '', colX[1], y, { width: 160 });
    doc.text(String(item.quantity || 0), colX[2], y, { width: 60, align: 'right' });
    doc.text(`₹${(item.rate || 0).toFixed(2)}`, colX[3], y, { width: 70, align: 'right' });
    doc.text(`₹${amount.toFixed(2)}`, colX[4], y, { width: 70, align: 'right' });
    doc.moveDown(1.2);
  });

  doc.moveDown(1);
  const cgst = isGstEnabled ? subtotal * 0.09 : 0;
  const sgst = isGstEnabled ? subtotal * 0.09 : 0;
  const grandTotal = subtotal + cgst + sgst;

  doc.fontSize(11).font(bFont);
  doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, { align: 'right' });
  if (isGstEnabled) {
    doc.text(`CGST (9%): ₹${cgst.toFixed(2)}`, { align: 'right' });
    doc.text(`SGST (9%): ₹${sgst.toFixed(2)}`, { align: 'right' });
  }
  doc.fontSize(16).font(hFont).fillColor(accentColor);
  doc.text(`Total: ₹${grandTotal.toFixed(2)}`, { align: 'right' });
}

/**
 * Build a letterhead PDF using PDFKit.
 */
function buildLetterheadPdf(doc, kit, elements, data, bgColor, accentColor, headingFont, bodyFont) {
  const header = (data && data.header) || '';
  const body = (data && data.body) || '';
  const footer = (data && data.footer) || '';
  const hFont = safePdfFont(headingFont, 'Helvetica-Bold');
  const bFont = safePdfFont(bodyFont, 'Helvetica');

  if (header) {
    doc.fontSize(16).font(hFont).fillColor('#000');
    doc.text(header, { align: 'left' });
    doc.moveDown(0.5);
    doc.moveTo(doc.x, doc.y).lineTo(doc.x + 500, doc.y).strokeColor(accentColor).stroke();
    doc.moveDown(1);
  }

  if (body) {
    doc.fontSize(12).font(bFont).fillColor('#000');
    doc.text(body, { align: 'left', lineGap: 6 });
  }

  if (footer) {
    doc.moveDown(3);
    doc.moveTo(doc.x, doc.y).lineTo(doc.x + 500, doc.y).strokeColor(accentColor).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font(bFont).fillColor('#888');
    doc.text(footer, { align: 'center' });
  }
}

/**
 * Build a simplified card PDF using PDFKit.
 */
function buildCardPdf(doc, kit, elements, data, bgColor, accentColor, headingFont, bodyFont) {
  const hFont = safePdfFont(headingFont, 'Helvetica-Bold');
  const bFont = safePdfFont(bodyFont, 'Helvetica');

  doc.fontSize(24).font(hFont).fillColor(accentColor);
  doc.text('BrandOS Card Export', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(12).font(bFont).fillColor('#000');
  if (elements && elements.length > 0) {
    elements.forEach((el) => {
      if (el.type === 'text') {
        const elFont = safePdfFont(el.fontFamily || headingFont, 'Helvetica');
        doc.fontSize(el.fontSize || 16).font(elFont).fillColor(el.fill || '#000');
        doc.text(el.text || '', { align: 'center' });
        doc.moveDown(0.5);
      }
    });
  } else {
    doc.text('Card content not available for direct PDF export.', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#888');
    doc.text('Use the "Export" button for a full rendered version.', { align: 'center' });
  }
}

/**
 * GET /api/export/fetch?url=... — proxies an exported file (e.g. Cloudinary URL)
 * through our server so the client can download it as a blob without CORS issues.
 * Only allows Cloudinary URLs to prevent SSRF.
 */
const fetchExportedFile = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'url query param is required' });
    }

    // Only allow Cloudinary URLs to prevent SSRF
    if (!url.startsWith('https://res.cloudinary.com/')) {
      return res.status(400).json({ message: 'Only Cloudinary URLs are allowed' });
    }

    const https = require('https');
    const proxyReq = https.get(url, (proxyRes) => {
      if (proxyRes.statusCode === 200) {
        // Forward content-type and content-disposition if present
        if (proxyRes.headers['content-type']) {
          res.setHeader('Content-Type', proxyRes.headers['content-type']);
        }
        proxyRes.pipe(res);
      } else {
        res.status(proxyRes.statusCode || 502);
        res.json({ message: 'Failed to fetch file from Cloudinary' });
      }
    });

    proxyReq.on('error', (err) => {
      console.warn('Cloudinary fetch proxy failed:', err.message);
      if (!res.headersSent) {
        res.status(502);
        res.json({ message: 'Failed to fetch file from Cloudinary' });
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { renderCard, renderPdf, downloadAsset, fetchExportedFile };

