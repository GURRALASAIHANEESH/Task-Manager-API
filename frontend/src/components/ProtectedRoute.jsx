// ===== frontend/src/components/ProtectedRoute.jsx =====

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.spinner} />
                <p style={styles.text}>Initializing session...</p>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f2f5',
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
};

export default ProtectedRoute;
