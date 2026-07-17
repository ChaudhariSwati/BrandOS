import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCurrentOrg, updateOrg, getMembers, addMember, getStats } from '../api/orgs';

export default function OrgDashboard() {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getCurrentOrg().then(({ data }) => {
      setOrg(data);
      setOrgName(data.name);
    });
    getMembers().then(({ data }) => setMembers(data));
    getStats().then(({ data }) => setStats(data));
  }, []);

  const handleUpdateOrg = async () => {
    setSaving(true); setError('');
    try {
      const { data } = await updateOrg({ name: orgName });
      setOrg(data);
      setMsg('Organization updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await addMember({ email: newEmail, name: newName, password: newPw });
      setNewEmail(''); setNewName(''); setNewPw('');
      setMsg('Member added');
      const { data } = await getMembers();
      setMembers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Organization</h1>
        <span className={`badge ${org?.tier === 'pro' ? 'badge-pro' : 'badge-free'}`}>{org?.tier?.toUpperCase()}</span>
      </div>
      {error && <div className="error">{error}</div>}
      {msg && <div style={{ background: '#d4edda', border: '3px solid #155724', padding: '12px 16px', marginBottom: 16, fontWeight: 600 }}>{msg}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Settings</h3></div>
          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <input className="form-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleUpdateOrg} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>

        {stats && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Usage</h3></div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 24 }}>{stats.totalAssets}</div>
                <div className="stat-label">Assets</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 24 }}>{stats.exportsThisMonth}</div>
                <div className="stat-label">Exports/Month</div>
              </div>
            </div>
            {org?.tier === 'free' && (
              <p style={{ fontSize: 12, color: 'var(--gray-dark)', marginTop: 8 }}>Free tier: 10 exports/month. Upgrade to Pro for unlimited.</p>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3 className="card-title">Team Members ({members.length})</h3></div>
        {user?.role === 'owner' && (
          <form onSubmit={handleAddMember} className="flex gap-8" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <input className="form-input" style={{ width: 180 }} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            <input className="form-input" style={{ width: 200 }} type="email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            <input className="form-input" style={{ width: 160 }} type="password" placeholder="Password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
            <button className="btn btn-primary">Add Member</button>
          </form>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m._id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.email}</td>
                  <td><span className={`badge ${m.role === 'owner' ? 'badge-owner' : 'badge-member'}`}>{m.role}</span></td>
                  <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
