// ===== frontend/src/pages/Dashboard.jsx =====

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI } from '../services/api';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STATUSES = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];

const STATUS_COLORS = {
    PENDING: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
    IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    COMPLETED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
};

const EMPTY_FORM = { title: '', description: '', status: 'PENDING' };

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // ── Task list state ──────────────────────
    const [tasks, setTasks] = useState([]);
    const [meta, setMeta] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');

    // ── Filters / pagination ─────────────────
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const LIMIT = 8;

    // ── Modal state ──────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null); // null = create mode
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [formApiError, setFormApiError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Delete confirm state ─────────────────
    const [deletingId, setDeletingId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Toast notification ───────────────────
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }

    // ─────────────────────────────────────────
    // showToast — auto-dismisses after 3 seconds
    // ─────────────────────────────────────────
    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // ─────────────────────────────────────────
    // fetchTasks
    // ─────────────────────────────────────────
    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setListError('');

        try {
            const params = {
                page,
                limit: LIMIT,
                sortBy: 'createdAt',
                sortOrder: 'desc',
                ...(statusFilter !== 'ALL' && { status: statusFilter }),
                ...(search && { search }),
            };

            const response = await taskAPI.getAll(params);
            setTasks(response.data.data.tasks);
            setMeta(response.data.meta);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/login', { replace: true });
                return;
            }
            setListError(
                error.response?.data?.message || 'Failed to load tasks. Please try again.'
            );
        } finally {
            setIsLoading(false);
        }
    }, [page, statusFilter, search, navigate]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Reset to page 1 when filter or search changes
    useEffect(() => {
        setPage(1);
    }, [statusFilter, search]);

    // ─────────────────────────────────────────
    // Search — debounced via explicit submit
    // ─────────────────────────────────────────
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSearch(searchInput.trim());
    };

    const handleSearchClear = () => {
        setSearchInput('');
        setSearch('');
    };

    // ─────────────────────────────────────────
    // Modal helpers
    // ─────────────────────────────────────────
    const openCreateModal = () => {
        setEditingTask(null);
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setFormApiError('');
        setModalOpen(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            status: task.status,
        });
        setFormErrors({});
        setFormApiError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setModalOpen(false);
        setEditingTask(null);
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setFormApiError('');
    };

    // ─────────────────────────────────────────
    // Form validation
    // ─────────────────────────────────────────
    const validateForm = () => {
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

    // ─────────────────────────────────────────
    // handleFormSubmit — create or update
    // ─────────────────────────────────────────
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setFormApiError('');

        const payload = {
            title: formData.title.trim(),
            description: formData.description.trim() || undefined,
            status: formData.status,
        };

        try {
            if (editingTask) {
                await taskAPI.update(editingTask.id, payload);
                showToast('Task updated successfully.');
            } else {
                await taskAPI.create(payload);
                showToast('Task created successfully.');
            }

            closeModal();
            fetchTasks();
        } catch (error) {
            const serverErrors = error.response?.data?.details;

            if (serverErrors && Array.isArray(serverErrors)) {
                const fieldErrors = {};
                serverErrors.forEach(({ field, message }) => {
                    fieldErrors[field] = message;
                });
                setFormErrors(fieldErrors);
            } else {
                setFormApiError(
                    error.response?.data?.message || 'Operation failed. Please try again.'
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────
    // handleDelete
    // ─────────────────────────────────────────
    const handleDelete = async (taskId) => {
        setIsDeleting(true);
        try {
            await taskAPI.delete(taskId);
            showToast('Task deleted.');
            setDeletingId(null);
            // If last item on page > 1, go back a page
            if (tasks.length === 1 && page > 1) {
                setPage((p) => p - 1);
            } else {
                fetchTasks();
            }
        } catch (error) {
            showToast(
                error.response?.data?.message || 'Failed to delete task.',
                'error'
            );
            setDeletingId(null);
        } finally {
            setIsDeleting(false);
        }
    };

    // ─────────────────────────────────────────
    // handleLogout
    // ─────────────────────────────────────────
    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <div style={styles.page}>

            {/* Toast */}
            {toast && (
                <div style={{
                    ...styles.toast,
                    backgroundColor: toast.type === 'success' ? '#16a34a' : '#dc2626',
                }}>
                    {toast.message}
                </div>
            )}

            {/* Navbar */}
            <header style={styles.navbar}>
                <div style={styles.navBrand}>Task Manager</div>
                <div style={styles.navRight}>
                    <span style={styles.navUser}>
                        {user?.email}
                        <span style={styles.roleBadge}>{user?.role}</span>
                    </span>
                    <button onClick={handleLogout} style={styles.logoutBtn}>
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main content */}
            <main style={styles.main}>

                {/* Page header */}
                <div style={styles.pageHeader}>
                    <div>
                        <h2 style={styles.pageTitle}>
                            {user?.role === 'ADMIN' ? 'All Tasks' : 'My Tasks'}
                        </h2>
                        {meta && (
                            <p style={styles.pageSubtitle}>
                                {meta.total} task{meta.total !== 1 ? 's' : ''} found
                            </p>
                        )}
                    </div>
                    <button onClick={openCreateModal} style={styles.createBtn}>
                        + New Task
                    </button>
                </div>

                {/* Filters */}
                <div style={styles.filterBar}>
                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search tasks..."
                            style={styles.searchInput}
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={handleSearchClear}
                                style={styles.clearBtn}
                            >
                                x
                            </button>
                        )}
                        <button type="submit" style={styles.searchBtn}>
                            Search
                        </button>
                    </form>

                    {/* Status filter tabs */}
                    <div style={styles.statusTabs}>
                        {STATUSES.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                style={{
                                    ...styles.statusTab,
                                    ...(statusFilter === s ? styles.statusTabActive : {}),
                                }}
                            >
                                {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error state */}
                {listError && (
                    <div style={styles.errorBox} role="alert">
                        {listError}
                        <button onClick={fetchTasks} style={styles.retryBtn}>
                            Retry
                        </button>
                    </div>
                )}

                {/* Loading state */}
                {isLoading && (
                    <div style={styles.centerMessage}>Loading tasks...</div>
                )}

                {/* Empty state */}
                {!isLoading && !listError && tasks.length === 0 && (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyTitle}>No tasks found</p>
                        <p style={styles.emptySubtitle}>
                            {search || statusFilter !== 'ALL'
                                ? 'Try adjusting your filters.'
                                : 'Create your first task to get started.'}
                        </p>
                        {!search && statusFilter === 'ALL' && (
                            <button onClick={openCreateModal} style={styles.createBtn}>
                                + Create Task
                            </button>
                        )}
                    </div>
                )}

                {/* Task grid */}
                {!isLoading && tasks.length > 0 && (
                    <div style={styles.taskGrid}>
                        {tasks.map((task) => {
                            const colors = STATUS_COLORS[task.status];
                            return (
                                <div key={task.id} style={styles.taskCard}>
                                    {/* Status badge */}
                                    <div style={styles.cardTop}>
                                        <span style={{
                                            ...styles.statusBadge,
                                            backgroundColor: colors.bg,
                                            color: colors.text,
                                            border: `1px solid ${colors.border}`,
                                        }}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                        <span style={styles.cardDate}>
                                            {new Date(task.createdAt).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </span>
                                    </div>

                                    {/* Task title and description */}
                                    <h3 style={styles.taskTitle}>{task.title}</h3>
                                    {task.description && (
                                        <p style={styles.taskDesc}>{task.description}</p>
                                    )}

                                    {/* Admin sees task owner */}
                                    {user?.role === 'ADMIN' && (
                                        <p style={styles.taskOwner}>
                                            Owner: {task.user?.email}
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div style={styles.cardActions}>
                                        <button
                                            onClick={() => openEditModal(task)}
                                            style={styles.editBtn}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(task.id)}
                                            style={styles.deleteBtn}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div style={styles.pagination}>
                        <button
                            onClick={() => setPage((p) => p - 1)}
                            disabled={!meta.hasPrevPage}
                            style={{
                                ...styles.pageBtn,
                                ...(!meta.hasPrevPage ? styles.pageBtnDisabled : {}),
                            }}
                        >
                            Previous
                        </button>

                        <span style={styles.pageInfo}>
                            Page {meta.page} of {meta.totalPages}
                        </span>

                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!meta.hasNextPage}
                            style={{
                                ...styles.pageBtn,
                                ...(!meta.hasNextPage ? styles.pageBtnDisabled : {}),
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </main>

            {/* Create / Edit Modal */}
            {modalOpen && (
                <div style={styles.modalOverlay} onClick={closeModal}>
                    <div
                        style={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={editingTask ? 'Edit Task' : 'Create Task'}
                    >
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {editingTask ? 'Edit Task' : 'New Task'}
                            </h3>
                            <button onClick={closeModal} style={styles.modalClose}>
                                x
                            </button>
                        </div>

                        {formApiError && (
                            <div style={styles.formError} role="alert">
                                {formApiError}
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} noValidate style={styles.modalForm}>
                            {/* Title */}
                            <div style={styles.fieldGroup}>
                                <label htmlFor="task-title" style={styles.label}>
                                    Title <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    id="task-title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData((p) => ({ ...p, title: e.target.value }));
                                        if (formErrors.title) setFormErrors((p) => ({ ...p, title: '' }));
                                    }}
                                    placeholder="Enter task title"
                                    style={{
                                        ...styles.input,
                                        ...(formErrors.title ? styles.inputError : {}),
                                    }}
                                    disabled={isSubmitting}
                                    maxLength={255}
                                />
                                {formErrors.title && (
                                    <span style={styles.fieldError} role="alert">
                                        {formErrors.title}
                                    </span>
                                )}
                                <span style={styles.charCount}>
                                    {formData.title.length}/255
                                </span>
                            </div>

                            {/* Description */}
                            <div style={styles.fieldGroup}>
                                <label htmlFor="task-desc" style={styles.label}>
                                    Description
                                </label>
                                <textarea
                                    id="task-desc"
                                    value={formData.description}
                                    onChange={(e) => {
                                        setFormData((p) => ({ ...p, description: e.target.value }));
                                        if (formErrors.description)
                                            setFormErrors((p) => ({ ...p, description: '' }));
                                    }}
                                    placeholder="Optional task description"
                                    rows={4}
                                    style={{
                                        ...styles.textarea,
                                        ...(formErrors.description ? styles.inputError : {}),
                                    }}
                                    disabled={isSubmitting}
                                    maxLength={2000}
                                />
                                {formErrors.description && (
                                    <span style={styles.fieldError} role="alert">
                                        {formErrors.description}
                                    </span>
                                )}
                                <span style={styles.charCount}>
                                    {formData.description.length}/2000
                                </span>
                            </div>

                            {/* Status */}
                            <div style={styles.fieldGroup}>
                                <label htmlFor="task-status" style={styles.label}>
                                    Status
                                </label>
                                <select
                                    id="task-status"
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData((p) => ({ ...p, status: e.target.value }))
                                    }
                                    style={styles.select}
                                    disabled={isSubmitting}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    style={styles.cancelBtn}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        ...styles.submitBtn,
                                        ...(isSubmitting ? styles.buttonDisabled : {}),
                                    }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? editingTask ? 'Saving...' : 'Creating...'
                                        : editingTask ? 'Save Changes' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modal, maxWidth: '380px' }}>
                        <h3 style={styles.modalTitle}>Delete Task</h3>
                        <p style={{ color: '#374151', margin: '12px 0 24px', fontSize: '14px' }}>
                            This action cannot be undone. Are you sure you want to delete this task?
                        </p>
                        <div style={styles.modalActions}>
                            <button
                                onClick={() => setDeletingId(null)}
                                style={styles.cancelBtn}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                style={{
                                    ...styles.submitBtn,
                                    backgroundColor: '#dc2626',
                                    ...(isDeleting ? styles.buttonDisabled : {}),
                                }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    toast: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    navbar: {
        backgroundColor: '#1a1a2e',
        padding: '0 32px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    },
    navBrand: {
        color: '#ffffff',
        fontSize: '18px',
        fontWeight: '700',
        letterSpacing: '0.3px',
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    navUser: {
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
    main: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
    },
    pageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
    },
    pageTitle: {
        fontSize: '22px',
        fontWeight: '700',
        color: '#1a1a2e',
        margin: 0,
    },
    pageSubtitle: {
        fontSize: '13px',
        color: '#6b7280',
        margin: '4px 0 0',
    },
    createBtn: {
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        border: 'none',
        padding: '10px 18px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    filterBar: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '24px',
    },
    searchForm: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flex: '1',
        minWidth: '260px',
        maxWidth: '400px',
    },
    searchInput: {
        flex: 1,
        padding: '8px 12px',
        borderRadius: '7px',
        border: '1px solid #d1d5db',
        fontSize: '13px',
        backgroundColor: '#fff',
        outline: 'none',
    },
    clearBtn: {
        background: 'none',
        border: 'none',
        color: '#9ca3af',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '0 4px',
    },
    searchBtn: {
        backgroundColor: '#4f46e5',
        color: '#fff',
        border: 'none',
        padding: '8px 14px',
        borderRadius: '7px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    statusTabs: {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
    },
    statusTab: {
        padding: '7px 14px',
        borderRadius: '999px',
        border: '1px solid #d1d5db',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    statusTabActive: {
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        borderColor: '#4f46e5',
    },
    errorBox: {
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '14px 18px',
        color: '#dc2626',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    retryBtn: {
        backgroundColor: '#dc2626',
        color: '#fff',
        border: 'none',
        padding: '6px 14px',
        borderRadius: '6px',
        fontSize: '12px',
        cursor: 'pointer',
    },
    centerMessage: {
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px',
        padding: '48px 0',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px dashed #d1d5db',
    },
    emptyTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#374151',
        margin: '0 0 6px',
    },
    emptySubtitle: {
        fontSize: '13px',
        color: '#9ca3af',
        margin: '0 0 20px',
    },
    taskGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
    },
    taskCard: {
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    cardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        fontSize: '11px',
        fontWeight: '600',
        padding: '3px 10px',
        borderRadius: '999px',
        letterSpacing: '0.3px',
    },
    cardDate: {
        fontSize: '11px',
        color: '#9ca3af',
    },
    taskTitle: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1a1a2e',
        margin: 0,
        lineHeight: '1.4',
        wordBreak: 'break-word',
    },
    taskDesc: {
        fontSize: '13px',
        color: '#6b7280',
        margin: 0,
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    taskOwner: {
        fontSize: '11px',
        color: '#9ca3af',
        margin: 0,
        fontStyle: 'italic',
    },
    cardActions: {
        display: 'flex',
        gap: '8px',
        marginTop: 'auto',
        paddingTop: '8px',
        borderTop: '1px solid #f3f4f6',
    },
    editBtn: {
        flex: 1,
        padding: '7px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    deleteBtn: {
        flex: 1,
        padding: '7px',
        borderRadius: '6px',
        border: '1px solid #fecaca',
        backgroundColor: '#fff5f5',
        color: '#dc2626',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
    },
    pageBtn: {
        padding: '8px 18px',
        borderRadius: '7px',
        border: '1px solid #d1d5db',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
    },
    pageBtnDisabled: {
        opacity: 0.4,
        cursor: 'not-allowed',
    },
    pageInfo: {
        fontSize: '13px',
        color: '#6b7280',
        fontWeight: '500',
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modal: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '28px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1a1a2e',
        margin: 0,
    },
    modalClose: {
        background: 'none',
        border: 'none',
        fontSize: '18px',
        color: '#9ca3af',
        cursor: 'pointer',
        padding: '0 4px',
        lineHeight: 1,
    },
    formError: {
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '7px',
        padding: '10px 14px',
        color: '#dc2626',
        fontSize: '13px',
        marginBottom: '16px',
    },
    modalForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
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
    modalActions: {
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
    buttonDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
};

export default Dashboard;
