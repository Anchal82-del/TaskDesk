'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const authService = require('../src/services/auth.service');
const userRepository = require('../src/repositories/user.repository');

describe('user management: create, bulk import, and delete', () => {
  let server;
  let baseUrl;
  let adminToken;
  let userToken;

  before(async () => {
    await userRepository.reset();
    const adminLogin = await authService.login('u541023', 'Password@123');
    adminToken = adminLogin.token;

    const userLogin = await authService.login('u541024', 'Password@123');
    userToken = userLogin.token;

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await userRepository.reset();
  });

  it('allows admin to create a new user', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Sara Khan',
        username: 'u541099',
        email: 'sara.khan@taskdesk.dev',
        role: 'user'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.name, 'Sara Khan');
    assert.equal(body.data.username, 'u541099');
  });

  it('rejects user creation by non-admin with 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized User',
        username: 'u541100',
        email: 'unauth@taskdesk.dev'
      })
    });
    assert.equal(res.status, 403);
  });

  it('allows bulk creation of users from csv/excel data', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        users: [
          {
            name: 'Rohan Sharma',
            username: 'u541101',
            email: 'rohan.sharma@taskdesk.dev',
            role: 'user'
          },
          {
            name: 'Pooja Patel',
            username: 'u541102',
            email: 'pooja.patel@taskdesk.dev',
            role: 'admin'
          }
        ]
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.created.length, 2);
    assert.equal(body.data.created[0].name, 'Rohan Sharma');
    assert.equal(body.data.created[1].name, 'Pooja Patel');
  });

  it('allows admin to remove a user', async () => {
    const user = await userRepository.findByUsername('u541101');
    assert.ok(user);

    const res = await fetch(`${baseUrl}/api/v1/users/${user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);

    const check = await userRepository.findById(user.id);
    assert.equal(check, null);
  });

  it('rejects deletion of Super Admin u541023', async () => {
    const superAdmin = await userRepository.findByUsername('u541023');
    const res = await fetch(`${baseUrl}/api/v1/users/${superAdmin.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 403);
  });
});
