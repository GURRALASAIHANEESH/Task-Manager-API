// In-memory token store (prevents XSS attacks vs localStorage)
// Tokens lost on refresh, but httpOnly refresh cookie silently restores session

let _accessToken = null;

export const saveToken = (token) => {
    _accessToken = token;
};

export const getToken = () => _accessToken;

export const removeToken = () => {
    _accessToken = null;
};

export const hasToken = () => !!_accessToken;

// For UI display only — never use for auth decisions
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

// exp claim is in seconds, Date.now() is in milliseconds
export const isTokenExpired = () => {
    const payload = decodeTokenPayload();
    if (!payload || !payload.exp) return true;

    return Date.now() >= payload.exp * 1000;
};
