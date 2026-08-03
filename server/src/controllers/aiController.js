require('express-async-errors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const BrandKit = require('../models/BrandKit');

const HF_API_BASE = 'https://api-inference.huggingface.co/models';
const DEFAULT_HF_MODEL = process.env.HUGGING_FACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

const CARD_TEMPLATES = {
  social: { width: 1200, height: 675, label: 'social media card' },
  business: { width: 1050, height: 600, label: 'business card' },
};

function resolveTemplate(templateKey) {
  return CARD_TEMPLATES[templateKey] || CARD_TEMPLATES.social;
}

/**
 * Resolve the Gemini model. Returns null (and logs a warning) if the
 * GEMINI_API_KEY is missing so callers can fall back gracefully.
 */
function getGeminiModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn('[AI] GEMINI_API_KEY is not configured — AI features unavailable');
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(key);
    // Allow overriding the model via env var, but fall back to a known-supported default.
    const configured = process.env.GEMINI_MODEL;
    const preferred = configured || 'gemini-flash-latest';
    try {
      return genAI.getGenerativeModel({ model: preferred });
    } catch (err) {
      console.warn(`[AI] Requested Gemini model "${preferred}" failed: ${err.message}`);
      if (configured && configured !== 'gemini-flash-latest') {
        // Try a safe default if the configured model isn't supported for this API surface
        try {
          console.warn('[AI] Falling back to gemini-flash-latest');
          return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        } catch (err2) {
          console.warn('[AI] Fallback to gemini-flash-latest also failed:', err2.message);
          return null;
        }
      }
      return null;
    }
  } catch (err) {
    console.warn('[AI] Failed to initialize Gemini model:', err.message);
    return null;
  }
}

function getHuggingFaceConfig() {
  const token = process.env.HUGGING_FACE_API_KEY;
  if (!token) {
    return null;
  }

  return {
    token,
    model: process.env.HUGGING_FACE_MODEL || DEFAULT_HF_MODEL,
  };
}

function buildHuggingFaceModelUrl(model) {
  return `${HF_API_BASE}/${String(model || '').split('/').map(encodeURIComponent).join('/')}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonCandidate(text) {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const arrayMatch = candidate.match(/\[[\s\S]*\]/);
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  return [candidate, arrayMatch?.[0], objectMatch?.[0]].find(Boolean) || null;
}

/**
 * Parse a JSON array/object out of a Gemini text response.
 * Gemini sometimes wraps output in markdown fences or extra prose,
 * so we extract the first `[...]` block.
 */
function parseJsonFromResponse(text) {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

async function callHuggingFaceTextGeneration(prompt, options = {}, attempt = 0) {
  const config = getHuggingFaceConfig();
  if (!config) return null;

  const response = await fetch(buildHuggingFaceModelUrl(config.model), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: options.max_new_tokens || 900,
        temperature: options.temperature ?? 0.35,
        top_p: options.top_p ?? 0.95,
        return_full_text: false,
      },
      options: {
        wait_for_model: true,
        use_cache: false,
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage = payload?.error || payload?.message || response.statusText || 'Hugging Face request failed';
    if (response.status === 503 && payload?.estimated_time && attempt < 2) {
      await sleep(Math.min(Math.ceil(Number(payload.estimated_time) * 1000), 5000));
      return callHuggingFaceTextGeneration(prompt, options, attempt + 1);
    }
    throw new Error(errorMessage);
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => item?.generated_text || item?.summary_text || item?.text || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (payload && typeof payload === 'object') {
    return String(payload.generated_text || payload.text || payload.summary_text || '').trim();
  }

  return '';
}

async function generateCardViaHuggingFace(kit, prompt, templateKey) {
  const hfPrompt = `${buildCardDesignPrompt(kit, prompt, templateKey)}\n\nRespond with ONLY the JSON array.`;
  const text = await callHuggingFaceTextGeneration(hfPrompt, { max_new_tokens: 950, temperature: 0.35 });
  const parsed = parseJsonFromResponse(text);
  const elements = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.elements) ? parsed.elements : null;

  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error('Hugging Face did not return a valid design. Please try a different prompt.');
  }

  return elements;
}

async function generateCardCopyViaHuggingFace(kit, prompt, tone, templateKey) {
  const hfPrompt = `${buildCardCopyPrompt(kit, prompt, tone, templateKey)}\n\nRespond with ONLY the JSON object.`;
  const text = await callHuggingFaceTextGeneration(hfPrompt, { max_new_tokens: 350, temperature: 0.4 });
  const parsed = parseJsonFromResponse(text);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Hugging Face did not return valid copy. Please try again.');
  }

  return parsed;
}

/**
 * Build the design-generation prompt for Gemini.
 * Injects the brand kit palette/fonts so the AI produces on-brand output.
 */
function buildCardDesignPrompt(kit, userPrompt, templateKey) {
  const template = resolveTemplate(templateKey);
  const colors = kit?.colors?.length ? kit.colors.join(', ') : '#1A1A1A, #FFFFFF, #E74C3C';
  const headingFont = kit?.fonts?.heading || 'Poppins';
  const bodyFont = kit?.fonts?.body || 'Inter';
  const kitName = kit?.name || 'Brand';

  return `You are an expert graphic designer for the brand "${kitName}".

Create a ${template.label} design (${template.width}x${template.height} px) based on this request:
"${userPrompt}"

Use ONLY these brand colors: ${colors}
Use font family "${headingFont}" for headings and "${bodyFont}" for body text.

Return a STRICT JSON array of Fabric.js elements. Each element must be one of:
1. {"type":"rect","left":0,"top":0,"width":1200,"height":675,"fill":"#COLOR"} — background (always include first)
2. {"type":"rect","left":N,"top":N,"width":N,"height":N,"fill":"#COLOR","rx":N} — accent shape
3. {"type":"text","left":N,"top":N,"text":"...","fontSize":N,"fontFamily":"Poppins","fill":"#COLOR","fontWeight":700,"width":1000}

Rules:
- First element MUST be a full-bleed background rect.
- Text must be short, punchy, on-brand marketing copy.
- Coordinates must fit within 0..${template.width} and 0..${template.height}.
- Use good visual hierarchy: a large headline, a smaller subheadline, and optionally an accent shape.
- Return ONLY the JSON array, no markdown, no explanation.`;
}

/**
 * Build the copywriting prompt for Gemini.
 */
function buildCardCopyPrompt(kit, userPrompt, tone, templateKey) {
  const template = resolveTemplate(templateKey);
  const kitName = kit?.name || 'Brand';
  const headingFont = kit?.fonts?.heading || 'Poppins';

  return `You are a marketing copywriter for the brand "${kitName}".

Write ${template.label} copy for this topic: "${userPrompt}"
Tone: ${tone || 'professional'}.

Return a STRICT JSON object with exactly these keys:
{"headline":"<8 words max, attention-grabbing>","subheadline":"<12 words max, supporting line>","cta":"<4 words max, call to action>"}

Use only the "${headingFont}" font family. Return ONLY the JSON object, no markdown.`;
}

/**
 * POST /api/ai/generate-card
 * Body: { brandKitId?, prompt }
 * Generates a complete card design (Fabric elements) from a text prompt.
 */
const generateCard = async (req, res) => {
  const { prompt, brandKitId, template: templateKey } = req.body;
  const template = resolveTemplate(templateKey);

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400);
    throw new Error('A "prompt" is required to generate a card');
  }

  // Load the brand kit (colors/fonts) if provided; fall back to defaults
  let kit = null;
  if (brandKitId) {
    try {
      kit = await BrandKit.findById(brandKitId).lean();
    } catch {
      kit = null;
    }
  }

  try {
    let elements = null;
    let provider = 'demo';

    if (getHuggingFaceConfig()) {
      try {
        elements = await generateCardViaHuggingFace(kit, prompt.trim(), templateKey);
        provider = 'huggingface';
      } catch (err) {
        console.warn('[AI] Hugging Face generateCard failed:', err.message);
      }
    }

    if (!elements) {
      const model = getGeminiModel();
      if (model) {
        try {
          const result = await model.generateContent(buildCardDesignPrompt(kit, prompt.trim(), templateKey));
          const text = result.response.text();
          const parsed = parseJsonFromResponse(text);
          elements = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.elements) ? parsed.elements : null;
          provider = 'gemini';
        } catch (err) {
          console.warn('[AI] Gemini generateCard failed:', err.message);
        }
      }
    }

    if (!elements) {
      elements = buildFallbackDesign(prompt, template);
      provider = 'demo';
    }

    // Sanitize elements — guarantee a background, clamp coords, force safe types
    const sanitized = sanitizeElements(elements, kit, template);

    res.json({
      elements: sanitized,
      name: prompt.trim().split(/\s+/).slice(0, 4).join(' '),
      ai: provider !== 'demo',
      provider,
      dimensions: { width: template.width, height: template.height },
      note: provider === 'huggingface'
        ? 'Generated with Hugging Face and rendered into the canvas.'
        : provider === 'gemini'
          ? 'Generated with Gemini and rendered into the canvas.'
          : 'Showing a sample design because no AI provider was available.',
    });
  } catch (err) {
    res.status(502);
    throw new Error('AI card generation failed. Please try again.');
  }
};

/**
 * POST /api/ai/generate-card-copy
 * Body: { brandKitId?, prompt, tone? }
 * Generates headline/subheadline/CTA copy for a card.
 */
const generateCardCopy = async (req, res) => {
  const { prompt, tone, brandKitId, template: templateKey } = req.body;
  const template = resolveTemplate(templateKey);

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400);
    throw new Error('A "prompt" is required to generate copy');
  }

  let kit = null;
  if (brandKitId) {
    try {
      kit = await BrandKit.findById(brandKitId).lean();
    } catch {
      kit = null;
    }
  }

  try {
    let copy = null;
    let provider = 'demo';

    if (getHuggingFaceConfig()) {
      try {
        copy = await generateCardCopyViaHuggingFace(kit, prompt.trim(), tone, templateKey);
        provider = 'huggingface';
      } catch (err) {
        console.warn('[AI] Hugging Face generateCardCopy failed:', err.message);
      }
    }

    if (!copy) {
      const model = getGeminiModel();
      if (model) {
        try {
          const result = await model.generateContent(buildCardCopyPrompt(kit, prompt.trim(), tone, templateKey));
          const text = result.response.text();
          copy = parseJsonFromResponse(text);
          provider = 'gemini';
        } catch (err) {
          console.warn('[AI] Gemini generateCardCopy failed:', err.message);
        }
      }
    }

    if (!copy || typeof copy !== 'object' || Array.isArray(copy)) {
      copy = {
        headline: 'Great Design Starts Here',
        subheadline: `Turn any idea into an on-brand ${template.label} with BrandOS AI.`,
        cta: 'Get Started',
      };
      provider = 'demo';
    }

    res.json({
      headline: copy.headline || 'Great Design Starts Here',
      subheadline: copy.subheadline || '',
      cta: copy.cta || '',
      ai: provider !== 'demo',
      provider,
    });
  } catch (err) {
    res.status(502);
    throw new Error('AI copy generation failed. Please try again.');
  }
};

/**
 * POST /api/ai/health
 * Lightweight check — is the Gemini key configured?
 */
const aiHealth = (req, res) => {
  res.json({
    configured: !!(process.env.HUGGING_FACE_API_KEY || process.env.GEMINI_API_KEY),
    provider: process.env.HUGGING_FACE_API_KEY ? 'huggingface' : process.env.GEMINI_API_KEY ? 'gemini' : 'demo',
    model: process.env.HUGGING_FACE_API_KEY
      ? (process.env.HUGGING_FACE_MODEL || DEFAULT_HF_MODEL)
      : (process.env.GEMINI_MODEL || 'gemini-flash-latest'),
  });
};

/**
 * Ensure the elements array is safe for the Fabric.js canvas:
 *  - Always prepend a full-bleed background
 *  - Clamp coordinates to canvas bounds
 *  - Force known element types (text/rect)
 *  - Default text color to white for contrast on dark backgrounds
 */
function sanitizeElements(elements, kit, template) {
  const width = template?.width || 1200;
  const height = template?.height || 675;
  const bgColor = kit?.colors?.[0] || '#1A1A1A';
  const accentColor = kit?.colors?.[1] || '#FF4D4D';
  const headingFont = kit?.fonts?.heading || 'Poppins';
  const bodyFont = kit?.fonts?.body || 'Inter';

  const result = [
    {
      type: 'rect',
      left: 0,
      top: 0,
      width,
      height,
      fill: bgColor,
      rx: 0,
    },
  ];

  for (const el of elements.slice(0, 12)) {
    if (el.type === 'rect') {
      // Skip full-bleed rects from the AI (we already added one)
      if (el.width >= width && el.height >= height) continue;
      result.push({
        type: 'rect',
        left: clampNum(el.left, 0, width - 20),
        top: clampNum(el.top, 0, height - 20),
        width: clampNum(el.width, 20, width),
        height: clampNum(el.height, 20, height),
        fill: /^#[0-9A-Fa-f]{3,8}$/.test(el.fill || '') ? el.fill : accentColor,
        rx: clampNum(el.rx, 0, 60),
      });
    } else if (el.type === 'text' || el.type === 'textbox' || el.type === 'i-text') {
      result.push({
        type: 'text',
        left: clampNum(el.left, 0, width - 40),
        top: clampNum(el.top, 0, height - 40),
        text: String(el.text || '').slice(0, 200),
        fontSize: clampNum(el.fontSize, 14, 140),
        fontFamily: el.fontFamily || (el.fontWeight > 600 ? headingFont : bodyFont),
        fill: /^#[0-9A-Fa-f]{3,8}$/.test(el.fill || '') ? el.fill : '#FFFFFF',
        fontWeight: clampNum(el.fontWeight, 400, 900) || 700,
        width: clampNum(el.width, 200, width),
        textAlign: el.textAlign || 'center',
      });
    }
  }

  return result;
}

function clampNum(val, min, max) {
  const n = Number(val);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Deterministic fallback design used when Gemini is not configured.
 * Produces a reasonable card so the feature is never a dead-end.
 */
function buildFallbackDesign(prompt, template) {
  const title = prompt.trim().split(/\s+/).slice(0, 5).join(' ') || 'Your Brand';
  const width = template?.width || 1200;
  const height = template?.height || 675;
  if (template?.label === 'business card') {
    return [
      { type: 'rect', left: 0, top: 0, width, height, fill: '#1A1A1A', rx: 44 },
      { type: 'rect', left: 0, top: 0, width: 300, height, fill: '#FF4D4D', rx: 44 },
      { type: 'text', left: 60, top: 72, text: 'BK', fontSize: 68, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, width: 160, textAlign: 'center' },
      { type: 'text', left: 340, top: 120, text: title, fontSize: 58, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, width: 620, textAlign: 'left' },
      { type: 'text', left: 340, top: 196, text: 'Founder | Brand Consultant', fontSize: 24, fontFamily: 'Inter', fill: '#FFD166', fontWeight: 600, width: 620, textAlign: 'left' },
      { type: 'text', left: 340, top: 314, text: 'hello@brandos.com   |   +91 90000 00000', fontSize: 22, fontFamily: 'Inter', fill: '#FFFFFF', fontWeight: 500, width: 620, textAlign: 'left' },
    ];
  }
  return [
    { type: 'rect', left: 0, top: 0, width, height, fill: '#1A1A1A', rx: 0 },
    { type: 'rect', left: 80, top: 80, width: 200, height: 12, fill: '#FF4D4D', rx: 6 },
    { type: 'text', left: 80, top: 130, text: title, fontSize: 72, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, width: 1040, textAlign: 'left' },
    { type: 'text', left: 80, top: 260, text: 'Crafted with BrandOS AI', fontSize: 28, fontFamily: 'Inter', fill: '#FFD166', fontWeight: 500, width: 800, textAlign: 'left' },
  ];
}

module.exports = { generateCard, generateCardCopy, aiHealth };

