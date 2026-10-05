'use strict';

const mongoose = require('mongoose');
const { env } = require('./env');
const logger = require('../utils/logger');
const seedTasks = require('../seed/tasks.seed');

let isDbConnected = false;

async function seedDatabaseIfEmpty(TaskModel) {
  try {
    const count = await TaskModel.countDocuments();
    if (count === 0) {
      logger.info('MongoDB tasks collection is empty. Seeding initial tasks...');
      await TaskModel.insertMany(seedTasks);
      logger.info(`Successfully seeded ${seedTasks.length} tasks into MongoDB.`);
    }
  } catch (error) {
    logger.error('Failed to seed MongoDB tasks collection', { error: error.message });
  }
}

async function connectDB() {
  if (isDbConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    logger.info(`Connecting to MongoDB at ${env.mongoUri}...`);
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000
    });
    isDbConnected = true;
    logger.info(`Connected to MongoDB successfully (${env.mongoUri})`);

    // Dynamically require Task model and seed if empty
    const TaskModel = require('../models/task.model');
    await seedDatabaseIfEmpty(TaskModel);
  } catch (err) {
    isDbConnected = false;
    logger.warn(
      `MongoDB connection failed (${err.message}). ` +
        'Running with in-memory persistence fallback so your server starts without crashing. ' +
        'To persist data to MongoDB: install MongoDB locally or configure a free ' +
        'MongoDB Atlas connection string in backend/.env.'
    );
  }
}

function isConnected() {
  return isDbConnected && mongoose.connection.readyState === 1;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isDbConnected = false;
    logger.info('MongoDB connection closed.');
  }
}

module.exports = { connectDB, isConnected, disconnectDB, mongoose };
