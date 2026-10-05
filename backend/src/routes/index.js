'use strict';

const { Router } = require('express');
const taskRoutes = require('./task.routes');

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'success', data: { up: true } }));
router.use('/tasks', taskRoutes);

module.exports = router;
