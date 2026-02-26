// ===== frontend/src/components/Navbar.jsx =====

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <header style={styles.navbar}>
            <div style={styles.brand}>Task Manager</div>
            <div style={styles.right}>
                {user && (
                    <>
                        <span style={styles.userInfo}>
                            {user.email}
                            <span style={styles.roleBadge}>{user.role}</span>
                        </span>
                        <button onClick={handleLogout} style={styles.logoutBtn}>
                            Sign Out
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};

const styles = {
    navbar: {
        backgroundColor: '#1a1a2e',
        padding: '0 32px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    brand: {
        color: '#ffffff',
        fontSize: '18px',
        fontWeight: '700',
        letterSpacing: '0.3px',
    },
    right: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    userInfo: {
        color: '#d1d5db',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    roleBadge: {
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        fontSize: '10px',
        fontWeight: '700',
        padding: '2px 7px',
        borderRadius: '999px',
        letterSpacing: '0.5px',
    },
    logoutBtn: {
        backgroundColor: 'transparent',
        border: '1px solid #4b5563',
        color: '#d1d5db',
        padding: '6px 14px',
        borderRadius: '6px',
        fontSize: '13px',
        cursor: 'pointer',
    },
};

export default Navbar;
