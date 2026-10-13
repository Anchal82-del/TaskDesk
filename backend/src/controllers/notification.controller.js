'use strict';

const notificationRepository = require('../repositories/notification.repository');
const { sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');

async function listNotifications(req, res) {
  const userId = req.user.id;
  const items = await notificationRepository.findAllByUserId(userId);
  return sendSuccess(res, 200, items);
}

async function markAsRead(req, res) {
  const userId = req.user.id;
  const notifId = Number(req.params.id);
  const updated = await notificationRepository.markAsRead(notifId, userId);
  if (!updated) {
    throw AppError.notFound(`Notification #${notifId} was not found.`);
  }
  return sendSuccess(res, 200, updated);
}

async function markAllAsRead(req, res) {
  const userId = req.user.id;
  await notificationRepository.markAllAsRead(userId);
  return sendSuccess(res, 200, { success: true });
}

async function clearAll(req, res) {
  const userId = req.user.id;
  await notificationRepository.clearAll(userId);
  return sendSuccess(res, 200, { success: true });
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  clearAll
};
