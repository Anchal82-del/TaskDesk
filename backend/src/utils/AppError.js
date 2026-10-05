'use strict';

// An error we expect and know how to describe to the client (wrong input, missing task...).
// Anything that is NOT an AppError is treated as an unexpected bug (HTTP 500).
class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details = []) {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static notFound(message) {
    return new AppError(404, 'NOT_FOUND', message);
  }
}

module.exports = AppError;
