'use strict';

const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const taskRoutes = require('./task.routes');

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'success', data: { up: true } }));
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
