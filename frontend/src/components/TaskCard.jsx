// ===== frontend/src/components/TaskCard.jsx =====

import React from 'react';

const STATUS_COLORS = {
    PENDING: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
    IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    COMPLETED: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
};

const TaskCard = ({ task, currentUserRole, onEdit, onDelete }) => {
    const colors = STATUS_COLORS[task.status] || STATUS_COLORS.PENDING;

    return (
        <div style={styles.card}>
            {/* Top row — status badge + date */}
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
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    })}
                </span>
            </div>

            {/* Title */}
            <h3 style={styles.title}>{task.title}</h3>

            {/* Description */}
            {task.description && (
                <p style={styles.description}>{task.description}</p>
            )}

            {/* Admin sees task owner */}
            {currentUserRole === 'ADMIN' && task.user?.email && (
                <p style={styles.owner}>Owner: {task.user.email}</p>
            )}

            {/* Actions */}
            <div style={styles.actions}>
                <button onClick={() => onEdit(task)} style={styles.editBtn}>
                    Edit
                </button>
                <button onClick={() => onDelete(task.id)} style={styles.deleteBtn}>
                    Delete
                </button>
            </div>
        </div>
    );
};

const styles = {
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
    title: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#1a1a2e',
        margin: 0,
        lineHeight: '1.4',
        wordBreak: 'break-word',
    },
    description: {
        fontSize: '13px',
        color: '#6b7280',
        margin: 0,
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    owner: {
        fontSize: '11px',
        color: '#9ca3af',
        margin: 0,
        fontStyle: 'italic',
    },
    actions: {
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
};

export default TaskCard;
