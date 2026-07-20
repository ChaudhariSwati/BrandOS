import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listBrandKits } from '../api/brandkits';
import { getAsset, createAsset, updateAsset, renderPdf } from '../api/assets';

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [kits, setKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState('');
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [hsnCodes, setHsnCodes] = useState('');
  const [isGstEnabled, setIsGstEnabled] = useState(true);
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, rate: 0 }]);
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
        const inv = data.data?.invoiceData || {};
        setGstin(inv.gstin || '');
        setHsnCodes(inv.hsnCodes || '');
        setIsGstEnabled(inv.isGstEnabled !== false);
        setLineItems(inv.lineItems?.length ? inv.lineItems : [{ description: '', quantity: 1, rate: 0 }]);
      }).catch(() => navigate('/assets'));
    }
  }, [id]);

  const updateItem = (i, field, value) => {
    setLineItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const addItem = () => setLineItems((prev) => [...prev, { description: '', quantity: 1, rate: 0 }]);
  const removeItem = (i) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
  const cgst = isGstEnabled ? subtotal * 0.09 : 0;
  const sgst = isGstEnabled ? subtotal * 0.09 : 0;
  const total = subtotal + cgst + sgst;

  const getPayload = () => ({
    brandKit: selectedKit,
    type: 'invoice',
    name: name || 'Untitled Invoice',
    data: {
      invoiceData: { gstin, hsnCodes, isGstEnabled, lineItems },
    },
  });

  const handleSave = async () => {
    if (!selectedKit) { setError('Select a brand kit'); return; }
    setSaving(true); setError('');
    try {
      if (isNew) await createAsset(getPayload());
      else await updateAsset(id, getPayload());
      navigate('/assets');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleExport = async () => {
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
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isNew ? 'New Invoice' : 'Edit Invoice'}</h1>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="form-group">
          <label className="form-label">Invoice Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Invoice #001" />
        </div>
        <div className="form-group">
          <label className="form-label">Brand Kit</label>
          <select className="form-input" value={selectedKit} onChange={(e) => setSelectedKit(e.target.value)}>
            <option value="">Select kit</option>
            {kits.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">GSTIN</label>
          <input className="form-input" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
        </div>
        <div className="form-group">
          <label className="form-label">HSN / SAC Code</label>
          <input className="form-input" value={hsnCodes} onChange={(e) => setHsnCodes(e.target.value)} placeholder="8471" />
        </div>
        <div className="toggle-row">
          <div className={`toggle ${isGstEnabled ? 'active' : ''}`} onClick={() => setIsGstEnabled(!isGstEnabled)} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Enable GST (CGST 9% + SGST 9%)</span>
        </div>

        <div className="card" style={{ boxShadow: 'none', border: '2px solid #000', padding: 16 }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>Line Items</h3>
            <button className="btn btn-sm btn-primary" onClick={addItem}>+ Add Item</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Description</th>
                  <th>Qty</th>
                  <th>Rate (₹)</th>
                  <th>Amount (₹)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td><input className="form-input" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Item" /></td>
                    <td><input className="form-input" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} /></td>
                    <td><input className="form-input" type="number" min={0} value={item.rate} onChange={(e) => updateItem(i, 'rate', parseFloat(e.target.value) || 0)} /></td>
                    <td style={{ fontWeight: 700 }}>₹ {(item.quantity * item.rate).toFixed(2)}</td>
                    <td>{lineItems.length > 1 && <button className="btn btn-sm btn-danger" onClick={() => removeItem(i)}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', marginTop: 16, fontSize: 15 }}>
            <p>Subtotal: <strong>₹ {subtotal.toFixed(2)}</strong></p>
            {isGstEnabled && (
              <>
                <p>CGST (9%): <strong>₹ {cgst.toFixed(2)}</strong></p>
                <p>SGST (9%): <strong>₹ {sgst.toFixed(2)}</strong></p>
              </>
            )}
            <p style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Total: ₹ {total.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-8" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Invoice'}</button>
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export PDF'}</button>
          <button className="btn btn-secondary" onClick={() => navigate('/assets')}>Back</button>
        </div>
      </div>
    </div>
  );
}
