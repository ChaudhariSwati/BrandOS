import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listBrandKits, deleteBrandKit, setActiveKit } from '../api/brandkits';

export default function BrandKits() {
  const navigate = useNavigate();
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    listBrandKits()
      .then(({ data }) => setKits(data))
      .catch(() => setError('Failed to load brand kits'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand kit?')) return;
    try {
      await deleteBrandKit(id);
      load();
    } catch { setError('Delete failed'); }
  };

  const handleSetActive = async (id) => {
    try {
      await setActiveKit(id);
      load();
    } catch { setError('Failed to set active'); }
  };

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Brand Kits</h1>
        <Link to="/brandkits/new" className="btn btn-primary">+ New Kit</Link>
      </div>
      {error && <div className="error">{error}</div>}

      {kits.length === 0 ? (
        <div className="empty-state">
          <h3>No brand kits yet</h3>
          <p>Create your first brand kit to define colors, fonts, and logo.</p>
          <Link to="/brandkits/new" className="btn btn-primary">Create Brand Kit</Link>
        </div>
      ) : (
        <div className="grid-2">
          {kits.map((kit) => (
            <div className="card" key={kit._id}>
              <div className="card-header">
                <h3 className="card-title">{kit.name}</h3>
                <span className={`badge ${kit._id === kits[0]?._id ? 'badge-pro' : 'badge-free'}`}>
                  v{kit.version}
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="color-picker-group" style={{ marginBottom: 8 }}>
                  {kit.colors?.map((c, i) => (
                    <div key={i} className="color-swatch" title={c} style={{ background: c }} />
                  ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-dark)' }}>
                  Heading: {kit.fonts?.heading} · Body: {kit.fonts?.body}
                </div>
                {kit.logoUrl && (
                  <img src={kit.logoUrl} alt="logo" style={{ maxHeight: 40, marginTop: 8 }} />
                )}
              </div>

              <div className="item-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/brandkits/${kit._id}`)}>Edit</button>
                <button className="btn btn-sm btn-secondary" onClick={() => handleSetActive(kit._id)}>Set Active</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(kit._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
