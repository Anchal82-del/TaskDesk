'use strict';

const taskService = require('../services/task.service');
const { sendSuccess } = require('../utils/response');

// The controller only translates HTTP <-> service calls: read the request, call the
// service, choose the status code. No business rules here. Express 5 forwards errors from
// async functions to the error middleware automatically, so no try/catch is needed.
async function listTasks(req, res) {
  const userId = req.user ? req.user.id : null;
  const tasks = await taskService.getAllTasks(req.query, userId);
  return sendSuccess(res, 200, tasks);
}

async function getTask(req, res) {
  const task = await taskService.getTaskById(req.validated.params.id);
  return sendSuccess(res, 200, task);
}

async function createTask(req, res) {
  const task = await taskService.createTask(req.validated.body);
  res.location(`${req.baseUrl}/${task.id}`);
  return sendSuccess(res, 201, task);
}

async function updateTask(req, res) {
  const task = await taskService.updateTask(req.validated.params.id, req.validated.body);
  return sendSuccess(res, 200, task);
}

async function deleteTask(req, res) {
  await taskService.deleteTask(req.validated.params.id);
  return res.status(204).send();
}

module.exports = { listTasks, getTask, createTask, updateTask, deleteTask };
