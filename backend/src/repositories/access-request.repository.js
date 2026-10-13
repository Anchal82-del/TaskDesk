'use strict';

const { isConnected } = require('../config/db');
const AccessRequestModel = require('../models/access-request.model');
const userRepository = require('./user.repository');
const notificationRepository = require('./notification.repository');
const AppError = require('../utils/AppError');

// In-memory fallback state
let accessRequests = [];
let nextId = 1;

function cleanDoc(doc) {
  if (!doc) return null;
  const clone = { ...doc };
  delete clone._id;
  delete clone.__v;
  return clone;
}

async function findAll(filter = {}) {
  if (isConnected()) {
    const query = {};
    if (filter.status) query.status = filter.status;
    if (filter.userId) query.userId = Number(filter.userId);
    const docs = await AccessRequestModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(cleanDoc);
  }

  return structuredClone(accessRequests)
    .filter((r) => {
      if (filter.status && r.status !== filter.status) return false;
      if (filter.userId && r.userId !== Number(filter.userId)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findPending() {
  return findAll({ status: 'pending' });
}

async function findById(id) {
  const numericId = Number(id);
  if (isConnected()) {
    const doc = await AccessRequestModel.findOne({ id: numericId }).lean();
    return cleanDoc(doc);
  }

  const req = accessRequests.find((r) => r.id === numericId);
  return req ? structuredClone(req) : null;
}

async function findPendingByUserId(userId) {
  const numericId = Number(userId);
  if (isConnected()) {
    const doc = await AccessRequestModel.findOne({
      userId: numericId,
      status: 'pending'
    }).lean();
    return cleanDoc(doc);
  }

  const req = accessRequests.find(
    (r) => r.userId === numericId && r.status === 'pending'
  );
  return req ? structuredClone(req) : null;
}

async function findLatestByUserId(userId) {
  const numericId = Number(userId);
  if (isConnected()) {
    const doc = await AccessRequestModel.findOne({ userId: numericId })
      .sort({ createdAt: -1 })
      .lean();
    return cleanDoc(doc);
  }

  const reqs = accessRequests
    .filter((r) => r.userId === numericId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return reqs.length > 0 ? structuredClone(reqs[0]) : null;
}

async function create({ userId, employeeId, requesterName, requesterEmail }) {
  const numericId = Number(userId);

  // Check if target user exists
  const targetUser = await userRepository.findById(numericId);
  if (!targetUser) {
    throw AppError.notFound(`User with id ${userId} was not found.`);
  }

  if (targetUser.role === 'admin' || targetUser.username === 'u541023') {
    throw AppError.badRequest('User already has administrator access.');
  }

  // Prevent duplicate pending requests
  const existingPending = await findPendingByUserId(numericId);
  if (existingPending) {
    return existingPending;
  }

  const now = new Date();
  const requestData = {
    userId: numericId,
    employeeId: employeeId || targetUser.username,
    requesterName: requesterName || targetUser.name,
    requesterEmail: requesterEmail || targetUser.email,
    status: 'pending',
    createdAt: now,
    decidedBy: null,
    decidedAt: null
  };

  let createdReq;
  if (isConnected()) {
    const highest = await AccessRequestModel.findOne().sort({ id: -1 }).select('id').lean();
    const assignedId = highest && typeof highest.id === 'number' ? highest.id + 1 : 1;
    const doc = await AccessRequestModel.create({ ...requestData, id: assignedId });
    await userRepository.setRequestAccess(numericId, true);
    createdReq = cleanDoc(doc.toObject());
  } else {
    const newReq = {
      id: nextId,
      ...requestData
    };
    nextId += 1;
    accessRequests.push(newReq);
    await userRepository.setRequestAccess(numericId, true);
    createdReq = structuredClone(newReq);
  }

  // Persist bell notification addressed to ALL authorized Admins (Super Admin and appointed Admins like Jyoti)
  try {
    const allUsers = await userRepository.findAll();
    const adminRecipients = allUsers.filter(
      (u) => u.role === 'admin' || u.username === 'u541023'
    );
    for (const admin of adminRecipients) {
      await notificationRepository.create({
        userId: admin.id,
        senderId: numericId,
        message: `${targetUser.name} (${targetUser.username}) requested admin access.`,
        type: 'access_request',
        entityId: createdReq.id,
        metadata: {
          requestId: createdReq.id,
          requesterName: targetUser.name,
          employeeId: targetUser.username,
          submittedAt: now
        }
      });
    }

    // Persist confirmation bell notification for the requester (Vivek)
    await notificationRepository.create({
      userId: numericId,
      senderId: numericId,
      message: 'Your admin access request has been submitted for review.',
      type: 'access_request_submitted',
      entityId: createdReq.id,
      metadata: {
        requestId: createdReq.id,
        status: 'pending',
        submittedAt: now
      }
    });
  } catch (err) {
    console.error('Failed to create notifications for access request:', err);
  }

  return createdReq;
}

async function approve(id, decidedBy = 'u541023') {
  const numericId = Number(id);
  const existing = await findById(numericId);
  if (!existing) {
    throw AppError.notFound(`Access request with id ${id} was not found.`);
  }

  if (existing.status !== 'pending') {
    throw AppError.badRequest(`Request #${id} is already ${existing.status}.`);
  }

  const now = new Date();
  let updatedDoc;

  if (isConnected()) {
    const doc = await AccessRequestModel.findOneAndUpdate(
      { id: numericId },
      { status: 'approved', decidedBy, decidedAt: now },
      { new: true, runValidators: true }
    ).lean();
    updatedDoc = cleanDoc(doc);
  } else {
    const req = accessRequests.find((r) => r.id === numericId);
    req.status = 'approved';
    req.decidedBy = decidedBy;
    req.decidedAt = now;
    updatedDoc = structuredClone(req);
  }

  // Promote user to admin
  const updatedUser = await userRepository.updateRole(existing.userId, 'admin');

  // Persist bell notification addressed to the requester
  try {
    const deciderUser = await userRepository.findByUsername(decidedBy);
    const senderId = deciderUser ? deciderUser.id : 1;
    await notificationRepository.create({
      userId: existing.userId,
      senderId,
      message: 'Your admin access request has been approved.',
      type: 'access_request_approved',
      entityId: existing.id,
      metadata: {
        requestId: existing.id,
        status: 'approved',
        decidedBy
      }
    });
  } catch (err) {
    console.error('Failed to create notification for approved requester:', err);
  }

  return { request: updatedDoc, user: updatedUser };
}

async function decline(id, decidedBy = 'u541023') {
  const numericId = Number(id);
  const existing = await findById(numericId);
  if (!existing) {
    throw AppError.notFound(`Access request with id ${id} was not found.`);
  }

  if (existing.status !== 'pending') {
    throw AppError.badRequest(`Request #${id} is already ${existing.status}.`);
  }

  const now = new Date();
  let updatedDoc;

  if (isConnected()) {
    const doc = await AccessRequestModel.findOneAndUpdate(
      { id: numericId },
      { status: 'declined', decidedBy, decidedAt: now },
      { new: true, runValidators: true }
    ).lean();
    updatedDoc = cleanDoc(doc);
  } else {
    const req = accessRequests.find((r) => r.id === numericId);
    req.status = 'declined';
    req.decidedBy = decidedBy;
    req.decidedAt = now;
    updatedDoc = structuredClone(req);
  }

  // Clear accessRequested flag without changing role
  const updatedUser = await userRepository.setRequestAccess(existing.userId, false);

  // Persist bell notification addressed to the requester
  try {
    const deciderUser = await userRepository.findByUsername(decidedBy);
    const senderId = deciderUser ? deciderUser.id : 1;
    await notificationRepository.create({
      userId: existing.userId,
      senderId,
      message: 'Your admin access request was declined.',
      type: 'access_request_declined',
      entityId: existing.id,
      metadata: {
        requestId: existing.id,
        status: 'declined',
        decidedBy
      }
    });
  } catch (err) {
    console.error('Failed to create notification for declined requester:', err);
  }

  return { request: updatedDoc, user: updatedUser };
}

async function cancel(userId, cancelledBy = 'cancelled_by_user') {
  const numericId = Number(userId);
  const pending = await findPendingByUserId(numericId);
  const now = new Date();

  if (pending) {
    if (isConnected()) {
      await AccessRequestModel.findOneAndUpdate(
        { id: pending.id },
        { status: 'declined', decidedBy: cancelledBy, decidedAt: now }
      );
    } else {
      const req = accessRequests.find((r) => r.id === pending.id);
      if (req) {
        req.status = 'declined';
        req.decidedBy = cancelledBy;
        req.decidedAt = now;
      }
    }

    // Persist confirmation bell notification for the requester
    try {
      await notificationRepository.create({
        userId: numericId,
        senderId: numericId,
        message: 'Your admin access request has been cancelled.',
        type: 'access_request_cancelled',
        entityId: pending.id,
        metadata: {
          requestId: pending.id,
          status: 'cancelled',
          cancelledAt: now
        }
      });
    } catch (err) {
      console.error('Failed to create cancellation notification:', err);
    }
  }

  await userRepository.setRequestAccess(numericId, false);
  return pending;
}

async function reset() {
  accessRequests = [];
  nextId = 1;
  await notificationRepository.reset();
  if (isConnected()) {
    await AccessRequestModel.deleteMany({});
  }
}

module.exports = {
  findAll,
  findPending,
  findById,
  findPendingByUserId,
  findLatestByUserId,
  create,
  approve,
  decline,
  cancel,
  reset
};
