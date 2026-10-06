'use strict';

const taskRepository = require('../repositories/task.repository');
const AppError = require('../utils/AppError');

// The service holds the business rules (e.g. "a missing task is a 404").
// It knows nothing about HTTP requests or responses - that is the controller's job.
const notFound = (id) => AppError.notFound(`Task with id ${id} was not found.`);

async function getAllTasks(query = {}, userId = null) {
  return taskRepository.findAll(query, userId);
}

async function getTaskById(id) {
  const task = await taskRepository.findById(id);
  if (!task) throw notFound(id);
  return task;
}

async function createTask(input) {
  return taskRepository.create(input);
}

async function updateTask(id, input) {
  const task = await taskRepository.replace(id, input);
  if (!task) throw notFound(id);
  return task;
}

async function deleteTask(id) {
  const wasDeleted = await taskRepository.remove(id);
  if (!wasDeleted) throw notFound(id);
}

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
