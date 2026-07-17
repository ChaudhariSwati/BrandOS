import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listBrandKits } from '../api/brandkits';
import { getAsset, createAsset, updateAsset, renderPdf } from '../api/assets';

export default function LetterheadEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [kits, setKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState('');
  const [name, setName] = useState('');
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listBrandKits().then(({ data }) => {
      setKits(data);
      if (data.length > 0 && isNew) setSelectedKit(data[0]._id);
    });
    if (!isNew) {
      getAsset(id).then(({ data }) => {
        setName(data.name);
        setSelectedKit(data.brandKit?._id || '');
        setHeader(data.data?.header || '');
        setBody(data.data?.body || '');
        setFooter(data.data?.footer || '');
      }).catch(() => navigate('/assets'));
    }
  }, [id]);

  const handleSave = async () => {
    if (!selectedKit) { setError('Select a brand kit'); return; }
    setSaving(true); setError('');
    try {
      const payload = { brandKit: selectedKit, type: 'letterhead', name: name || 'Untitled Letterhead', data: { header, body, footer } };
      if (isNew) await createAsset(payload);
      else await updateAsset(id, payload);
      navigate('/assets');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleExport = async () => {
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
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">{isNew ? 'New Letterhead' : 'Edit Letterhead'}</h1>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company Letterhead" />
        </div>
        <div className="form-group">
          <label className="form-label">Brand Kit</label>
          <select className="form-input" value={selectedKit} onChange={(e) => setSelectedKit(e.target.value)}>
            <option value="">Select kit</option>
            {kits.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Header Content</label>
          <textarea className="form-input" rows={3} value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Company name, address, phone" />
        </div>
        <div className="form-group">
          <label className="form-label">Body Content</label>
          <textarea className="form-input" rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Main letter content…" />
        </div>
        <div className="form-group">
          <label className="form-label">Footer Content</label>
          <textarea className="form-input" rows={2} value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Email, website, etc." />
        </div>
        <div className="flex gap-8">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export PDF'}</button>
          <button className="btn btn-secondary" onClick={() => navigate('/assets')}>Back</button>
        </div>
      </div>
    </div>
  );
}
