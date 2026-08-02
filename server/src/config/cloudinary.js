let cloudinary = null;

// Wrap the ENTIRE import in try/catch. A corrupt / incomplete
// `cloudinary` npm package (e.g. missing `lib/utils/analytics/getSDKVersions.js`)
// throws at require() time — that must NEVER take down the whole API server.
try {
  cloudinary = require('cloudinary').v2;
} catch (err) {
  console.warn('[Cloudinary] Package failed to load — Cloudinary features disabled. Reason:', err && err.message);
}

// Safe config — missing/partial credentials should NOT throw at module load.
// Export endpoints check isConfigured() and gracefully fall back.
if (cloudinary) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } catch (err) {
    console.warn('[Cloudinary] Config failed at load:', err.message);
  }
}

/**
 * Validate that Cloudinary is actually configured with real credentials.
 * Cloudinary API secrets are typically 24+ characters — a short value is
 * almost certainly a placeholder or a partial / wrong secret.
 * @returns {boolean}
 */
function isConfigured() {
  if (!cloudinary) return false;
  try {
    const config = cloudinary.config();
    return !!(
      config.cloud_name &&
      config.api_key &&
      config.api_secret &&
      String(config.api_secret).length >= 20
    );
  } catch (err) {
    return false;
  }
}

// Export a safe object even if the cloudinary package failed to load.
// If `cloudinary` is null we export the mock object; otherwise re-export the
// real v2 object with `isConfigured` attached.
if (!cloudinary) {
  // Mock with the same shape — methods no-op / reject so callers can
  // still call cloudinary.uploader.upload_stream() without throwing.
  cloudinary = {
    config: () => undefined,
    uploader: {
      upload_stream: () => {
        const { PassThrough } = require('stream');
        const s = new PassThrough();
        process.nextTick(() => s.emit('error', new Error('Cloudinary is not configured')));
        return s;
      },
    },
  };
}

module.exports = cloudinary;
module.exports.isConfigured = isConfigured;
