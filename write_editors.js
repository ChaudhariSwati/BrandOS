const fs = require('fs');
const path = 'c:/Users/kumar/OneDrive/Desktop/BrandOS/client/src/pages/InvoiceEditor.jsx';
let c = fs.readFileSync(path, 'utf8');

// Replace imports to add downloadAsset
c = c.replace(
  "import { getAsset, createAsset, updateAsset, renderPdf } from '../api/assets';",
  "import { getAsset, createAsset, updateAsset, renderPdf, downloadAsset } from '../api/assets';"
);

// Replace handleExport to try streaming download first, then fallback
const oldExport = `  const handleExport = async () => {
    if (!selectedKit) { setError('Select a brand kit first'); return; }
    setExporting(true); setError('');
    try {
      let assetId = id;
      if (isNew) {
        const { data } = await createAsset(getPayload());
        assetId = data._id;
      }
      const { data } = await renderPdf(assetId);
      if (data.exportUrl) window.open(data.exportUrl, '_blank');
      else setError(data?.error || data?.note || 'Export not available');
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally { setExporting(false); }
  };`;

const newExport = `  const handleExport = async () => {
    if (!selectedKit) { setError('Select a brand kit first'); return; }
    setExporting(true); setError('');
    try {
      let assetId = id;
      if (isNew) {
        const { data } = await createAsset(getPayload());
        assetId = data._id;
      }
      // Try direct streaming download first (no Chromium needed)
      try {
        const filename = (name || 'Invoice') + '.pdf';
        await downloadAsset(assetId, filename);
      } catch (downloadErr) {
        // Fallback: try puppeteer render
        const { data } = await renderPdf(assetId);
        if (data.exportUrl) window.open(data.exportUrl, '_blank');
        else setError(data?.error || data?.note || downloadErr.message || 'Export not available');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally { setExporting(false); }
  };`;

c = c.replace(oldExport, newExport);
fs.writeFileSync(path, c, 'utf8');
console.log('InvoiceEditor.jsx updated');

// Now update LetterheadEditor.jsx
const lhPath = 'c:/Users/kumar/OneDrive/Desktop/BrandOS/client/src/pages/LetterheadEditor.jsx';
let lh = fs.readFileSync(lhPath, 'utf8');

lh = lh.replace(
  "import { getAsset, createAsset, updateAsset, renderPdf } from '../api/assets';",
  "import { getAsset, createAsset, updateAsset, renderPdf, downloadAsset } from '../api/assets';"
);

const oldLhExport = `  const handleExport = async () => {
    if (!selectedKit) { setError('Save first, then export'); return; }
    setExporting(true); setError('');
    try {
      let assetId = id;
      if (isNew) {
        const { data } = await createAsset({ brandKit: selectedKit, type: 'letterhead', name: name || 'Untitled Letterhead', data: { header, body, footer } });
        assetId = data._id;
      }
      const { data } = await renderPdf(assetId);
      if (data.exportUrl) window.open(data.exportUrl, '_blank');
      else setError('Export not available');
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally { setExporting(false); }
  };`;

const newLhExport = `  const handleExport = async () => {
    if (!selectedKit) { setError('Save first, then export'); return; }
    setExporting(true); setError('');
    try {
      let assetId = id;
      if (isNew) {
        const { data } = await createAsset({ brandKit: selectedKit, type: 'letterhead', name: name || 'Untitled Letterhead', data: { header, body, footer } });
        assetId = data._id;
      }
      // Try direct streaming download first (no Chromium needed)
      try {
        const filename = (name || 'Letterhead') + '.pdf';
        await downloadAsset(assetId, filename);
      } catch (downloadErr) {
        // Fallback: try puppeteer render
        const { data } = await renderPdf(assetId);
        if (data.exportUrl) window.open(data.exportUrl, '_blank');
        else setError(data?.error || data?.note || downloadErr.message || 'Export not available');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally { setExporting(false); }
  };`;

lh = lh.replace(oldLhExport, newLhExport);
fs.writeFileSync(lhPath, lh, 'utf8');
console.log('LetterheadEditor.jsx updated');
