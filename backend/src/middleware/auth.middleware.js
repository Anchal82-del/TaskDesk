'use strict';

const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw AppError.unauthorized('Authentication token is required.');
    }
    const decoded = await authService.verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = await authService.verifyToken(token);
      req.user = decoded;
    } else {
      req.user = null;
    }
    return next();
  } catch (err) {
    // If an invalid token was explicitly sent, report unauthorized
    return next(err);
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate
};
