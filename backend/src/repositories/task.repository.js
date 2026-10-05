'use strict';

const seedTasks = require('../seed/tasks.seed');

// The repository is the ONLY file that knows where tasks are stored.
// Today: a plain array in memory (lost when the server restarts).
// Later: replace the bodies of these functions with MongoDB queries - the service and
// controller above it will not need to change. Every function is async for that reason.
let tasks = structuredClone(seedTasks);
let nextId = tasks.length + 1;

async function findAll() {
  return structuredClone(tasks);
}

async function findById(id) {
  const task = tasks.find((item) => item.id === id);
  return task ? structuredClone(task) : null;
}

async function create(input) {
  const task = { id: nextId, ...input };
  nextId += 1;
  tasks.push(task);
  return structuredClone(task);
}

// PUT = replace the whole task, so calling it twice with the same body gives the same result.
async function replace(id, input) {
  const index = tasks.findIndex((item) => item.id === id);
  if (index === -1) return null;
  tasks[index] = { id, ...input };
  return structuredClone(tasks[index]);
}

async function remove(id) {
  const before = tasks.length;
  tasks = tasks.filter((item) => item.id !== id);
  return tasks.length < before;
}

// Used by the tests to start every test from the same data.
function reset() {
  tasks = structuredClone(seedTasks);
  nextId = tasks.length + 1;
}

module.exports = { findAll, findById, create, replace, remove, reset };
