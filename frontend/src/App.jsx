// ===== frontend/src/App.jsx =====

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

// ─────────────────────────────────────────────
// ProtectedRoute
//
// Renders children only when user is authenticated.
// Shows a loading screen during the initial auth
// check (silent refresh on app mount) to avoid
// a flash-redirect to /login on page reload.
// ─────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={loadingStyles.container}>
                <div style={loadingStyles.spinner} />
                <p style={loadingStyles.text}>Initializing session...</p>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ─────────────────────────────────────────────
// GuestRoute
//
// Redirects authenticated users away from
// login/register pages to the dashboard.
// ─────────────────────────────────────────────
const GuestRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={loadingStyles.container}>
                <div style={loadingStyles.spinner} />
            </div>
        );
    }

    return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// ─────────────────────────────────────────────
// AppRoutes — defined inside AuthProvider so
// ProtectedRoute and GuestRoute can access context
// ─────────────────────────────────────────────
const AppRoutes = () => (
    <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Guest-only routes */}
        <Route
            path="/login"
            element={
                <GuestRoute>
                    <Login />
                </GuestRoute>
            }
        />
        <Route
            path="/register"
            element={
                <GuestRoute>
                    <Register />
                </GuestRoute>
            }
        />

        {/* Protected routes */}
        <Route
            path="/dashboard"
            element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            }
        />

        {/* 404 fallback */}
        <Route
            path="*"
            element={
                <div style={loadingStyles.container}>
                    <h2 style={{ color: '#1a1a2e', margin: '0 0 8px' }}>404 — Page Not Found</h2>
                    <a href="/dashboard" style={{ color: '#4f46e5', fontSize: '14px' }}>
                        Go to Dashboard
                    </a>
                </div>
            }
        />
    </Routes>
);

// ─────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────
const App = () => (
    <BrowserRouter>
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    </BrowserRouter>
);

const loadingStyles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f2f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        gap: '16px',
    },
    spinner: {
        width: '36px',
        height: '36px',
        border: '3px solid #e5e7eb',
        borderTop: '3px solid #4f46e5',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    text: {
        fontSize: '14px',
        color: '#6b7280',
        margin: 0,
    },
};

export default App;
