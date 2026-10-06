'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const authService = require('../src/services/auth.service');

describe('auth.service', () => {
  it('successfully authenticates with valid credentials for seeded user', async () => {
    const result = await authService.login('u541023', 'Password@123');
    assert.ok(result.token);
    assert.equal(result.user.username, 'u541023');
    assert.equal(result.user.name, 'Anchal');
    assert.equal(result.user.id, 1);
  });

  it('rejects invalid password', async () => {
    await assert.rejects(authService.login('u541023', 'wrongpassword'), (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    });
  });

  it('rejects non-existent user', async () => {
    await assert.rejects(authService.login('u999999', 'Password@123'), (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    });
  });

  it('verifies a valid token', async () => {
    const result = await authService.login('u541024', 'Password@123');
    const decoded = await authService.verifyToken(result.token);
    assert.equal(decoded.username, 'u541024');
    assert.equal(decoded.name, 'Jyoti Singh');
  });

  it('rejects invalid token', async () => {
    await assert.rejects(authService.verifyToken('invalid.token.here'), (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    });
  });
});
