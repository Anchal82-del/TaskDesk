'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { taskBodySchema } = require('../src/validators/task.validator');

describe('task.validator', () => {
  it('accepts valid task with different reviewer and assignee', () => {
    const valid = {
      title: 'Valid task',
      description: 'Desc',
      priority: 'high',
      status: 'todo',
      reviewerId: 1,
      assigneeId: 2,
      projectId: 1
    };
    const { error, value } = taskBodySchema.validate(valid);
    assert.equal(error, undefined);
    assert.equal(value.reviewerId, 1);
    assert.equal(value.assigneeId, 2);
  });

  it('rejects task when reviewer is identical to assignee', () => {
    const invalid = {
      title: 'Invalid task',
      description: 'Desc',
      priority: 'high',
      status: 'todo',
      reviewerId: 3,
      assigneeId: 3,
      projectId: 1
    };
    const { error } = taskBodySchema.validate(invalid);
    assert.ok(error);
    assert.match(error.message, /Reviewer cannot be the assignee/i);
  });
});
