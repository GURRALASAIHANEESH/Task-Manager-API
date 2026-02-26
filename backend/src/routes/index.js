// ===== backend/src/routes/index.js =====

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');

// ─────────────────────────────────────────────
// API Health Check
// Lightweight endpoint for load balancer / uptime
// monitoring. Does not touch the database.
// ─────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running.',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || 'v1',
    });
});

// ─────────────────────────────────────────────
// Route mounting
// All routes are versioned under /api/v1/
// Versioning is handled in app.js:
//   app.use('/api/v1', router)
// ─────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
