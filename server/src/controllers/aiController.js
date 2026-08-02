require('express-async-errors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const BrandKit = require('../models/BrandKit');

const DEFAULT_CARD_WIDTH = 1200;
const DEFAULT_CARD_HEIGHT = 675;

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
    return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  } catch (err) {
    console.warn('[AI] Failed to initialize Gemini model:', err.message);
    return null;
  }
}

/**
 * Parse a JSON array/object out of a Gemini text response.
 * Gemini sometimes wraps output in markdown fences or extra prose,
 * so we extract the first `[...]` block.
 */
function parseJsonFromResponse(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const jsonMatch = candidate.match(/\[[\s\S]*\]/);
  const toParse = jsonMatch ? jsonMatch[0] : candidate;
  try {
    return JSON.parse(toParse);
  } catch {
    // Last resort — try to find any array/object boundary
    const start = toParse.indexOf('[');
    const end = toParse.lastIndexOf(']');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(toParse.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Build the design-generation prompt for Gemini.
 * Injects the brand kit palette/fonts so the AI produces on-brand output.
 */
function buildCardDesignPrompt(kit, userPrompt) {
  const colors = kit?.colors?.length ? kit.colors.join(', ') : '#1A1A1A, #FFFFFF, #E74C3C';
  const headingFont = kit?.fonts?.heading || 'Poppins';
  const bodyFont = kit?.fonts?.body || 'Inter';
  const kitName = kit?.name || 'Brand';

  return `You are an expert graphic designer for the brand "${kitName}".

Create a social media card design (${DEFAULT_CARD_WIDTH}x${DEFAULT_CARD_HEIGHT} px) based on this request:
"${userPrompt}"

Use ONLY these brand colors: ${colors}
Use font family "${headingFont}" for headings and "${bodyFont}" for body text.

Return a STRICT JSON array of Fabric.js elements. Each element must be one of:
1. {"type":"rect","left":0,"top":0,"width":1200,"height":675,"fill":"#COLOR"} — background (always include first)
2. {"type":"rect","left":N,"top":N,"width":N,"height":N,"fill":"#COLOR","rx":N} — accent shape
3. {"type":"text","left":N,"top":N,"text":"...","fontSize":N,"fontFamily":"Poppins","fill":"#COLOR","fontWeight":700,"width":1000}

Rules:
- First element MUST be a full-bleed background rect.
- Text must be short, punchy, on-brand marketing copy (no more than ~8 words per text element).
- Coordinates must fit within 0..${DEFAULT_CARD_WIDTH} and 0..${DEFAULT_CARD_HEIGHT}.
- Use good visual hierarchy: a large headline, a smaller subheadline, and optionally an accent shape.
- Return ONLY the JSON array, no markdown, no explanation.`;
}

/**
 * Build the copywriting prompt for Gemini.
 */
function buildCardCopyPrompt(kit, userPrompt, tone) {
  const kitName = kit?.name || 'Brand';
  const headingFont = kit?.fonts?.heading || 'Poppins';

  return `You are a marketing copywriter for the brand "${kitName}".

Write social media card copy for this topic: "${userPrompt}"
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
  const { prompt, brandKitId } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400);
    throw new Error('A "prompt" is required to generate a card');
  }

  const model = getGeminiModel();
  if (!model) {
    // Fall back to a deterministic template so the UI still works without a key
    return res.json({
      elements: buildFallbackDesign(prompt),
      name: prompt.trim().split(/\s+/).slice(0, 4).join(' '),
      ai: false,
      note: 'GEMINI_API_KEY is not configured — showing a sample design. Add a key to enable AI generation.',
    });
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

  const geminiPrompt = buildCardDesignPrompt(kit, prompt.trim());

  try {
    const result = await model.generateContent(geminiPrompt);
    const text = result.response.text();
    const elements = parseJsonFromResponse(text);

    if (!Array.isArray(elements) || elements.length === 0) {
      res.status(502);
      throw new Error('Gemini did not return a valid design. Please try a different prompt.');
    }

    // Sanitize elements — guarantee a background, clamp coords, force safe types
    const sanitized = sanitizeElements(elements, kit);

    res.json({
      elements: sanitized,
      name: prompt.trim().split(/\s+/).slice(0, 4).join(' '),
      ai: true,
    });
  } catch (err) {
    if (err.status && err.status >= 400) throw err;
    console.warn('[AI] Gemini generateCard failed:', err.message);
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
  const { prompt, tone, brandKitId } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400);
    throw new Error('A "prompt" is required to generate copy');
  }

  const model = getGeminiModel();
  if (!model) {
    return res.json({
      headline: 'Great Design Starts Here',
      subheadline: 'Turn any idea into an on-brand social card with BrandOS AI.',
      cta: 'Get Started',
      ai: false,
    });
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
    const result = await model.generateContent(buildCardCopyPrompt(kit, prompt.trim(), tone));
    const text = result.response.text();
    const copy = parseJsonFromResponse(text);

    if (!copy || typeof copy !== 'object') {
      res.status(502);
      throw new Error('Gemini did not return valid copy. Please try again.');
    }

    res.json({
      headline: copy.headline || 'Great Design Starts Here',
      subheadline: copy.subheadline || '',
      cta: copy.cta || '',
      ai: true,
    });
  } catch (err) {
    if (err.status && err.status >= 400) throw err;
    console.warn('[AI] Gemini generateCardCopy failed:', err.message);
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
    configured: !!process.env.GEMINI_API_KEY,
    model: 'gemini-flash-latest',
  });
};

/**
 * Ensure the elements array is safe for the Fabric.js canvas:
 *  - Always prepend a full-bleed background
 *  - Clamp coordinates to canvas bounds
 *  - Force known element types (text/rect)
 *  - Default text color to white for contrast on dark backgrounds
 */
function sanitizeElements(elements, kit) {
  const bgColor = kit?.colors?.[0] || '#1A1A1A';
  const accentColor = kit?.colors?.[1] || '#FF4D4D';
  const headingFont = kit?.fonts?.heading || 'Poppins';
  const bodyFont = kit?.fonts?.body || 'Inter';

  const result = [
    {
      type: 'rect',
      left: 0,
      top: 0,
      width: DEFAULT_CARD_WIDTH,
      height: DEFAULT_CARD_HEIGHT,
      fill: bgColor,
      rx: 0,
    },
  ];

  for (const el of elements.slice(0, 12)) {
    if (el.type === 'rect') {
      // Skip full-bleed rects from the AI (we already added one)
      if (el.width >= DEFAULT_CARD_WIDTH && el.height >= DEFAULT_CARD_HEIGHT) continue;
      result.push({
        type: 'rect',
        left: clampNum(el.left, 0, DEFAULT_CARD_WIDTH - 20),
        top: clampNum(el.top, 0, DEFAULT_CARD_HEIGHT - 20),
        width: clampNum(el.width, 20, DEFAULT_CARD_WIDTH),
        height: clampNum(el.height, 20, DEFAULT_CARD_HEIGHT),
        fill: /^#[0-9A-Fa-f]{3,8}$/.test(el.fill || '') ? el.fill : accentColor,
        rx: clampNum(el.rx, 0, 60),
      });
    } else if (el.type === 'text' || el.type === 'textbox' || el.type === 'i-text') {
      result.push({
        type: 'text',
        left: clampNum(el.left, 0, DEFAULT_CARD_WIDTH - 40),
        top: clampNum(el.top, 0, DEFAULT_CARD_HEIGHT - 40),
        text: String(el.text || '').slice(0, 200),
        fontSize: clampNum(el.fontSize, 14, 140),
        fontFamily: el.fontFamily || (el.fontWeight > 600 ? headingFont : bodyFont),
        fill: /^#[0-9A-Fa-f]{3,8}$/.test(el.fill || '') ? el.fill : '#FFFFFF',
        fontWeight: clampNum(el.fontWeight, 400, 900) || 700,
        width: clampNum(el.width, 200, DEFAULT_CARD_WIDTH),
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
function buildFallbackDesign(prompt) {
  const title = prompt.trim().split(/\s+/).slice(0, 5).join(' ') || 'Your Brand';
  return [
    { type: 'rect', left: 0, top: 0, width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT, fill: '#1A1A1A', rx: 0 },
    { type: 'rect', left: 80, top: 80, width: 200, height: 12, fill: '#FF4D4D', rx: 6 },
    { type: 'text', left: 80, top: 130, text: title, fontSize: 72, fontFamily: 'Poppins', fill: '#FFFFFF', fontWeight: 800, width: 1040, textAlign: 'left' },
    { type: 'text', left: 80, top: 260, text: 'Crafted with BrandOS AI', fontSize: 28, fontFamily: 'Inter', fill: '#FFD166', fontWeight: 500, width: 800, textAlign: 'left' },
  ];
}

module.exports = { generateCard, generateCardCopy, aiHealth };

