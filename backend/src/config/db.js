'use strict';

const dns = require('dns');
const mongoose = require('mongoose');
const { env } = require('./env');
const logger = require('../utils/logger');
const seedTasks = require('../seed/tasks.seed');
const seedUsers = require('../seed/users.seed');

let isDbConnected = false;

// Resilient DNS lookup: Some local WiFi/hotspot routers fail on Atlas's chained CNAME records (EAI_AGAIN).
// This falls back to public DNS resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1) to ensure Atlas resolves.
const publicResolver = new dns.promises.Resolver();
publicResolver.setServers(['8.8.8.8', '1.1.1.1']);

function resilientLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  dns.lookup(hostname, options, (err, address, family) => {
    if (!err && address) {
      return callback(null, address, family);
    }

    // If local DNS fails (e.g. EAI_AGAIN on Atlas CNAMEs), fallback to public DNS
    publicResolver
      .resolve4(hostname)
      .then((addresses) => {
        if (!addresses || addresses.length === 0) {
          return callback(err);
        }
        if (options && options.all) {
          return callback(
            null,
            addresses.map((a) => ({ address: a, family: 4 }))
          );
        }
        return callback(null, addresses[0], 4);
      })
      .catch(() => {
        callback(err);
      });
  });
}

async function seedDatabaseIfEmpty(TaskModel, UserModel) {
  try {
    const taskCount = await TaskModel.countDocuments();
    if (taskCount === 0) {
      logger.info('MongoDB tasks collection is empty. Seeding initial tasks...');
      await TaskModel.insertMany(seedTasks);
      logger.info(`Successfully seeded ${seedTasks.length} tasks into MongoDB.`);
    }

    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      logger.info('MongoDB users collection is empty. Seeding initial users...');
      await UserModel.insertMany(seedUsers);
      logger.info(`Successfully seeded ${seedUsers.length} users into MongoDB.`);
    } else {
      // Ensure existing users have role and accessRequested populated
      await UserModel.updateOne(
        { username: 'u541023', role: { $exists: false } },
        { $set: { role: 'admin', accessRequested: false } }
      );
      await UserModel.updateMany(
        { username: { $ne: 'u541023' }, role: { $exists: false } },
        { $set: { role: 'user', accessRequested: false } }
      );
    }
  } catch (error) {
    logger.error('Failed to seed MongoDB collection', { error: error.message });
  }
}

async function connectDB() {
  if (isDbConnected && mongoose.connection.readyState === 1) {
    return;
  }

  // Explicit opt-out for in-memory mode
  if (!env.mongoUri || env.mongoUri === 'memory' || env.mongoUri === 'none') {
    isDbConnected = false;
    logger.info('Running with in-memory persistence mode (MongoDB disabled).');
    return;
  }

  try {
    logger.info(`Connecting to MongoDB at ${env.mongoUri}...`);
    await mongoose.connect(env.mongoUri, {
      lookup: resilientLookup,
      serverSelectionTimeoutMS: 5000
    });
    isDbConnected = true;
    logger.info(`Connected to MongoDB successfully (${env.mongoUri})`);

    // Dynamically require models and seed if empty
    const TaskModel = require('../models/task.model');
    const UserModel = require('../models/user.model');
    await seedDatabaseIfEmpty(TaskModel, UserModel);
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
