'use strict';

const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'string.empty': 'Username is required',
    'any.required': 'Username is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  })
});

module.exports = { loginSchema };
