'use strict';

require('dotenv').config();

const toList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// The only place that reads process.env - everything else imports this object.
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigins: toList(process.env.CORS_ORIGINS || 'http://localhost:4200'),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 300
};

module.exports = { env };
