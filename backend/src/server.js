'use strict';

const app = require('./app');
const { env } = require('./config/env');
const logger = require('./utils/logger');

const SHUTDOWN_TIMEOUT_MS = 10000;

const server = app.listen(env.port, () => {
  logger.info(`TaskDesk API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Stop accepting new requests, let running ones finish, then exit.
function shutdown(reason, exitCode) {
  logger.info(`Shutting down: ${reason}`);
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
