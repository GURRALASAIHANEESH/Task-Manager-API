// ===== frontend/src/components/TaskForm.jsx =====

import React, { useState, useEffect } from 'react';

const EMPTY_FORM = { title: '', description: '', status: 'PENDING' };

const TaskForm = ({ task, onSubmit, onCancel, isSubmitting }) => {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});

    // Populate form when editing an existing task
    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'PENDING',
            });
        } else {
            setFormData(EMPTY_FORM);
        }
    }, [task]);

    const validate = () => {
        const errs = {};

        if (!formData.title.trim()) {
            errs.title = 'Title is required.';
        } else if (formData.title.trim().length < 3) {
            errs.title = 'Title must be at least 3 characters.';
        } else if (formData.title.trim().length > 255) {
            errs.title = 'Title must not exceed 255 characters.';
        }

        if (formData.description && formData.description.length > 2000) {
            errs.description = 'Description must not exceed 2000 characters.';
        }

        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        onSubmit({
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            status: formData.status,
        });
    };

    return (
        <form onSubmit={handleSubmit} noValidate style={styles.form}>
            {/* Title */}
            <div style={styles.fieldGroup}>
                <label htmlFor="tf-title" style={styles.label}>
                    Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                    id="tf-title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter task title"
                    maxLength={255}
                    disabled={isSubmitting}
                    style={{
                        ...styles.input,
                        ...(formErrors.title ? styles.inputError : {}),
                    }}
                />
                {formErrors.title && (
                    <span style={styles.fieldError} role="alert">
                        {formErrors.title}
                    </span>
                )}
                <span style={styles.charCount}>{formData.title.length}/255</span>
            </div>

            {/* Description */}
            <div style={styles.fieldGroup}>
                <label htmlFor="tf-desc" style={styles.label}>
                    Description
                </label>
                <textarea
                    id="tf-desc"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional task description"
                    rows={4}
                    maxLength={2000}
                    disabled={isSubmitting}
                    style={{
                        ...styles.textarea,
                        ...(formErrors.description ? styles.inputError : {}),
                    }}
                />
                {formErrors.description && (
                    <span style={styles.fieldError} role="alert">
                        {formErrors.description}
                    </span>
                )}
                <span style={styles.charCount}>{formData.description.length}/2000</span>
            </div>

            {/* Status */}
            <div style={styles.fieldGroup}>
                <label htmlFor="tf-status" style={styles.label}>
                    Status
                </label>
                <select
                    id="tf-status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    style={styles.select}
                >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>

            {/* Actions */}
            <div style={styles.actions}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    style={styles.cancelBtn}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        ...styles.submitBtn,
                        ...(isSubmitting ? styles.disabledBtn : {}),
                    }}
                >
                    {isSubmitting
                        ? task ? 'Saving...' : 'Creating...'
                        : task ? 'Save Changes' : 'Create Task'}
                </button>
            </div>
        </form>
    );
};

const styles = {
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        padding: '9px 12px',
        borderRadius: '7px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        color: '#1a1a2e',
        backgroundColor: '#fafafa',
        outline: 'none',
    },
    inputError: {
        borderColor: '#dc2626',
        backgroundColor: '#fff5f5',
    },
    textarea: {
        padding: '9px 12px',
        borderRadius: '7px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        color: '#1a1a2e',
        backgroundColor: '#fafafa',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
    },
    select: {
        padding: '9px 12px',
        borderRadius: '7px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        color: '#1a1a2e',
        backgroundColor: '#fafafa',
        outline: 'none',
        cursor: 'pointer',
    },
    charCount: {
        fontSize: '11px',
        color: '#9ca3af',
        textAlign: 'right',
    },
    fieldError: {
        fontSize: '12px',
        color: '#dc2626',
    },
    actions: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '4px',
    },
    cancelBtn: {
        padding: '9px 18px',
        borderRadius: '7px',
        border: '1px solid #d1d5db',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    submitBtn: {
        padding: '9px 18px',
        borderRadius: '7px',
        border: 'none',
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    disabledBtn: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
};

export default TaskForm;
