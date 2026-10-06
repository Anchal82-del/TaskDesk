'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.validator');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/login', validate(loginSchema, 'body'), authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
