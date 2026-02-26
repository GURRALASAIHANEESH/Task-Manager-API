// ===== frontend/src/services/api.js =====

import axios from 'axios';

// ─────────────────────────────────────────────
// Axios instance
// All API calls go through this instance so that
// base URL, headers, and interceptors are applied
// consistently across the entire frontend.
// ─────────────────────────────────────────────
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
    timeout: 15000, // 15 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Send httpOnly cookies (refresh token) with every request
});

// ─────────────────────────────────────────────
// In-memory access token store
//
// Access tokens are stored in memory (a JS closure),
// NOT in localStorage or sessionStorage.
//
// Why:
//   - localStorage is accessible to any JS on the page
//     — vulnerable to XSS attacks.
//   - Memory storage means the token is lost on page
//     refresh, but the httpOnly refresh token cookie
//     automatically re-issues a new access token.
//   - This is the recommended approach for SPAs per
//     OAuth 2.0 Security Best Current Practice (BCP).
// ─────────────────────────────────────────────
let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
    accessToken = null;
};

// ─────────────────────────────────────────────
// Request interceptor
// Attaches the access token to every outgoing
// request Authorization header automatically.
// ─────────────────────────────────────────────
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// Response interceptor
//
// Handles 401 responses by:
//   1. Attempting a silent token refresh via the
//      httpOnly refresh token cookie
//   2. Retrying the original failed request with
//      the new access token
//   3. If refresh fails — clearing state and
//      redirecting to login
//
// Uses a refresh lock (isRefreshing) and a queue
// (failedRequestsQueue) to handle concurrent
// 401 responses without firing multiple refresh
// requests simultaneously.
// ─────────────────────────────────────────────
let isRefreshing = false;
let failedRequestsQueue = [];

const processQueue = (error, token = null) => {
    failedRequestsQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedRequestsQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh on 401 responses that have not been retried
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            originalRequest.url !== '/auth/refresh' && // Prevent infinite loop
            originalRequest.url !== '/auth/login'
        ) {
            if (isRefreshing) {
                // Queue this request until the refresh completes
                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt silent refresh using httpOnly cookie
                const response = await api.post('/auth/refresh');
                const newToken = response.data.data.accessToken;

                setAccessToken(newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                processQueue(null, newToken);

                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed — session is fully expired
                processQueue(refreshError, null);
                clearAccessToken();

                // Redirect to login — works for both Vite and CRA setups
                window.location.href = '/login';

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ─────────────────────────────────────────────
// Auth API calls
// ─────────────────────────────────────────────
export const authAPI = {
    register: (data) =>
        api.post('/auth/register', data),

    login: (data) =>
        api.post('/auth/login', data),

    logout: () =>
        api.post('/auth/logout'),

    refreshToken: () =>
        api.post('/auth/refresh'),

    getProfile: () =>
        api.get('/auth/me'),

    changePassword: (data) =>
        api.post('/auth/change-password', data),
};

// ─────────────────────────────────────────────
// Task API calls
// ─────────────────────────────────────────────
export const taskAPI = {
    // GET /tasks?status=PENDING&page=1&limit=10&sortBy=createdAt&sortOrder=desc&search=keyword
    getAll: (params = {}) =>
        api.get('/tasks', { params }),

    getById: (id) =>
        api.get(`/tasks/${id}`),

    create: (data) =>
        api.post('/tasks', data),

    update: (id, data) =>
        api.put(`/tasks/${id}`, data),

    delete: (id) =>
        api.delete(`/tasks/${id}`),

    getStats: () =>
        api.get('/tasks/stats'),
};

export default api;
