'use strict';

const userRepository = require('../repositories/user.repository');
const userUploadLogRepository = require('../repositories/user-upload-log.repository');
const accessRequestRepository = require('../repositories/access-request.repository');
const { sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');

const SUPER_ADMIN_USERNAME = 'u541023';

async function listUsers(_req, res) {
  const users = await userRepository.findAll();
  return sendSuccess(res, 200, users);
}

async function getUser(req, res) {
  const user = await userRepository.findById(req.params.id);
  if (!user) {
    throw AppError.notFound(`User with id ${req.params.id} was not found.`);
  }
  return sendSuccess(res, 200, user);
}

async function updateUserRole(req, res) {
  const targetId = Number(req.params.id);
  const { role } = req.body;

  if (!role || !['admin', 'user'].includes(role)) {
    throw AppError.badRequest('Role must be either "admin" or "user".');
  }

  // Any authorized admin (Super Admin or appointed Admin) can update roles / revoke other admins
  const caller = req.user;
  if (!caller || (caller.role !== 'admin' && caller.username !== SUPER_ADMIN_USERNAME)) {
    throw AppError.forbidden('Only administrators can update user roles.');
  }

  // Super Admin cannot be demoted or modified by anyone
  const targetUser = await userRepository.findById(targetId);
  if (!targetUser) {
    throw AppError.notFound(`User with id ${targetId} was not found.`);
  }
  if (targetUser.username === SUPER_ADMIN_USERNAME && role !== 'admin') {
    throw AppError.forbidden('The Super Admin account cannot be revoked or demoted.');
  }

  // An admin cannot revoke their own administrator access
  if (targetUser.id === caller.id || targetUser.username === caller.username) {
    throw AppError.forbidden('You cannot revoke your own administrator account.');
  }

  const updated = await userRepository.updateRole(targetId, role);

  // If promoted to admin, also resolve any pending access request
  const pending = await accessRequestRepository.findPendingByUserId(targetId);
  if (pending) {
    if (role === 'admin') {
      await accessRequestRepository.approve(pending.id, caller.username);
    } else {
      await accessRequestRepository.decline(pending.id, caller.username);
    }
  } else if (targetUser.role === 'admin' && role === 'user') {
    try {
      const notificationRepository = require('../repositories/notification.repository');
      await notificationRepository.create({
        userId: targetId,
        senderId: caller.id,
        message: 'Your administrator access has been revoked.',
        type: 'admin_access_revoked'
      });
    } catch (err) {
      console.error('Failed to create revoke notification:', err);
    }
  }

  return sendSuccess(res, 200, updated);
}

async function requestAccess(req, res) {
  const userId = req.user ? req.user.id : Number(req.params.id || req.body.userId);
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

  await accessRequestRepository.create({
    userId: user.id,
    employeeId: user.username,
    requesterName: user.name,
    requesterEmail: user.email
  });

  const updated = await userRepository.findById(userId);
  return sendSuccess(res, 200, updated);
}

async function cancelRequestAccess(req, res) {
  const userId = req.user ? req.user.id : Number(req.params.id || req.body.userId);
  if (!userId) {
    throw AppError.badRequest('User ID is required.');
  }

  await accessRequestRepository.cancel(userId);
  const updated = await userRepository.findById(userId);
  return sendSuccess(res, 200, updated || { id: userId, accessRequested: false });
}

async function createUser(req, res) {
  const caller = req.user;
  if (!caller || (caller.role !== 'admin' && caller.username !== SUPER_ADMIN_USERNAME)) {
    throw AppError.forbidden('Only administrators can add users.');
  }

  const { name, username, email, role } = req.body;
  if (!name || !username) {
    throw AppError.badRequest('Name and Employee ID/username are required.');
  }

  const existing = await userRepository.findByUsername(username);
  if (existing) {
    throw AppError.conflict('A user with this employee ID or username already exists.');
  }

  if (email) {
    const existingEmail = await userRepository.findByUsername(email);
    if (existingEmail) {
      throw AppError.conflict('A user with this email address already exists.');
    }
  }

  const user = await userRepository.create({
    name: name.trim(),
    username: username.trim(),
    email: (email || '').trim().toLowerCase(),
    role: role === 'admin' ? 'admin' : 'user'
  });

  return sendSuccess(res, 201, user);
}

async function bulkCreateUsers(req, res) {
  const caller = req.user;
  if (!caller || (caller.role !== 'admin' && caller.username !== SUPER_ADMIN_USERNAME)) {
    throw AppError.forbidden('Only administrators can import users.');
  }

  const { users, fileName = 'users_import.xlsx', fileCount = 1 } = req.body;
  if (!Array.isArray(users) || users.length === 0) {
    throw AppError.badRequest('Users array is required.');
  }

  const result = await userRepository.bulkCreate(users);

  const records = [
    ...(result.created || []).map((u) => ({
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role || 'user',
      status: 'added',
      reason: 'Successfully imported'
    })),
    ...(result.skipped || []).map((s) => ({
      name: s.name || '',
      username: s.username || '',
      email: s.email || '',
      role: s.role || 'user',
      status: 'duplicate',
      reason: s.reason || 'User with this ID or email already exists'
    }))
  ];

  const addedCount = (result.created || []).length;
  const duplicateCount = (result.skipped || []).length;
  const status =
    addedCount === users.length
      ? 'completed'
      : addedCount > 0
        ? 'partial'
        : 'duplicate_only';

  const logEntry = await userUploadLogRepository.createLog({
    uploadedBy: {
      id: caller.id || 1,
      name: caller.name || caller.username || 'Administrator',
      username: caller.username
    },
    fileName: String(fileName || 'users_import.xlsx'),
    fileCount: Number(fileCount) || 1,
    totalRecords: users.length,
    addedCount,
    duplicateCount,
    status,
    records
  });

  return sendSuccess(res, 200, { ...result, log: logEntry });
}

async function listUploadLogs(req, res) {
  const caller = req.user;
  if (!caller || (caller.role !== 'admin' && caller.username !== SUPER_ADMIN_USERNAME)) {
    throw AppError.forbidden('Only administrators can access user upload logs.');
  }

  const logs = await userUploadLogRepository.findAll();
  return sendSuccess(res, 200, logs);
}

async function deleteUser(req, res) {
  const caller = req.user;
  if (!caller || (caller.role !== 'admin' && caller.username !== SUPER_ADMIN_USERNAME)) {
    throw AppError.forbidden('Only administrators can remove users.');
  }

  const targetId = Number(req.params.id);
  const targetUser = await userRepository.findById(targetId);
  if (!targetUser) {
    throw AppError.notFound(`User with id ${targetId} was not found.`);
  }

  if (targetUser.username === SUPER_ADMIN_USERNAME) {
    throw AppError.forbidden('The Super Admin account cannot be removed.');
  }

  if (targetUser.id === caller.id || targetUser.username === caller.username) {
    throw AppError.forbidden('You cannot remove your own account.');
  }

  await userRepository.deleteById(targetId);
  return sendSuccess(res, 200, { message: 'User deleted successfully', user: targetUser });
}

async function updateUser(req, res) {
  const caller = req.user;
  if (!caller || (caller.role !== 'admin' && caller.username !== SUPER_ADMIN_USERNAME)) {
    throw AppError.forbidden('Only administrators can update users.');
  }

  const targetId = Number(req.params.id);
  const targetUser = await userRepository.findById(targetId);
  if (!targetUser) {
    throw AppError.notFound(`User with id ${targetId} was not found.`);
  }

  // Super Admin cannot be edited by admins
  if (targetUser.username === SUPER_ADMIN_USERNAME && caller.username !== SUPER_ADMIN_USERNAME) {
    throw AppError.forbidden('The Super Admin account cannot be edited by administrators.');
  }

  const { name, email, role } = req.body;
  if (!name || !name.trim()) {
    throw AppError.badRequest('User name is required.');
  }

  if (email && email.trim().toLowerCase() !== (targetUser.email || '').toLowerCase()) {
    const existing = await userRepository.findByUsername(email.trim().toLowerCase());
    if (existing && existing.id !== targetId) {
      throw AppError.conflict('A user with this email address already exists.');
    }
  }

  let normalizedRole = targetUser.role;
  if (role) {
    if (targetUser.username === SUPER_ADMIN_USERNAME && role !== 'admin') {
      throw AppError.forbidden('The Super Admin role cannot be changed.');
    }
    normalizedRole = role === 'admin' ? 'admin' : 'user';
  }

  const updated = await userRepository.updateUser(targetId, {
    name: name.trim(),
    email: email ? email.trim().toLowerCase() : targetUser.email,
    role: normalizedRole
  });

  return sendSuccess(res, 200, updated);
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  bulkCreateUsers,
  listUploadLogs,
  deleteUser,
  updateUserRole,
  requestAccess,
  cancelRequestAccess
};
