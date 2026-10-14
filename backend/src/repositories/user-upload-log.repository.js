'use strict';

const { isConnected } = require('../config/db');
const UserUploadLogModel = require('../models/user-upload-log.model');

const initialSeedLogs = [
  {
    id: 1,
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    uploadedBy: {
      id: 1,
      name: 'Tarun Jaiswal',
      username: 'u541023'
    },
    fileName: 'TaskDesk_Team_Directory_Batch_1.xlsx',
    fileCount: 1,
    totalRecords: 5,
    addedCount: 4,
    duplicateCount: 1,
    status: 'partial',
    records: [
      {
        name: 'Vivek Sharma',
        username: 'u541024',
        email: 'vivek.sharma@taskdesk.dev',
        role: 'user',
        status: 'added',
        reason: 'Successfully imported'
      },
      {
        name: 'Jyoti Singh',
        username: 'u454880',
        email: 'jyoti.singh@taskdesk.dev',
        role: 'admin',
        status: 'added',
        reason: 'Successfully imported'
      },
      {
        name: 'Adarsh Kumar',
        username: 'u507154',
        email: 'adarsh.kumar@taskdesk.dev',
        role: 'user',
        status: 'added',
        reason: 'Successfully imported'
      },
      {
        name: 'Sara Khan',
        username: 'u541099',
        email: 'sara.khan@taskdesk.dev',
        role: 'user',
        status: 'added',
        reason: 'Successfully imported'
      },
      {
        name: 'Tarun Jaiswal',
        username: 'u541023',
        email: 'tarun.jaiswal@taskdesk.dev',
        role: 'admin',
        status: 'duplicate',
        reason: 'User with ID u541023 already exists'
      }
    ]
  }
];

let uploadLogs = structuredClone(initialSeedLogs);
let nextLogId = uploadLogs.length + 1;

function cleanDoc(doc) {
  if (!doc) return null;
  const clone = { ...doc };
  delete clone._id;
  delete clone.__v;
  return clone;
}

async function findAll() {
  if (isConnected()) {
    const docs = await UserUploadLogModel.find().sort({ uploadedAt: -1 }).lean();
    return docs.map(cleanDoc);
  }

  return structuredClone(uploadLogs).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

async function findById(id) {
  const numericId = Number(id);
  if (isConnected()) {
    const doc = await UserUploadLogModel.findOne({ id: numericId }).lean();
    return cleanDoc(doc);
  }

  const found = uploadLogs.find((l) => l.id === numericId);
  return found ? structuredClone(found) : null;
}

async function createLog(data) {
  const numericId = nextLogId++;
  const uploadedAt = data.uploadedAt ? new Date(data.uploadedAt) : new Date();

  const newLog = {
    id: numericId,
    uploadedAt: uploadedAt.toISOString(),
    uploadedBy: {
      id: Number(data.uploadedBy?.id || 1),
      name: String(data.uploadedBy?.name || 'Administrator'),
      username: String(data.uploadedBy?.username || 'admin')
    },
    fileName: String(data.fileName || 'bulk_users_import.xlsx'),
    fileCount: Number(data.fileCount) || 1,
    totalRecords: Number(data.totalRecords || 0),
    addedCount: Number(data.addedCount || 0),
    duplicateCount: Number(data.duplicateCount || 0),
    status: data.status || 'completed',
    records: Array.isArray(data.records) ? data.records : []
  };

  if (isConnected()) {
    const created = await UserUploadLogModel.create({
      ...newLog,
      uploadedAt
    });
    return cleanDoc(created.toObject());
  }

  uploadLogs.unshift(newLog);
  return structuredClone(newLog);
}

async function reset() {
  uploadLogs = structuredClone(initialSeedLogs);
  nextLogId = uploadLogs.length + 1;

  if (isConnected()) {
    await UserUploadLogModel.deleteMany({});
    for (const log of initialSeedLogs) {
      await UserUploadLogModel.create({
        ...log,
        uploadedAt: new Date(log.uploadedAt)
      });
    }
  }
}

module.exports = {
  findAll,
  findById,
  createLog,
  reset
};
