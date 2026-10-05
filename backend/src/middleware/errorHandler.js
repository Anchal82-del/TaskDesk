'use strict';

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function toErrorBody(code, message, details = []) {
  return { status: 'error', error: { code, message, details } };
}

// Express recognises an error handler by its 4 parameters - keep all four, even unused ones.
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(toErrorBody(err.code, err.message, err.details));
  }

  // The body was not valid JSON (e.g. a missing comma).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(toErrorBody('INVALID_JSON', 'Request body is not valid JSON.'));
  }

  // A real bug: log everything for us, tell the client nothing sensitive.
  logger.error('Unhandled error', { requestId: req.id, message: err.message, stack: err.stack });
  return res
    .status(500)
    .json(toErrorBody('INTERNAL_ERROR', 'Something went wrong on our side. Please try again.'));
}

module.exports = errorHandler;
