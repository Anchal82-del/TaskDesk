'use strict';

const { randomUUID } = require('node:crypto');

// Gives every request a unique id (or reuses the one sent by the caller) so a single
// request can be followed through the logs and matched with the response header.
function requestId(req, res, next) {
  req.id = req.get('X-Request-Id') || randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
