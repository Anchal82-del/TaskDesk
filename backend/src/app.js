'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const logger = require('./utils/logger');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

morgan.token('id', (req) => req.id);

app.use(requestId);
app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(
  morgan(':id :method :url :status :response-time ms', {
    stream: { write: (line) => logger.http(line.trim()) }
  })
);
app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      status: 'error',
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, slow down.', details: [] }
    }
  })
);
app.use(express.json({ limit: '10kb' }));

// The versioned URL is the main one; /api/tasks is kept because the project brief lists it.
app.use('/api/v1', routes);
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
