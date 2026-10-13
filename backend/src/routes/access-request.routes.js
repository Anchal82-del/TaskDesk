'use strict';

const { Router } = require('express');
const accessRequestController = require('../controllers/access-request.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', optionalAuthenticate, accessRequestController.listRequests);
router.get('/pending', authenticate, accessRequestController.listPending);
router.get('/my', authenticate, accessRequestController.getMyRequest);
router.post('/', optionalAuthenticate, accessRequestController.createRequest);
router.post('/:id/approve', authenticate, accessRequestController.approveRequest);
router.post('/:id/decline', authenticate, accessRequestController.declineRequest);
router.delete('/my', authenticate, accessRequestController.cancelRequest);
router.delete('/:id', authenticate, accessRequestController.cancelRequest);

module.exports = router;
