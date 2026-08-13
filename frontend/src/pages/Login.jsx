

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address.';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Clear field error on change
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }

        // Clear API error on any change
        if (apiError) setApiError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);
        setApiError('');

        try {
            await login(formData.email.trim().toLowerCase(), formData.password);
            navigate('/dashboard', { replace: true });
        } catch (error) {
            const message =
                error.response?.data?.message ||
                'Login failed. Please check your credentials and try again.';
            setApiError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>Task Manager</h1>
                    <p style={styles.subtitle}>Sign in to your account</p>
                </div>

                {/* API Error Banner */}
                {apiError && (
                    <div style={styles.errorBanner} role="alert">
                        <span style={styles.errorIcon}>!</span>
                        <span>{apiError}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate style={styles.form}>
                    {/* Email */}
                    <div style={styles.fieldGroup}>
                        <label htmlFor="email" style={styles.label}>
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            style={{
                                ...styles.input,
                                ...(errors.email ? styles.inputError : {}),
                            }}
                            disabled={isSubmitting}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && (
                            <span id="email-error" style={styles.fieldError} role="alert">
                                {errors.email}
                            </span>
                        )}
                    </div>

                    {/* Password */}
                    <div style={styles.fieldGroup}>
                        <label htmlFor="password" style={styles.label}>
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            style={{
                                ...styles.input,
                                ...(errors.password ? styles.inputError : {}),
                            }}
                            disabled={isSubmitting}
                            aria-describedby={errors.password ? 'password-error' : undefined}
                            aria-invalid={!!errors.password}
                        />
                        {errors.password && (
                            <span id="password-error" style={styles.fieldError} role="alert">
                                {errors.password}
                            </span>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            ...styles.button,
                            ...(isSubmitting ? styles.buttonDisabled : {}),
                        }}
                    >
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Footer */}
                <p style={styles.footer}>
                    Do not have an account?{' '}
                    <Link to="/register" style={styles.link}>
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f2f5',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '28px',
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1a1a2e',
        margin: '0 0 6px 0',
    },
    subtitle: {
        fontSize: '14px',
        color: '#6b7280',
        margin: 0,
    },
    errorBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        color: '#dc2626',
        fontSize: '14px',
    },
    errorIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: '2px solid #dc2626',
        fontSize: '11px',
        fontWeight: '700',
        flexShrink: 0,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        color: '#1a1a2e',
        outline: 'none',
        transition: 'border-color 0.2s',
        backgroundColor: '#fafafa',
    },
    inputError: {
        borderColor: '#dc2626',
        backgroundColor: '#fff5f5',
    },
    fieldError: {
        fontSize: '12px',
        color: '#dc2626',
    },
    button: {
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '4px',
        transition: 'background-color 0.2s',
    },
    buttonDisabled: {
        backgroundColor: '#a5b4fc',
        cursor: 'not-allowed',
    },
    footer: {
        textAlign: 'center',
        marginTop: '24px',
        fontSize: '14px',
        color: '#6b7280',
    },
    link: {
        color: '#4f46e5',
        fontWeight: '600',
        textDecoration: 'none',
    },
};

export default Login;
