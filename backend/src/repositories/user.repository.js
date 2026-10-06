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
  return clone;
}

async function findAll() {
  if (isConnected()) {
    const docs = await UserModel.find().sort({ id: 1 }).lean();
    return docs.map((doc) => cleanDoc(doc, false));
  }

  return structuredClone(users).map((u) => {
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

async function reset() {
  users = structuredClone(seedUsers);
  nextId = users.length + 1;

  if (isConnected()) {
    await UserModel.deleteMany({});
    await UserModel.insertMany(seedUsers);
  }
}

module.exports = {
  findAll,
  findById,
  findByUsername,
  create,
  reset
};
