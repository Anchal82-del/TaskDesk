'use strict';

const accessRequestRepository = require('../repositories/access-request.repository');
const userRepository = require('../repositories/user.repository');
const { sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');

const SUPER_ADMIN_USERNAME = 'u541023';

function isAuthorizedAdmin(user) {
  return Boolean(user && (user.role === 'admin' || user.username === SUPER_ADMIN_USERNAME));
}

function isSuperAdmin(user) {
  return Boolean(user && user.username === SUPER_ADMIN_USERNAME);
}

async function listRequests(req, res) {
  const caller = req.user;
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  // If not authorized admin, users can only list their own requests
  if (!isAuthorizedAdmin(caller)) {
    if (!caller) {
      throw AppError.unauthorized('Authentication required.');
    }
    filter.userId = caller.id;
  }

  const requests = await accessRequestRepository.findAll(filter);
  return sendSuccess(res, 200, requests);
}

async function listPending(req, res) {
  const caller = req.user;
  if (!isAuthorizedAdmin(caller)) {
    throw AppError.forbidden('Only administrators can view pending access requests.');
  }

  const requests = await accessRequestRepository.findPending();
  return sendSuccess(res, 200, requests);
}

async function getMyRequest(req, res) {
  const caller = req.user;
  if (!caller) {
    throw AppError.unauthorized('Authentication required.');
  }

  const latest = await accessRequestRepository.findLatestByUserId(caller.id);
  return sendSuccess(res, 200, latest);
}

async function createRequest(req, res) {
  const caller = req.user;
  const userId = caller ? caller.id : Number(req.body.userId || req.params.id);

  if (!userId) {
    throw AppError.badRequest('User ID is required to request access.');
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw AppError.notFound(`User with id ${userId} was not found.`);
  }

  if (user.role === 'admin' || user.username === SUPER_ADMIN_USERNAME) {
    throw AppError.badRequest('User already has administrator access.');
  }

  const request = await accessRequestRepository.create({
    userId: user.id,
    employeeId: user.username,
    requesterName: user.name,
    requesterEmail: user.email
  });

  return sendSuccess(res, 201, request);
}

async function approveRequest(req, res) {
  const caller = req.user;
  if (!isAuthorizedAdmin(caller)) {
    throw AppError.forbidden('Only administrators can approve access requests.');
  }

  const requestId = Number(req.params.id);
  const result = await accessRequestRepository.approve(requestId, caller.username);
  return sendSuccess(res, 200, result);
}

async function declineRequest(req, res) {
  const caller = req.user;
  if (!isAuthorizedAdmin(caller)) {
    throw AppError.forbidden('Only administrators can decline access requests.');
  }

  const requestId = Number(req.params.id);
  const result = await accessRequestRepository.decline(requestId, caller.username);
  return sendSuccess(res, 200, result);
}

async function cancelRequest(req, res) {
  const caller = req.user;
  const targetParam = req.params.id; // 'my', or numeric id, or undefined
  let targetUserId;

  if (targetParam === 'my' || !targetParam) {
    if (!caller) {
      throw AppError.unauthorized('Authentication required.');
    }
    targetUserId = caller.id;
  } else {
    const num = Number(targetParam);
    if (Number.isNaN(num)) {
      throw AppError.badRequest('Invalid request identifier.');
    }

    const byReq = await accessRequestRepository.findById(num);
    if (byReq) {
      targetUserId = byReq.userId;
    } else {
      targetUserId = num;
    }

    if (!caller) {
      throw AppError.unauthorized('Authentication required.');
    }

    // Permission check: only the requester themselves or an authorized admin can cancel
    if (!isAuthorizedAdmin(caller) && caller.id !== targetUserId) {
      throw AppError.forbidden("You are not authorized to cancel another user's access request.");
    }
  }

  const cancelled = await accessRequestRepository.cancel(
    targetUserId,
    caller ? caller.username : 'user'
  );
  return sendSuccess(res, 200, { cancelled: Boolean(cancelled) });
}

module.exports = {
  listRequests,
  listPending,
  getMyRequest,
  createRequest,
  approveRequest,
  declineRequest,
  cancelRequest
};
