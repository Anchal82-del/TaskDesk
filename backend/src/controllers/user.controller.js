'use strict';

const userRepository = require('../repositories/user.repository');
const { sendSuccess } = require('../utils/response');
const AppError = require('../utils/AppError');

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

module.exports = {
  listUsers,
  getUser
};
