'use strict';

const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { optionalAuthenticate } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', userController.listUsers);
router.post('/', optionalAuthenticate, userController.createUser);
router.post('/bulk', optionalAuthenticate, userController.bulkCreateUsers);
router.get('/upload-logs', optionalAuthenticate, userController.listUploadLogs);
router.get('/:id', userController.getUser);
router.put('/:id', optionalAuthenticate, userController.updateUser);
router.patch('/:id', optionalAuthenticate, userController.updateUser);
router.delete('/:id', optionalAuthenticate, userController.deleteUser);
router.put('/:id/role', optionalAuthenticate, userController.updateUserRole);
router.patch('/:id/role', optionalAuthenticate, userController.updateUserRole);
router.post('/:id/request-access', optionalAuthenticate, userController.requestAccess);
router.post('/request-access', optionalAuthenticate, userController.requestAccess);
router.delete('/:id/request-access', optionalAuthenticate, userController.cancelRequestAccess);

module.exports = router;
