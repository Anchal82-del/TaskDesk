'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const authService = require('../src/services/auth.service');
const userRepository = require('../src/repositories/user.repository');

describe('task security & user list tests', () => {
  let server;
  let baseUrl;
  let validToken;

  before(async () => {
    // Generate a valid token
    const authResult = await authService.login('u541023', 'Password@123');
    validToken = authResult.token;

    // Start Express app on an ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects unauthenticated GET /api/v1/tasks with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/tasks`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.status, 'error');
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });

  it('allows authenticated GET /api/v1/tasks with valid Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/tasks`, {
      headers: {
        Authorization: `Bearer ${validToken}`
      }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.ok(Array.isArray(body.data));
  });

  it('excludes Tarun and Shoba from userRepository.findAll()', async () => {
    const users = await userRepository.findAll();
    const hasTarun = users.some(
      (u) =>
        (u.name && u.name.toLowerCase().includes('tarun')) ||
        (u.username && u.username.toLowerCase().includes('u541027'))
    );
    const hasShoba = users.some(
      (u) =>
        (u.name && u.name.toLowerCase().includes('shoba')) ||
        (u.username && u.username.toLowerCase().includes('u541028'))
    );
    assert.equal(hasTarun, false);
    assert.equal(hasShoba, false);
  });
});
