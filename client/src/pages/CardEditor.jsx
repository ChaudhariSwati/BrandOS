import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react';
import { listBrandKits } from '../api/brandkits';
import { getAsset, createAsset, updateAsset } from '../api/assets';

export default function CardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const { editor, onReady } = useFabricJSEditor();
  const [kits, setKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listBrandKits().then(({ data }) => {
      setKits(data);
      if (data.length > 0 && isNew) setSelectedKit(data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!isNew) {
      getAsset(id).then(({ data }) => {
        setName(data.name);
        setSelectedKit(data.brandKit?._id || '');
        if (editor && data.data?.elements) {
          loadCanvasElements(data.data.elements);
        }
      }).catch(() => navigate('/assets'));
    }
  }, [id, editor]);

  const loadCanvasElements = (elements) => {
    if (!editor) return;
    elements.forEach((el) => {
      if (el.type === 'text') {
        const text = new (window.fabric?.Textbox || window.fabric?.Text)(el.text || '', {
          left: el.left, top: el.top, fontSize: el.fontSize || 32,
          fontFamily: el.fontFamily, fill: el.fill, fontWeight: el.fontWeight,
          width: el.width, angle: el.angle,
        });
        editor.canvas.add(text);
      } else if (el.type === 'rect') {
        const rect = new (window.fabric?.Rect)({
          left: el.left, top: el.top, width: el.width || 100,
          height: el.height || 100, fill: el.fill, rx: el.rx,
        });
        editor.canvas.add(rect);
      }
    });
    editor.canvas.renderAll();
  };

  const addText = () => {
    if (!editor) return;
    const text = new (window.fabric?.IText || window.fabric?.Textbox)('Double click to edit', {
      left: 100, top: 100, fontSize: 32, fontFamily: 'Poppins', fill: '#000',
    });
    editor.canvas.add(text);
    editor.canvas.setActiveObject(text);
    editor.canvas.renderAll();
  };

  const addRect = () => {
    if (!editor) return;
    const rect = new (window.fabric?.Rect)({
      left: 150, top: 150, width: 200, height: 200, fill: '#FF4D4D',
    });
    editor.canvas.add(rect);
    editor.canvas.setActiveObject(rect);
    editor.canvas.renderAll();
  };

  const addImage = () => {
    const url = prompt('Image URL:');
    if (!url || !editor) return;
    window.fabric.Image.fromURL(url, (img) => {
      img.set({ left: 100, top: 100, scaleX: 0.5, scaleY: 0.5 });
      editor.canvas.add(img);
      editor.canvas.renderAll();
    });
  };

  const clearCanvas = () => {
    if (!editor) return;
    editor.canvas.clear();
    editor.canvas.renderAll();
  };

  const handleSave = async () => {
    if (!selectedKit) { setError('Select a brand kit'); return; }
    setSaving(true);
    setError('');
    try {
      const elements = editor?.canvas?.getObjects().map((obj) => ({
        type: obj.type === 'i-text' || obj.type === 'textbox' ? 'text' : obj.type,
        left: obj.left, top: obj.top, width: obj.width, height: obj.height,
        fill: obj.fill, fontSize: obj.fontSize, fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight, angle: obj.angle, text: obj.text,
      })) || [];

      const payload = {
        brandKit: selectedKit,
        type: 'card',
        name: name || 'Untitled Card',
        data: { dimensions: { width: 1200, height: 675 }, elements },
      };

      if (isNew) {
        await createAsset(payload);
      } else {
        await updateAsset(id, payload);
      }
      navigate('/assets');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isNew ? 'New Card' : 'Edit Card'}</h1>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="flex gap-8" style={{ marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ width: 200 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Card name" />
        <select className="form-input" style={{ width: 200 }} value={selectedKit} onChange={(e) => setSelectedKit(e.target.value)}>
          <option value="">Select Brand Kit</option>
          {kits.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
        </select>
      </div>

      <div className="canvas-toolbar">
        <button className="btn btn-sm btn-secondary" onClick={addText}>+ Text</button>
        <button className="btn btn-sm btn-secondary" onClick={addRect}>+ Shape</button>
        <button className="btn btn-sm btn-secondary" onClick={addImage}>+ Image</button>
        <button className="btn btn-sm btn-secondary" onClick={clearCanvas}>Clear</button>
        <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Card'}
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/assets')}>Back</button>
      </div>

      <div className="canvas-container" style={{ width: 800, height: 450 }}>
        <canvas id="card-canvas" />
        <FabricJSCanvas onReady={onReady} />
      </div>
    </div>
  );
}
