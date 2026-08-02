const cloudinary = require('cloudinary').v2;

// Safe config — missing/partial credentials should NOT throw at module load.
// Export endpoints check isConfigured() and gracefully fall back.
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} catch (err) {
  console.warn('[Cloudinary] Config failed at load:', err.message);
}

/**
 * Validate that Cloudinary is actually configured with real credentials.
 * Cloudinary API secrets are typically 24+ characters — a short value is
 * almost certainly a placeholder or a partial / wrong secret.
 * @returns {boolean}
 */
function isConfigured() {
  const config = cloudinary.config();
  return !!(
    config.cloud_name &&
    config.api_key &&
    config.api_secret &&
    String(config.api_secret).length >= 20
  );
}

module.exports = cloudinary;
module.exports.isConfigured = isConfigured;
