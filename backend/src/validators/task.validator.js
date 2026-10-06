'use strict';

const Joi = require('joi');

const PRIORITIES = ['high', 'medium', 'low'];
const STATUSES = ['todo', 'progress', 'done'];

const id = Joi.number().integer().positive();

// Used for both POST (create) and PUT (replace). Unknown fields such as "id" are removed.
const taskBodySchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().allow('').max(500).default(''),
  priority: Joi.string()
    .valid(...PRIORITIES)
    .required(),
  status: Joi.string()
    .valid(...STATUSES)
    .required(),
  reviewerId: id
    .invalid(Joi.ref('assigneeId'))
    .required()
    .messages({
      'any.invalid': 'Reviewer cannot be the assignee'
    }),
  assigneeId: id.required(),
  projectId: id.required()
});

const taskParamsSchema = Joi.object({ id: id.required() });

module.exports = { taskBodySchema, taskParamsSchema };
