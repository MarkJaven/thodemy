const { createRemoteJWKSet, jwtVerify } = require("jose");
const { env } = require("../config/env");
const { AuthError } = require("../utils/errors");

const jwks = createRemoteJWKSet(
  new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`)
);

/**
 * Verify a Supabase JWT against the remote JWKS.
 * @param {string} token
 * @returns {Promise<object>}
 */
const verifyToken = async (token) => {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.supabaseUrl}/auth/v1`,
      audience: env.supabaseJwtAudience,
    });
    return payload;
  } catch (error) {
    throw new AuthError("Invalid or expired token", {
      reason: error.code || error.message,
    });
  }
};

/**
 * Extract a normalized user object from a token payload.
 * @param {object} payload
 * @returns {{id: string, email: string}}
 */
const buildUserFromToken = (payload) => ({
  id: payload.sub,
  email: payload.email,
});

module.exports = { authService: { verifyToken, buildUserFromToken } };
