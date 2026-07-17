import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBrandKit, createBrandKit, updateBrandKit, uploadLogo, extractColors } from '../api/brandkits';

const PRESET_COLORS = ['#FF4D4D', '#FF6B35', '#FFD166', '#06D6A0', '#118AB2', '#073B4C', '#1A1A1A', '#FAFAFA'];

export default function BrandKitEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [name, setName] = useState('');
  const [colors, setColors] = useState([]);
  const [headingFont, setHeadingFont] = useState('Poppins');
  const [bodyFont, setBodyFont] = useState('Inter');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!isNew) {
      getBrandKit(id).then(({ data }) => {
        setName(data.name);
        setColors(data.colors || []);
        setHeadingFont(data.fonts?.heading || 'Poppins');
        setBodyFont(data.fonts?.body || 'Inter');
        setLogoUrl(data.logoUrl || '');
      }).catch(() => navigate('/brandkits'));
    }
  }, [id]);

  const toggleColor = (c) => {
    setColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = { name, colors, fonts: { heading: headingFont, body: bodyFont }, logoUrl };
      if (isNew) {
        const { data: kit } = await createBrandKit(data);
        navigate(`/brandkits/${kit._id}`);
      } else {
        await updateBrandKit(id, data);
        navigate('/brandkits');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAiExtract = async () => {
    if (!logoUrl) { setError('Paste a logo URL first'); return; }
    setAiLoading(true);
    setError('');
    try {
      const { data } = await extractColors(logoUrl);
      setColors(data.colors || []);
    } catch (err) {
      setError(err.response?.data?.message || 'AI extraction failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (isNew) {
        const { data: kit } = await createBrandKit({ name, colors, fonts: { heading: headingFont, body: bodyFont } });
        await uploadLogo(kit._id, file);
        navigate(`/brandkits/${kit._id}`);
      } else {
        const { data } = await uploadLogo(id, file);
        setLogoUrl(data.logoUrl);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">{isNew ? 'New Brand Kit' : 'Edit Brand Kit'}</h1>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <div className="form-group">
          <label className="form-label">Kit Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Brand Kit" />
        </div>

        <div className="form-group">
          <label className="form-label">Colors</label>
          <div className="color-picker-group" style={{ marginBottom: 8 }}>
            {PRESET_COLORS.map((c) => (
              <div key={c} className={`color-swatch ${colors.includes(c) ? 'active' : ''}`}
                style={{ background: c, border: c === '#FAFAFA' ? '3px solid #ccc' : undefined }}
                onClick={() => toggleColor(c)} />
            ))}
            <div className="color-input-wrap">
              <input type="color" className="color-swatch" onChange={(e) => toggleColor(e.target.value)} title="Custom" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {colors.map((c, i) => (
              <span key={i} className="badge" style={{ background: c, color: '#fff', border: '2px solid #000' }}>
                {c}
                <button style={{ marginLeft: 4, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                  onClick={() => setColors((prev) => prev.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
          </div>
          <button className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={handleAiExtract} disabled={aiLoading}>
            {aiLoading ? 'Analyzing…' : '🤖 AI Auto-Detect from Logo'}
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Heading Font</label>
          <select className="form-input" value={headingFont} onChange={(e) => setHeadingFont(e.target.value)}>
            {['Poppins','Inter','Roboto','Montserrat','Playfair Display','Lato','Oswald','Raleway'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Body Font</label>
          <select className="form-input" value={bodyFont} onChange={(e) => setBodyFont(e.target.value)}>
            {['Inter','Poppins','Roboto','Lato','Open Sans','Nunito','Source Sans Pro','Raleway'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Logo</label>
          {logoUrl && <img src={logoUrl} alt="logo" style={{ maxHeight: 60, display: 'block', marginBottom: 8 }} />}
          <input className="form-input" type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Logo URL or upload" />
          <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ marginTop: 8 }} />
        </div>

        <div className="flex gap-8" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : (isNew ? 'Create Kit' : 'Save')}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/brandkits')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
