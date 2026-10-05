'use strict';

const app = require('./app');
const { env } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const logger = require('./utils/logger');

const SHUTDOWN_TIMEOUT_MS = 10000;

// Connect to database (with fallback to in-memory if MongoDB is not running)
connectDB();

const server = app.listen(env.port, () => {
  logger.info(`TaskDesk API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  logger.info(`Swagger API Docs: http://localhost:${env.port}/api/docs`);
});

// Stop accepting new requests, let running ones finish, then exit.
async function shutdown(reason, exitCode) {
  logger.info(`Shutting down: ${reason}`);
  try {
    await disconnectDB();
  } catch (err) {
    logger.error('Error disconnecting from database', { error: err.message });
  }
  server.close(() => process.exit(exitCode));
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  shutdown('uncaughtException', 1);
});
