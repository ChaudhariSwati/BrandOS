const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT containing the user id, org id, and role.
 * Keeping org + role in the token means every request can be scoped
 * to the correct tenant without an extra DB lookup on each request.
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      org: user.org,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;
