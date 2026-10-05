'use strict';

// Every successful response has the same shape: { status: 'success', data }.
function sendSuccess(res, statusCode, data) {
  return res.status(statusCode).json({ status: 'success', data });
}

module.exports = { sendSuccess };
