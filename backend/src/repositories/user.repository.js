'use strict';

const seedUsers = require('../seed/users.seed');
const { isConnected } = require('../config/db');
const UserModel = require('../models/user.model');

// In-memory fallback state
let users = structuredClone(seedUsers);
let nextId = users.length + 1;

function cleanDoc(doc, includePassword = false) {
  if (!doc) return null;
  const clone = { ...doc };
  delete clone._id;
  delete clone.__v;
  if (!includePassword) {
    delete clone.password;
  }
  if (!clone.role) {
    clone.role = clone.username === 'u541023' ? 'admin' : 'user';
  }
  clone.accessRequested = Boolean(clone.accessRequested);
  return clone;
}

const EXCLUDED_USERNAMES = ['u541027', 'u541028'];

function isExcludedUser(user) {
  if (!user) return false;
  const username = String(user.username || '').toLowerCase();
  return EXCLUDED_USERNAMES.includes(username);
}

async function findAll() {
  if (isConnected()) {
    const docs = await UserModel.find().sort({ id: 1 }).lean();
    return docs
      .map((doc) => cleanDoc(doc, false))
      .filter((u) => !isExcludedUser(u));
  }

  return structuredClone(users)
    .filter((u) => !isExcludedUser(u))
    .map((u) => {
      const clone = { ...u };
      delete clone.password;
      return clone;
    });
}

async function findById(id) {
  const numericId = Number(id);
  if (isConnected()) {
    const doc = await UserModel.findOne({ id: numericId }).lean();
    return cleanDoc(doc, false);
  }

  const user = users.find((u) => u.id === numericId);
  return user ? cleanDoc(user, false) : null;
}

async function findByUsername(username) {
  if (!username) return null;
  const normalized = String(username).trim().toLowerCase();

  if (isConnected()) {
    const doc = await UserModel.findOne({
      $or: [{ username: normalized }, { email: normalized }]
    }).lean();
    return cleanDoc(doc, true);
  }

  const user = users.find(
    (u) =>
      u.username.toLowerCase() === normalized ||
      u.email.toLowerCase() === normalized
  );
  return user ? cleanDoc(user, true) : null;
}

async function create(userData) {
  if (isConnected()) {
    const highest = await UserModel.findOne().sort({ id: -1 }).select('id').lean();
    const assignedId = highest && typeof highest.id === 'number' ? highest.id + 1 : 1;
    const doc = await UserModel.create({ ...userData, id: assignedId });
    return cleanDoc(doc.toObject(), false);
  }

  const user = { id: nextId, ...userData };
  nextId += 1;
  users.push(user);
  return cleanDoc(user, false);
}

async function updateRole(id, role) {
  const numericId = Number(id);
  const normalizedRole = role === 'admin' ? 'admin' : 'user';

  // Super Admin account cannot be demoted
  const target = await findById(numericId);
  if (!target) return null;
  if (target.username === 'u541023' && normalizedRole !== 'admin') {
    const AppError = require('../utils/AppError');
    throw AppError.forbidden('The Super Admin account cannot be demoted or modified.');
  }

  const accessRequested = normalizedRole === 'admin' ? false : undefined;

  if (isConnected()) {
    const updateObj = { role: normalizedRole };
    if (accessRequested !== undefined) updateObj.accessRequested = accessRequested;
    const doc = await UserModel.findOneAndUpdate(
      { id: numericId },
      updateObj,
      { new: true, runValidators: true }
    ).lean();
    return cleanDoc(doc, false);
  }

  const user = users.find((u) => u.id === numericId);
  if (!user) return null;
  user.role = normalizedRole;
  if (accessRequested !== undefined) user.accessRequested = accessRequested;
  return cleanDoc(user, false);
}

async function setRequestAccess(id, requested = true) {
  const numericId = Number(id);
  if (isConnected()) {
    const doc = await UserModel.findOneAndUpdate(
      { id: numericId },
      { accessRequested: Boolean(requested) },
      { new: true, runValidators: true }
    ).lean();
    return cleanDoc(doc, false);
  }

  const user = users.find((u) => u.id === numericId);
  if (!user) return null;
  user.accessRequested = Boolean(requested);
  return cleanDoc(user, false);
}

async function updateUser(id, data) {
  const numericId = Number(id);
  const target = await findById(numericId);
  if (!target) return null;

  const updateFields = {};
  if (data.name !== undefined) updateFields.name = data.name.trim();
  if (data.email !== undefined) updateFields.email = (data.email || '').trim().toLowerCase();
  if (data.role !== undefined) updateFields.role = data.role === 'admin' ? 'admin' : 'user';

  if (isConnected()) {
    const doc = await UserModel.findOneAndUpdate(
      { id: numericId },
      updateFields,
      { new: true, runValidators: true }
    ).lean();
    return cleanDoc(doc, false);
  }

  const user = users.find((u) => u.id === numericId);
  if (!user) return null;
  Object.assign(user, updateFields);
  return cleanDoc(user, false);
}

const DEFAULT_PASSWORD_HASH = '$2b$10$QhrXZp0.g/g2rqhWjmURbOeks3zzWDUxAjQdKOsqgirNpR7qM6Iwi';

async function bulkCreate(userList) {
  const created = [];
  const skipped = [];

  for (const item of userList) {
    if (!item.name || !item.username) {
      skipped.push({ ...item, reason: 'Name and Employee ID are required' });
      continue;
    }
    const existing =
      (await findByUsername(item.username)) ||
      (item.email ? await findByUsername(item.email) : null);
    if (existing) {
      skipped.push({ ...item, reason: 'User with this ID or email already exists' });
      continue;
    }
    const newUser = await create({
      name: item.name.trim(),
      username: item.username.trim(),
      email: (item.email || '').trim().toLowerCase(),
      password: DEFAULT_PASSWORD_HASH,
      role: item.role === 'admin' ? 'admin' : 'user'
    });
    created.push(newUser);
  }

  return { created, skipped };
}

async function deleteById(id) {
  const numericId = Number(id);
  const target = await findById(numericId);
  if (!target) return null;
  if (target.username === 'u541023') {
    const AppError = require('../utils/AppError');
    throw AppError.forbidden('The Super Admin account cannot be deleted.');
  }

  if (isConnected()) {
    await UserModel.deleteOne({ id: numericId });
  }

  const idx = users.findIndex((u) => u.id === numericId);
  if (idx !== -1) {
    users.splice(idx, 1);
  }

  return target;
}

async function reset() {
  users = structuredClone(seedUsers);
  nextId = users.length + 1;

  if (isConnected()) {
    await UserModel.deleteMany({});
    await UserModel.insertMany(seedUsers);
  }

  try {
    const accessRequestRepository = require('./access-request.repository');
    await accessRequestRepository.reset();
  } catch {
    /* ignore */
  }
}

module.exports = {
  findAll,
  findById,
  findByUsername,
  create,
  bulkCreate,
  deleteById,
  updateRole,
  updateUser,
  setRequestAccess,
  reset
};
