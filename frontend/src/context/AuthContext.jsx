import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { authAPI, setAccessToken, clearAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const refreshTimerRef = useRef(null);

    // Proactively refresh token 1 minute before expiry
    const scheduleTokenRefresh = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }

        const refreshIn = 14 * 60 * 1000; // 14 minutes

        refreshTimerRef.current = setTimeout(async () => {
            try {
                const response = await authAPI.refreshToken();
                const newToken = response.data.data.accessToken;
                setAccessToken(newToken);
                scheduleTokenRefresh();
            } catch {
                handleLogout();
            }
        }, refreshIn);
    }, []);

    // Run once on app mount to restore session from httpOnly cookie
    const initializeAuth = useCallback(async () => {
        try {
            const refreshResponse = await authAPI.refreshToken();
            const token = refreshResponse.data.data.accessToken;
            setAccessToken(token);

            const profileResponse = await authAPI.getProfile();
            setUser(profileResponse.data.data.user);

            scheduleTokenRefresh();
        } catch {
            clearAccessToken();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, [scheduleTokenRefresh]);

    useEffect(() => {
        initializeAuth();

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [initializeAuth]);

    const handleRegister = useCallback(async (email, password, confirmPassword) => {
        const response = await authAPI.register({ email, password, confirmPassword });
        const { user: newUser, accessToken } = response.data.data;

        setAccessToken(accessToken);
        setUser(newUser);
        scheduleTokenRefresh();

        return newUser;
    }, [scheduleTokenRefresh]);

    const handleLogin = useCallback(async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { user: loggedInUser, accessToken } = response.data.data;

        setAccessToken(accessToken);
        setUser(loggedInUser);
        scheduleTokenRefresh();

        return loggedInUser;
    }, [scheduleTokenRefresh]);

    const handleLogout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch {
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

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider. Wrap your app in <AuthProvider>.');
    }

    return context;
};

export default AuthContext;
