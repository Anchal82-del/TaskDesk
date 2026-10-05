'use strict';

const seedTasks = require('../seed/tasks.seed');
const { isConnected } = require('../config/db');
const TaskModel = require('../models/task.model');

// In-memory fallback state (used when MongoDB is not connected or in unit tests)
let tasks = structuredClone(seedTasks);
let nextId = tasks.length + 1;

function cleanDoc(doc) {
  if (!doc) return null;
  const clone = { ...doc };
  delete clone._id;
  delete clone.__v;
  return clone;
}

function buildMongoFilter(query = {}) {
  const filter = {};
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }
  if (query.priority && query.priority !== 'all') {
    filter.priority = query.priority;
  }
  if (query.projectId && query.projectId !== 'all') {
    const pId = Number(query.projectId);
    if (!Number.isNaN(pId)) {
      filter.projectId = pId;
    }
  }
  if (query.search && typeof query.search === 'string' && query.search.trim()) {
    const s = query.search.trim();
    const asNum = Number(s.replace(/^#/, ''));
    if (!Number.isNaN(asNum)) {
      filter.$or = [
        { id: asNum },
        { title: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } }
      ];
    } else {
      filter.$or = [
        { title: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } }
      ];
    }
  }
  return filter;
}

function filterInMemory(list, query = {}) {
  return list.filter((task) => {
    if (query.status && query.status !== 'all' && task.status !== query.status) return false;
    if (query.priority && query.priority !== 'all' && task.priority !== query.priority) return false;
    if (query.projectId && query.projectId !== 'all' && task.projectId !== Number(query.projectId)) return false;
    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const q = query.search.trim().toLowerCase();
      const numMatch = q.replace(/^#/, '');
      const matchesId = String(task.id) === numMatch;
      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesDesc = (task.description || '').toLowerCase().includes(q);
      if (!matchesId && !matchesTitle && !matchesDesc) return false;
    }
    return true;
  });
}

async function findAll(query = {}) {
  if (isConnected()) {
    const filter = buildMongoFilter(query);
    const docs = await TaskModel.find(filter).sort({ id: 1 }).lean();
    return docs.map(cleanDoc);
  }

  const filtered = filterInMemory(tasks, query);
  return structuredClone(filtered);
}

async function findById(id) {
  const numericId = Number(id);
  if (isConnected()) {
    const doc = await TaskModel.findOne({ id: numericId }).lean();
    return cleanDoc(doc);
  }

  const task = tasks.find((item) => item.id === numericId);
  return task ? structuredClone(task) : null;
}

async function create(input) {
  if (isConnected()) {
    const highest = await TaskModel.findOne().sort({ id: -1 }).select('id').lean();
    const assignedId = highest && typeof highest.id === 'number' ? highest.id + 1 : 1;
    const doc = await TaskModel.create({ ...input, id: assignedId });
    return cleanDoc(doc.toObject());
  }

  const task = { id: nextId, ...input };
  nextId += 1;
  tasks.push(task);
  return structuredClone(task);
}

// PUT = replace the whole task, so calling it twice with the same body gives the same result.
async function replace(id, input) {
  const numericId = Number(id);
  if (isConnected()) {
    const doc = await TaskModel.findOneAndUpdate(
      { id: numericId },
      { ...input, id: numericId },
      { new: true, runValidators: true }
    ).lean();
    return cleanDoc(doc);
  }

  const index = tasks.findIndex((item) => item.id === numericId);
  if (index === -1) return null;
  tasks[index] = { id: numericId, ...input };
  return structuredClone(tasks[index]);
}

async function remove(id) {
  const numericId = Number(id);
  if (isConnected()) {
    const result = await TaskModel.findOneAndDelete({ id: numericId });
    return Boolean(result);
  }

  const before = tasks.length;
  tasks = tasks.filter((item) => item.id !== numericId);
  return tasks.length < before;
}

// Used by tests or reset commands to revert to seed state
async function reset() {
  tasks = structuredClone(seedTasks);
  nextId = tasks.length + 1;

  if (isConnected()) {
    await TaskModel.deleteMany({});
    await TaskModel.insertMany(seedTasks);
  }
}

module.exports = { findAll, findById, create, replace, remove, reset };
