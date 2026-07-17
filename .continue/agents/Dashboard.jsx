import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../client/src/context/AuthContext';
import { getStats } from '../../client/src/api/orgs';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats()
      .then(({ data }) => setStats(data))
      .catch(() => setError('Failed to load stats'));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span className={`badge ${user?.role === 'owner' ? 'badge-owner' : 'badge-member'}`}>
          {user?.role}
        </span>
      </div>

      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="grid-4">
          <div className="card stat-card">
            <div className="stat-value">{stats.totalAssets}</div>
            <div className="stat-label">Total Assets</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{stats.exportsThisMonth}</div>
            <div className="stat-label">Exports This Month</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{stats.memberCount}</div>
            <div className="stat-label">Team Members</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{stats.assetTypes?.length || 0}</div>
            <div className="stat-label">Asset Types</div>
          </div>
        </div>
      )}

      <div className="grid-3" style={{ marginTop: 16 }}>
        <Link to="/brandkits/new" className="card" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>🎨 New Brand Kit</h3>
          <p style={{ color: 'var(--gray-dark)', fontSize: 14 }}>Define your colors, fonts, and logo</p>
        </Link>
        <Link to="/assets/card/new" className="card" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>🃏 New Card</h3>
          <p style={{ color: 'var(--gray-dark)', fontSize: 14 }}>Design a branded social media card</p>
        </Link>
        <Link to="/assets/invoice/new" className="card" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>📄 New Invoice</h3>
          <p style={{ color: 'var(--gray-dark)', fontSize: 14 }}>Generate GST-ready invoices</p>
        </Link>
      </div>
    </div>
  );
}
