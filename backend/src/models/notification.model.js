'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
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
    senderId: {
      type: Number,
      default: null
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      default: 'access_request',
      index: true
    },
    entityId: {
      type: Number,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    read: {
      type: Boolean,
      default: false,
      index: true
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

const NotificationModel =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = NotificationModel;
