'use strict';

const mongoose = require('mongoose');

const uploadRecordItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    username: { type: String, default: '' },
    email: { type: String, default: '' },
    role: { type: String, default: 'user' },
    status: {
      type: String,
      enum: ['added', 'duplicate', 'failed'],
      default: 'added'
    },
    reason: { type: String, default: '' }
  },
  { _id: false }
);

const userUploadLogSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    uploadedBy: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      username: { type: String, required: true }
    },
    fileName: {
      type: String,
      required: true,
      default: 'users_import.xlsx'
    },
    fileCount: {
      type: Number,
      default: 1
    },
    totalRecords: {
      type: Number,
      default: 0
    },
    addedCount: {
      type: Number,
      default: 0
    },
    duplicateCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['completed', 'partial', 'duplicate_only', 'failed'],
      default: 'completed'
    },
    records: [uploadRecordItemSchema]
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const UserUploadLogModel =
  mongoose.models.UserUploadLog ||
  mongoose.model('UserUploadLog', userUploadLogSchema);

module.exports = UserUploadLogModel;
