// ===== frontend/src/context/AuthContext.jsx =====

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { authAPI, setAccessToken, clearAccessToken } from '../services/api';

// ─────────────────────────────────────────────
// AuthContext
//
// Provides global authentication state to the
// entire React tree.
//
// State managed:
//   - user         : authenticated user object or null
//   - isLoading    : true while initial auth check runs
//   - isAuthenticated : derived from user presence
//
// Token strategy:
//   - Access token  : stored in memory (api.js closure)
//   - Refresh token : httpOnly cookie (managed by browser)
//
// On app load, a silent refresh is attempted using
// the httpOnly cookie. If it succeeds, the user is
// considered logged in without requiring credentials.
// ─────────────────────────────────────────────

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // True until initial auth check completes
    const refreshTimerRef = useRef(null);

    // ─────────────────────────────────────────
    // scheduleTokenRefresh
    //
    // Proactively refreshes the access token
    // 1 minute before it expires (14 minutes for
    // a 15-minute token) to keep sessions seamless.
    // ─────────────────────────────────────────
    const scheduleTokenRefresh = useCallback(() => {
        // Clear any existing timer
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }

        // Refresh 1 minute before the 15-minute token expires
        const refreshIn = 14 * 60 * 1000; // 14 minutes

        refreshTimerRef.current = setTimeout(async () => {
            try {
                const response = await authAPI.refreshToken();
                const newToken = response.data.data.accessToken;
                setAccessToken(newToken);
                scheduleTokenRefresh(); // Schedule next refresh
            } catch {
                // Silent refresh failed — let the interceptor handle it on next request
                handleLogout();
            }
        }, refreshIn);
    }, []);

    // ─────────────────────────────────────────
    // initializeAuth
    //
    // Runs once on app mount.
    // Attempts a silent token refresh using the
    // httpOnly cookie. If successful, fetches
    // the user profile to populate state.
    // ─────────────────────────────────────────
    const initializeAuth = useCallback(async () => {
        try {
            const refreshResponse = await authAPI.refreshToken();
            const token = refreshResponse.data.data.accessToken;
            setAccessToken(token);

            const profileResponse = await authAPI.getProfile();
            setUser(profileResponse.data.data.user);

            scheduleTokenRefresh();
        } catch {
            // No valid session — user needs to log in
            clearAccessToken();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, [scheduleTokenRefresh]);

    useEffect(() => {
        initializeAuth();

        return () => {
            // Cleanup refresh timer on unmount
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [initializeAuth]);

    // ─────────────────────────────────────────
    // handleRegister
    // ─────────────────────────────────────────
    const handleRegister = useCallback(async (email, password, confirmPassword) => {
        const response = await authAPI.register({ email, password, confirmPassword });
        const { user: newUser, accessToken } = response.data.data;

        setAccessToken(accessToken);
        setUser(newUser);
        scheduleTokenRefresh();

        return newUser;
    }, [scheduleTokenRefresh]);

    // ─────────────────────────────────────────
    // handleLogin
    // ─────────────────────────────────────────
    const handleLogin = useCallback(async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { user: loggedInUser, accessToken } = response.data.data;

        setAccessToken(accessToken);
        setUser(loggedInUser);
        scheduleTokenRefresh();

        return loggedInUser;
    }, [scheduleTokenRefresh]);

    // ─────────────────────────────────────────
    // handleLogout
    // ─────────────────────────────────────────
    const handleLogout = useCallback(async () => {
        try {
            await authAPI.logout(); // Clears httpOnly cookie on server
        } catch {
            // Proceed with client-side cleanup regardless
        } finally {
            clearAccessToken();
            setUser(null);

            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        }
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated: !!user,
        register: handleRegister,
        login: handleLogin,
        logout: handleLogout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ─────────────────────────────────────────────
// useAuth hook
//
// Provides a clean interface for consuming auth
// state in any component.
//
// Usage:
//   const { user, login, logout, isAuthenticated } = useAuth();
// ─────────────────────────────────────────────
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider. Wrap your app in <AuthProvider>.');
    }

    return context;
};

export default AuthContext;
