import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listAssets, deleteAsset, renderCard, renderPdf } from '../api/assets';

export default function Assets() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(null);

  const load = () => {
    setLoading(true);
    listAssets(filter || undefined)
      .then(({ data }) => setAssets(data))
      .catch(() => setError('Failed to load assets'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this asset?')) return;
    try { await deleteAsset(id); load(); }
    catch { setError('Delete failed'); }
  };

  const handleExport = async (asset) => {
    setExporting(asset._id);
    setError('');
    try {
      let res;
      if (asset.type === 'card') {
        res = await renderCard(asset._id);
      } else {
        res = await renderPdf(asset._id);
      }
      if (res.data.exportUrl) {
        window.open(res.data.exportUrl, '_blank');
      } else {
        setError('Export URL not available');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Assets</h1>
        <div className="flex gap-8">
          <select className="form-input" style={{ width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="card">Cards</option>
            <option value="letterhead">Letterheads</option>
            <option value="invoice">Invoices</option>
          </select>
        </div>
      </div>
      {error && <div className="error">{error}</div>}

      {assets.length === 0 ? (
        <div className="empty-state">
          <h3>No assets yet</h3>
          <p>Create a card, letterhead, or invoice to get started.</p>
          <div className="flex gap-8" style={{ justifyContent: 'center' }}>
            <Link to="/assets/card/new" className="btn btn-primary">New Card</Link>
            <Link to="/assets/letterhead/new" className="btn btn-secondary">New Letterhead</Link>
            <Link to="/assets/invoice/new" className="btn btn-secondary">New Invoice</Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Brand Kit</th>
                  <th>Created By</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a._id}>
                    <td><strong>{a.name}</strong></td>
                    <td><span className="badge">{a.type}</span></td>
                    <td>{a.brandKit?.name || '—'}</td>
                    <td>{a.createdBy?.name || '—'}</td>
                    <td>{new Date(a.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/assets/${a.type}/${a._id}`)}>Edit</button>
                        <button className="btn btn-sm btn-primary" onClick={() => handleExport(a)} disabled={exporting === a._id}>
                          {exporting === a._id ? '…' : 'Export'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a._id)}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
