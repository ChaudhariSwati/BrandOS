const Asset = require('../models/Asset');
const BrandKit = require('../models/BrandKit');
const Organization = require('../models/Organization');

// POST /api/export/render-card — renders a card asset to PNG via Puppeteer
const renderCard = async (req, res, next) => {
  try {
    const { assetId } = req.body;
    if (!assetId) {
      res.status(400);
      throw new Error('assetId is required');
    }

    const asset = await Asset.findOne({ _id: assetId, org: req.orgId }).populate('brandKit');
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }

    const kit = asset.brandKit;
    const canvasData = asset.data || {};
    const dimensions = canvasData.dimensions || { width: 1200, height: 675 };
    const elements = canvasData.elements || [];

    // Check monthly export limit for free tier
    const org = await Organization.findById(req.orgId);
    if (org.tier === 'free') {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const exportCount = await Asset.countDocuments({
        org: req.orgId,
        updatedAt: { $gte: thisMonth },
        exportUrl: { $ne: '' },
      });
      if (exportCount >= 10) {
        res.status(403);
        throw new Error('Free tier limited to 10 exports per month. Upgrade to Pro for unlimited exports.');
      }
    }

    // Build HTML from canvas data + brand kit
    const html = buildCardHtml(kit, elements, dimensions);

    // Render with Puppeteer
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
      const base64 = screenshot.toString('base64');

      // Save exportUrl as data URI for now (in production, upload to Cloudinary)
      const dataUri = `data:image/png;base64,${base64}`;
      asset.exportUrl = dataUri;
      await asset.save();

      res.json({ exportUrl: dataUri, assetId: asset._id });
    } catch (puppeteerErr) {
      // Fallback: return a placeholder image URL
      console.warn('Puppeteer render failed, returning placeholder:', puppeteerErr.message);
      res.json({
        exportUrl: `https://placehold.co/${dimensions.width}x${dimensions.height}?text=Render+Unavailable`,
        assetId: asset._id,
        note: 'Server-side rendering unavailable. Install Chromium or use headless mode in production.',
      });
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/export/render-pdf — renders any asset to PDF (letterhead, invoice)
const renderPdf = async (req, res, next) => {
  try {
    const { assetId } = req.body;
    if (!assetId) {
      res.status(400);
      throw new Error('assetId is required');
    }

    const asset = await Asset.findOne({ _id: assetId, org: req.orgId }).populate('brandKit');
    if (!asset) {
      res.status(404);
      throw new Error('Asset not found');
    }

    const kit = asset.brandKit;
    const canvasData = asset.data || {};
    const elements = canvasData.elements || [];

    // Build HTML (letterhead or invoice)
    let html;
    if (asset.type === 'invoice') {
      html = buildInvoiceHtml(kit, elements, canvasData);
    } else {
      html = buildLetterheadHtml(kit, elements);
    }

    if (typeof html !== 'string' || !html.trim()) {
      res.status(500);
      throw new Error('Failed to build invoice HTML for PDF export');
    }

    let browser;
    try {
      const puppeteer = require('puppeteer');

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
        ],
        // Helps in some restricted/containerized environments
        timeout: 60_000,
      });

      const page = await browser.newPage();
      // Increase robustness if fonts/images load slowly
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
      await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' },
      });

      const base64 = pdfBuffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${base64}`;
      asset.exportUrl = dataUri;
      await asset.save();

      res.json({ exportUrl: dataUri, assetId: asset._id });
    } catch (puppeteerErr) {
      console.warn('Puppeteer PDF render failed:', puppeteerErr?.message);
      res.json({
        exportUrl: '',
        assetId: asset._id,
        note: 'PDF rendering failed on the server.',
        error: puppeteerErr?.message || String(puppeteerErr),
      });
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    next(err);
  }
};

// --- HTML Builders ---

function buildCardHtml(kit, elements, dimensions) {
  const bgColor = kit.colors?.[0] || '#FFFFFF';
  const headingFont = kit.fonts?.heading || 'Poppins';
  const bodyFont = kit.fonts?.body || 'Inter';

  let bodyContent = '';
  for (const el of elements || []) {
    switch (el.type) {
      case 'text':
        bodyContent += `<div style="
          position: absolute;
          left: ${el.left || 0}px;
          top: ${el.top || 0}px;
          font-family: ${el.fontFamily || headingFont};
          font-size: ${el.fontSize || 32}px;
          color: ${el.fill || '#000000'};
          font-weight: ${el.fontWeight || 700};
          text-align: ${el.textAlign || 'center'};
          width: ${el.width || 'auto'};
          transform: rotate(${el.angle || 0}deg);
        ">${el.text || ''}</div>`;
        break;
      case 'image':
        if (el.src) {
          bodyContent += `<img src="${el.src}" style="
            position: absolute;
            left: ${el.left || 0}px;
            top: ${el.top || 0}px;
            width: ${el.width || 100}px;
            height: ${el.height || 100}px;
            transform: rotate(${el.angle || 0}deg);
          " />`;
        }
        break;
      case 'rect':
        bodyContent += `<div style="
          position: absolute;
          left: ${el.left || 0}px;
          top: ${el.top || 0}px;
          width: ${el.width || 100}px;
          height: ${el.height || 100}px;
          background: ${el.fill || bgColor};
          border-radius: ${el.rx || 0}px;
          transform: rotate(${el.angle || 0}deg);
        "></div>`;
        break;
    }
  }

  return `<!DOCTYPE html>
<html><head>
  <link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(' ', '+')}:wght@400;700&family=${bodyFont.replace(' ', '+')}:wght@400;600&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box;}</style>
</head><body style="
  width: ${dimensions.width}px;
  height: ${dimensions.height}px;
  background: ${bgColor};
  position: relative;
  overflow: hidden;
  font-family: ${bodyFont}, sans-serif;
">${bodyContent}</body></html>`;
}

function buildLetterheadHtml(kit, elements) {
  const bgColor = kit.colors?.[0] || '#FFFFFF';
  const accentColor = kit.colors?.[1] || '#333333';
  const headingFont = kit.fonts?.heading || 'Poppins';
  const bodyFont = kit.fonts?.body || 'Inter';

  let bodyContent = '';
  for (const el of elements || []) {
    switch (el.type) {
      case 'text':
        bodyContent += `<div style="
          position: absolute;
          left: ${el.left || 0}px;
          top: ${el.top || 0}px;
          font-family: ${el.fontFamily || headingFont};
          font-size: ${el.fontSize || 16}px;
          color: ${el.fill || '#000000'};
          font-weight: ${el.fontWeight || 400};
          line-height: 1.5;
          width: ${el.width || 'auto'};
        ">${el.text || ''}</div>`;
        break;
      case 'image':
        if (el.src) {
          bodyContent += `<img src="${el.src}" style="
            position: absolute;
            left: ${el.left || 0}px;
            top: ${el.top || 0}px;
            width: ${el.width || 150}px;
            height: ${el.height || 60}px;
          " />`;
        }
        break;
      case 'line':
        bodyContent += `<div style="
          position: absolute;
          left: ${el.left || 0}px;
          top: ${el.top || 0}px;
          width: ${el.width || 700}px;
          height: 2px;
          background: ${accentColor};
        "></div>`;
        break;
    }
  }

  return `<!DOCTYPE html>
<html><head>
  <link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(' ', '+')}:wght@400;700&family=${bodyFont.replace(' ', '+')}:wght@400;600&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box;}</style>
</head><body style="
  width: 1240px;
  height: 1754px;
  background: ${bgColor};
  position: relative;
  overflow: hidden;
  font-family: ${bodyFont}, sans-serif;
  padding: 60px;
">${bodyContent}</body></html>`;
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

  // Calculate invoice totals with GST
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
      bodyContent += `<div style="
        position: absolute;
        left: ${el.left || 0}px;
        top: ${el.top || 0}px;
        font-family: ${el.fontFamily || headingFont};
        font-size: ${el.fontSize || 16}px;
        color: ${el.fill || '#000000'};
        font-weight: ${el.fontWeight || 400};
      ">${el.text || ''}</div>`;
    } else if (el.type === 'image' && el.src) {
      bodyContent += `<img src="${el.src}" style="
        position: absolute;
        left: ${el.left || 0}px;
        top: ${el.top || 0}px;
        width: ${el.width || 150}px;
        height: ${el.height || 60}px;
      " />`;
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

module.exports = { renderCard, renderPdf };
