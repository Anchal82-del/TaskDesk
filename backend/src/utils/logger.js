'use strict';

const winston = require('winston');
const { env } = require('../config/env');

const { combine, timestamp, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ timestamp: time, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${time} ${level}: ${message}${extra}`;
  })
);

// Structured JSON in production (easy to search), readable lines while developing.
const logger = winston.createLogger({
  level: env.logLevel,
  format: env.nodeEnv === 'production' ? combine(timestamp(), json()) : devFormat,
  transports: [new winston.transports.Console()]
});

module.exports = logger;
