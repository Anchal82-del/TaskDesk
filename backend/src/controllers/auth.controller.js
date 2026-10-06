'use strict';

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

async function login(req, res) {
  const { username, password } = req.validated.body;
  const result = await authService.login(username, password);
  return sendSuccess(res, 200, result);
}

async function getMe(req, res) {
  return sendSuccess(res, 200, req.user);
}

module.exports = {
  login,
  getMe
};
