'use strict';

const mongoose = require('mongoose');

const PRIORITIES = ['high', 'medium', 'low'];
const STATUSES = ['todo', 'progress', 'done'];

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    priority: {
      type: String,
      required: [true, 'Task priority is required'],
      enum: {
        values: PRIORITIES,
        message: '{VALUE} is not a valid priority'
      }
    },
    status: {
      type: String,
      required: [true, 'Task status is required'],
      enum: {
        values: STATUSES,
        message: '{VALUE} is not a valid status'
      }
    },
    reviewerId: {
      type: Number,
      required: [true, 'Reviewer ID is required']
    },
    assigneeId: {
      type: Number,
      required: [true, 'Assignee ID is required']
    },
    projectId: {
      type: Number,
      required: [true, 'Project ID is required']
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

const TaskModel = mongoose.models.Task || mongoose.model('Task', taskSchema);

module.exports = TaskModel;
