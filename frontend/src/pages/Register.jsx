// ===== frontend/src/pages/Register.jsx =====

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PASSWORD_RULES = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /\d/.test(p) },
    { label: 'One special character', test: (p) => /[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPasswordRules, setShowPasswordRules] = useState(false);

    // ─────────────────────────────────────────
    // Client-side validation
    // ─────────────────────────────────────────
    const validate = () => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address.';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required.';
        } else {
            const failedRules = PASSWORD_RULES.filter((r) => !r.test(formData.password));
            if (failedRules.length > 0) {
                newErrors.password = failedRules[0].label + ' is required.';
            }
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password.';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
        if (apiError) setApiError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);
        setApiError('');

        try {
            await register(
                formData.email.trim().toLowerCase(),
                formData.password,
                formData.confirmPassword
            );
            navigate('/dashboard', { replace: true });
        } catch (error) {
            const serverErrors = error.response?.data?.details;

            if (serverErrors && Array.isArray(serverErrors)) {
                // Map server field errors back to form fields
                const fieldErrors = {};
                serverErrors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                setErrors(fieldErrors);
            } else {
                setApiError(
                    error.response?.data?.message ||
                    'Registration failed. Please try again.'
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Password strength meter (0–5)
    const passwordStrength = PASSWORD_RULES.filter((r) => r.test(formData.password)).length;

    const getStrengthLabel = () => {
        if (passwordStrength <= 1) return { label: 'Very Weak', color: '#ef4444' };
        if (passwordStrength === 2) return { label: 'Weak', color: '#f97316' };
        if (passwordStrength === 3) return { label: 'Fair', color: '#eab308' };
        if (passwordStrength === 4) return { label: 'Good', color: '#22c55e' };
        return { label: 'Strong', color: '#16a34a' };
    };

    const strength = getStrengthLabel();

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>Task Manager</h1>
                    <p style={styles.subtitle}>Create your account</p>
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
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && (
                            <span style={styles.fieldError} role="alert">
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
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            onFocus={() => setShowPasswordRules(true)}
                            placeholder="Create a strong password"
                            style={{
                                ...styles.input,
                                ...(errors.password ? styles.inputError : {}),
                            }}
                            disabled={isSubmitting}
                            aria-invalid={!!errors.password}
                        />
                        {errors.password && (
                            <span style={styles.fieldError} role="alert">
                                {errors.password}
                            </span>
                        )}

                        {/* Password strength meter */}
                        {formData.password && (
                            <div style={styles.strengthContainer}>
                                <div style={styles.strengthBarTrack}>
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            style={{
                                                ...styles.strengthBarSegment,
                                                backgroundColor:
                                                    level <= passwordStrength ? strength.color : '#e5e7eb',
                                            }}
                                        />
                                    ))}
                                </div>
                                <span style={{ ...styles.strengthLabel, color: strength.color }}>
                                    {strength.label}
                                </span>
                            </div>
                        )}

                        {/* Password rules checklist */}
                        {showPasswordRules && (
                            <ul style={styles.rulesList}>
                                {PASSWORD_RULES.map((rule) => {
                                    const passed = rule.test(formData.password);
                                    return (
                                        <li
                                            key={rule.label}
                                            style={{
                                                ...styles.ruleItem,
                                                color: passed ? '#16a34a' : '#6b7280',
                                            }}
                                        >
                                            <span style={styles.ruleIcon}>{passed ? '✓' : '○'}</span>
                                            {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div style={styles.fieldGroup}>
                        <label htmlFor="confirmPassword" style={styles.label}>
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Repeat your password"
                            style={{
                                ...styles.input,
                                ...(errors.confirmPassword ? styles.inputError : {}),
                                ...(formData.confirmPassword &&
                                    formData.confirmPassword === formData.password
                                    ? styles.inputSuccess
                                    : {}),
                            }}
                            disabled={isSubmitting}
                            aria-invalid={!!errors.confirmPassword}
                        />
                        {errors.confirmPassword && (
                            <span style={styles.fieldError} role="alert">
                                {errors.confirmPassword}
                            </span>
                        )}
                        {formData.confirmPassword &&
                            formData.confirmPassword === formData.password && (
                                <span style={styles.fieldSuccess}>Passwords match.</span>
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
                        {isSubmitting ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                {/* Footer */}
                <p style={styles.footer}>
                    Already have an account?{' '}
                    <Link to="/login" style={styles.link}>
                        Sign in
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
        maxWidth: '440px',
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
        backgroundColor: '#fafafa',
        transition: 'border-color 0.2s',
    },
    inputError: {
        borderColor: '#dc2626',
        backgroundColor: '#fff5f5',
    },
    inputSuccess: {
        borderColor: '#16a34a',
        backgroundColor: '#f0fdf4',
    },
    fieldError: {
        fontSize: '12px',
        color: '#dc2626',
    },
    fieldSuccess: {
        fontSize: '12px',
        color: '#16a34a',
    },
    strengthContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '6px',
    },
    strengthBarTrack: {
        display: 'flex',
        gap: '4px',
        flex: 1,
    },
    strengthBarSegment: {
        height: '4px',
        flex: 1,
        borderRadius: '2px',
        transition: 'background-color 0.3s',
    },
    strengthLabel: {
        fontSize: '12px',
        fontWeight: '600',
        minWidth: '60px',
        textAlign: 'right',
    },
    rulesList: {
        listStyle: 'none',
        margin: '6px 0 0 0',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    ruleItem: {
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    ruleIcon: {
        fontSize: '11px',
        fontWeight: '700',
        width: '14px',
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

export default Register;
