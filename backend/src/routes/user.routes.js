'use strict';

const { Router } = require('express');
const userController = require('../controllers/user.controller');

const router = Router();

router.get('/', userController.listUsers);
router.get('/:id', userController.getUser);

module.exports = router;
