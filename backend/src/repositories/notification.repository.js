'use strict';

const { isConnected } = require('../config/db');
const NotificationModel = require('../models/notification.model');

// In-memory fallback state
let notifications = [];
let nextId = 1;

function cleanDoc(doc) {
  if (!doc) return null;
  const clone = { ...doc };
  delete clone._id;
  delete clone.__v;
  return clone;
}

async function findAllByUserId(userId) {
  const numericUserId = Number(userId);
  if (isConnected()) {
    const docs = await NotificationModel.find({ userId: numericUserId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(cleanDoc);
  }

  return structuredClone(notifications)
    .filter((n) => n.userId === numericUserId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findById(id) {
  const numericId = Number(id);
  if (isConnected()) {
    const doc = await NotificationModel.findOne({ id: numericId }).lean();
    return cleanDoc(doc);
  }

  const found = notifications.find((n) => n.id === numericId);
  return found ? structuredClone(found) : null;
}

async function create({ userId, senderId = null, message, type = 'access_request', entityId = null, metadata = {} }) {
  const numericUserId = Number(userId);
  const now = new Date();

  const data = {
    userId: numericUserId,
    senderId: senderId !== null && senderId !== undefined ? Number(senderId) : null,
    message: String(message).trim(),
    type,
    entityId: entityId !== null && entityId !== undefined ? Number(entityId) : null,
    metadata: metadata || {},
    read: false,
    createdAt: now,
    updatedAt: now
  };

  if (isConnected()) {
    const highest = await NotificationModel.findOne().sort({ id: -1 }).select('id').lean();
    const assignedId = highest && typeof highest.id === 'number' ? highest.id + 1 : 1;
    const doc = await NotificationModel.create({ ...data, id: assignedId });
    return cleanDoc(doc.toObject());
  }

  const assignedId = nextId++;
  const newNotif = {
    id: assignedId,
    ...data
  };
  notifications.push(newNotif);
  return structuredClone(newNotif);
}

async function markAsRead(id, userId) {
  const numericId = Number(id);
  const numericUserId = Number(userId);
  const now = new Date();

  if (isConnected()) {
    const doc = await NotificationModel.findOneAndUpdate(
      { id: numericId, userId: numericUserId },
      { read: true, updatedAt: now },
      { new: true }
    ).lean();
    return cleanDoc(doc);
  }

  const target = notifications.find((n) => n.id === numericId && n.userId === numericUserId);
  if (target) {
    target.read = true;
    target.updatedAt = now;
    return structuredClone(target);
  }
  return null;
}

async function markAllAsRead(userId) {
  const numericUserId = Number(userId);
  const now = new Date();

  if (isConnected()) {
    await NotificationModel.updateMany(
      { userId: numericUserId, read: false },
      { read: true, updatedAt: now }
    );
    return true;
  }

  notifications.forEach((n) => {
    if (n.userId === numericUserId) {
      n.read = true;
      n.updatedAt = now;
    }
  });
  return true;
}

async function clearAll(userId) {
  const numericUserId = Number(userId);

  if (isConnected()) {
    await NotificationModel.deleteMany({ userId: numericUserId });
    return true;
  }

  notifications = notifications.filter((n) => n.userId !== numericUserId);
  return true;
}

async function reset() {
  notifications = [];
  nextId = 1;
  if (isConnected()) {
    await NotificationModel.deleteMany({});
  }
}

module.exports = {
  findAllByUserId,
  findById,
  create,
  markAsRead,
  markAllAsRead,
  clearAll,
  reset
};
