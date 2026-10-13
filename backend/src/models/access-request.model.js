'use strict';

const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: Number,
      required: true,
      index: true
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    requesterName: {
      type: String,
      required: true,
      trim: true
    },
    requesterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
      index: true
    },
    decidedBy: {
      type: String,
      default: null
    },
    decidedAt: {
      type: Date,
      default: null
    }
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

const AccessRequestModel =
  mongoose.models.AccessRequest || mongoose.model('AccessRequest', accessRequestSchema);

module.exports = AccessRequestModel;
