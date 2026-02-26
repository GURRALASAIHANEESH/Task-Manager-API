// ===== frontend/src/utils/token.js =====

// ─────────────────────────────────────────────
// In-memory token store
//
// Access tokens are stored in a JS module-level
// variable — NOT in localStorage or sessionStorage.
//
// This prevents XSS attacks from stealing tokens.
// The token is lost on page refresh, but the
// httpOnly refresh token cookie silently restores
// the session via AuthContext's initializeAuth().
//
// This module is a thin wrapper used by components
// that need direct token access outside of the
// Axios interceptor (e.g. WebSocket connections).
// For all API calls, use the interceptor in api.js.
// ─────────────────────────────────────────────

let _accessToken = null;

/**
 * Store the access token in memory
 * @param {string} token
 */
export const saveToken = (token) => {
    _accessToken = token;
};

/**
 * Retrieve the current access token
 * @returns {string|null}
 */
export const getToken = () => _accessToken;

/**
 * Clear the access token from memory
 * Called on logout or session expiry
 */
export const removeToken = () => {
    _accessToken = null;
};

/**
 * Check if a token is currently stored
 * @returns {boolean}
 */
export const hasToken = () => !!_accessToken;

/**
 * Decode token payload without verification
 * For UI display purposes only — never use for auth decisions
 * @returns {object|null}
 */
export const decodeTokenPayload = () => {
    if (!_accessToken) return null;

    try {
        const base64Payload = _accessToken.split('.')[1];
        const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

/**
 * Check if the stored token is expired
 * Based on the `exp` claim in the JWT payload
 * @returns {boolean}
 */
export const isTokenExpired = () => {
    const payload = decodeTokenPayload();
    if (!payload || !payload.exp) return true;

    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= payload.exp * 1000;
};
