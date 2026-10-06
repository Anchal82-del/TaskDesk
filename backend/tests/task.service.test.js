'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const seedTasks = require('../src/seed/tasks.seed');
const taskRepository = require('../src/repositories/task.repository');
const taskService = require('../src/services/task.service');

const NEW_TASK = {
  title: 'Write tests',
  description: '',
  priority: 'low',
  status: 'todo',
  reviewerId: 1,
  assigneeId: 2,
  projectId: 1
};

describe('task.service', () => {
  beforeEach(() => taskRepository.reset());

  it('returns all seeded tasks when no user filter', async () => {
    const tasks = await taskService.getAllTasks();
    assert.equal(tasks.length, seedTasks.length);
  });

  it('filters tasks to only those where user is reviewer or assignee', async () => {
    const userId = 1;
    const userTasks = await taskService.getAllTasks({}, userId);
    assert.ok(userTasks.length > 0);
    assert.ok(userTasks.length < seedTasks.length);
    for (const t of userTasks) {
      assert.ok(t.reviewerId === userId || t.assigneeId === userId);
    }
  });

  it('gets a task by id', async () => {
    const task = await taskService.getTaskById(2);
    assert.equal(task.title, 'Fix login validation bug');
  });

  it('throws NOT_FOUND for an unknown id', async () => {
    await assert.rejects(taskService.getTaskById(999), (err) => {
      assert.equal(err.statusCode, 404);
      assert.equal(err.code, 'NOT_FOUND');
      return true;
    });
  });

  it('creates a task with the next id', async () => {
    const initialCount = seedTasks.length;
    const task = await taskService.createTask(NEW_TASK);
    assert.equal(task.id, initialCount + 1);
    assert.equal((await taskService.getAllTasks()).length, initialCount + 1);
  });

  it('replaces a task, and repeating the same update gives the same result', async () => {
    const first = await taskService.updateTask(1, NEW_TASK);
    const second = await taskService.updateTask(1, NEW_TASK);
    assert.deepEqual(first, second);
    assert.equal(first.id, 1);
    assert.equal(first.title, 'Write tests');
  });

  it('throws NOT_FOUND when updating a missing task', async () => {
    await assert.rejects(taskService.updateTask(999, NEW_TASK), { code: 'NOT_FOUND' });
  });

  it('deletes a task, then reports NOT_FOUND on a second delete', async () => {
    const initialCount = seedTasks.length;
    await taskService.deleteTask(3);
    assert.equal((await taskService.getAllTasks()).length, initialCount - 1);
    await assert.rejects(taskService.deleteTask(3), { code: 'NOT_FOUND' });
  });

  it('does not let callers change stored data by editing a returned object', async () => {
    const task = await taskService.getTaskById(1);
    task.title = 'Changed outside';
    assert.equal((await taskService.getTaskById(1)).title, 'Design homepage banner');
  });
});
