'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      }
    },
    toObject: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      }
    }
  }
);

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = UserModel;
