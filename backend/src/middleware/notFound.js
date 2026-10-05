'use strict';

const AppError = require('../utils/AppError');

// Runs only when no route matched the URL.
function notFound(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
