'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');
const authService = require('../src/services/auth.service');
const userRepository = require('../src/repositories/user.repository');
const accessRequestRepository = require('../src/repositories/access-request.repository');

describe('user roles, permissions and access requests', () => {
  let server;
  let baseUrl;
  let adminToken;
  let regularToken;

  before(async () => {
    await userRepository.reset();
    const adminLogin = await authService.login('u541023', 'Password@123');
    adminToken = adminLogin.token;

    const userLogin = await authService.login('u541024', 'Password@123');
    regularToken = userLogin.token;

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

  it('identifies u541023 as admin and u541024 as user', async () => {
    const adminUser = await userRepository.findByUsername('u541023');
    assert.equal(adminUser.role, 'admin');

    const regularUser = await userRepository.findByUsername('u541024');
    assert.equal(regularUser.role, 'user');
    assert.equal(regularUser.accessRequested, false);
  });

  it('admin sees all tasks when requesting /api/v1/tasks', async () => {
    const res = await fetch(`${baseUrl}/api/v1/tasks`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.length, 8);
  });

  it('non-admin sees only their assigned/reviewed tasks', async () => {
    const res = await fetch(`${baseUrl}/api/v1/tasks`, {
      headers: { Authorization: `Bearer ${regularToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    // Jyoti Singh (id: 2) is involved in 4 tasks:
    // #1 (reviewer), #2 (assignee), #7 (reviewer), #8 (assignee)
    assert.equal(body.data.length, 4);
    for (const t of body.data) {
      assert.ok(t.reviewerId === 2 || t.assigneeId === 2);
    }
  });

  it('allows a user to request admin access', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/2/request-access`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${regularToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.accessRequested, true);

    const user = await userRepository.findById(2);
    assert.equal(user.accessRequested, true);
  });

  it('allows admin to grant admin permission to a user', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/2/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'admin' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.role, 'admin');
    assert.equal(body.data.accessRequested, false);

    const updated = await userRepository.findById(2);
    assert.equal(updated.role, 'admin');
  });

  it('rejects attempt to demote Super Admin u541023 with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/1/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'user' })
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  it('admin can revoke another admin, but cannot revoke Super Admin or self, and regular user is rejected', async () => {
    // Promote user 3 (Vivek) to admin first
    await userRepository.updateRole(3, 'admin');

    // User 2 (Jyoti) is admin. Login as Jyoti:
    const jyotiLogin = await authService.login('u541024', 'Password@123');
    const jyotiToken = jyotiLogin.token;

    // Jyoti attempts to revoke Super Admin (u541023, id: 1) -> must be rejected with 403
    const demoteSuper = await fetch(`${baseUrl}/api/v1/users/1/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${jyotiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'user' })
    });
    assert.equal(demoteSuper.status, 403);

    // Jyoti attempts to revoke herself (id: 2) -> must be rejected with 403
    const demoteSelf = await fetch(`${baseUrl}/api/v1/users/2/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${jyotiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'user' })
    });
    assert.equal(demoteSelf.status, 403);

    // Jyoti revokes another admin (Vivek, id: 3) -> succeeds with 200
    const revokeOther = await fetch(`${baseUrl}/api/v1/users/3/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${jyotiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'user' })
    });
    assert.equal(revokeOther.status, 200);
    const updatedVivek = await userRepository.findById(3);
    assert.equal(updatedVivek.role, 'user');

    // Regular user (Vivek, now 'user') cannot update roles -> 403
    const vivekLogin = await authService.login('u541025', 'Password@123');
    const demoteByRegular = await fetch(`${baseUrl}/api/v1/users/2/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${vivekLogin.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'user' })
    });
    assert.equal(demoteByRegular.status, 403);
  });

  it('admin can switch to personal view with scope=my', async () => {
    const res = await fetch(`${baseUrl}/api/v1/tasks?scope=my`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    // Super admin u541023 (id: 1) is involved in:
    // #1 (assignee), #3 (reviewer), #4 (reviewer), #5 (assignee) -> 4 tasks
    assert.equal(body.data.length, 4);
    for (const t of body.data) {
      assert.ok(t.reviewerId === 1 || t.assigneeId === 1);
    }
  });

  it('regular user cannot access all tasks by setting scope=all', async () => {
    const vivekLogin = await authService.login('u541025', 'Password@123');
    const vivekToken = vivekLogin.token;

    const res = await fetch(`${baseUrl}/api/v1/tasks?scope=all`, {
      headers: { Authorization: `Bearer ${vivekToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    // Vivek Kumar (id: 3) is involved in 4 tasks: #2 (reviewer), #3 (assignee), #6 (reviewer), #7 (assignee)
    assert.equal(body.data.length, 4);
  });

  it('end-to-end access request workflow: Vivek requests, stays User, Super Admin approves', async () => {
    const vivekLogin = await authService.login('u541025', 'Password@123');
    const vivekToken = vivekLogin.token;

    // Vivek submits request
    const reqRes = await fetch(`${baseUrl}/api/v1/access-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vivekToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert.equal(reqRes.status, 201);
    const reqBody = await reqRes.json();
    assert.equal(reqBody.data.userId, 3);
    assert.equal(reqBody.data.employeeId, 'u541025');
    assert.equal(reqBody.data.status, 'pending');

    // Vivek's role MUST remain 'user' while pending
    const vivekUser = await userRepository.findById(3);
    assert.equal(vivekUser.role, 'user');
    assert.equal(vivekUser.accessRequested, true);

    // Super Admin lists pending requests: must contain Vivek, NOT Jyoti
    const pendingRes = await fetch(`${baseUrl}/api/v1/access-requests/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(pendingRes.status, 200);
    const pendingBody = await pendingRes.json();
    const vivekPending = pendingBody.data.find((r) => r.userId === 3);
    assert.ok(vivekPending);
    assert.equal(vivekPending.employeeId, 'u541025');
    assert.equal(vivekPending.requesterName, 'Vivek Kumar');

    // Super Admin approves request
    const approveRes = await fetch(`${baseUrl}/api/v1/access-requests/${vivekPending.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(approveRes.status, 200);

    // Now Vivek's role must be admin
    const updatedVivek = await userRepository.findById(3);
    assert.equal(updatedVivek.role, 'admin');
    assert.equal(updatedVivek.accessRequested, false);
  });

  it('end-to-end access request workflow: decline request leaves role as user', async () => {
    const nikithaLogin = await authService.login('u541026', 'Password@123');
    const nikithaToken = nikithaLogin.token;

    // Nikitha submits request
    const reqRes = await fetch(`${baseUrl}/api/v1/access-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nikithaToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert.equal(reqRes.status, 201);
    const reqData = (await reqRes.json()).data;

    // Super Admin declines request
    const declineRes = await fetch(`${baseUrl}/api/v1/access-requests/${reqData.id}/decline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(declineRes.status, 200);

    // Nikitha's role MUST remain 'user'
    const nikithaUser = await userRepository.findById(4);
    assert.equal(nikithaUser.role, 'user');
    assert.equal(nikithaUser.accessRequested, false);
  });

  it('generates persistent notifications for Super Admin on request, and for user on approve/decline', async () => {
    // 1. Super Admin fetches notifications
    const superNotifsRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(superNotifsRes.status, 200);
    const superNotifs = (await superNotifsRes.json()).data;
    assert.ok(Array.isArray(superNotifs));
    assert.ok(superNotifs.length > 0);

    // Verify notification content has requester name and employee ID
    const requestNotif = superNotifs.find((n) => n.type === 'access_request');
    assert.ok(requestNotif);
    assert.ok(requestNotif.message.includes('u54102'));
    assert.equal(requestNotif.read, false);
    assert.ok(requestNotif.metadata.requestId);

    // 2. Super Admin marks notification as read
    const markReadRes = await fetch(`${baseUrl}/api/v1/notifications/${requestNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(markReadRes.status, 200);
    const markedData = (await markReadRes.json()).data;
    assert.equal(markedData.read, true);

    // 3. Vivek (userId 3) fetches notifications: should see approval notification
    const vivekLogin = await authService.login('u541025', 'Password@123');
    const vivekToken = vivekLogin.token;
    const vivekNotifsRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${vivekToken}` }
    });
    assert.equal(vivekNotifsRes.status, 200);
    const vivekNotifs = (await vivekNotifsRes.json()).data;
    const approvalNotif = vivekNotifs.find((n) => n.type === 'access_request_approved');
    assert.ok(approvalNotif);
    assert.equal(approvalNotif.message, 'Your admin access request has been approved.');

    // 4. Nikitha (userId 4) fetches notifications: should see decline notification
    const nikithaLogin = await authService.login('u541026', 'Password@123');
    const nikithaToken = nikithaLogin.token;
    const nikithaNotifsRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${nikithaToken}` }
    });
    assert.equal(nikithaNotifsRes.status, 200);
    const nikithaNotifs = (await nikithaNotifsRes.json()).data;
    const declineNotif = nikithaNotifs.find((n) => n.type === 'access_request_declined');
    assert.ok(declineNotif);
    assert.equal(declineNotif.message, 'Your admin access request was declined.');

    // 5. Clear all only clears current user's notifications
    const clearRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${nikithaToken}` }
    });
    assert.equal(clearRes.status, 200);

    const nikithaClearedRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${nikithaToken}` }
    });
    assert.equal((await nikithaClearedRes.json()).data.length, 0);

    // Vivek's notifications must NOT have been affected by Nikitha's clear
    const vivekStillThereRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${vivekToken}` }
    });
    assert.ok((await vivekStillThereRes.json()).data.length > 0);
  });

  it('appointed Admin Jyoti Singh receives notification when Vivek requests admin access and can review it', async () => {
    // Appoint Jyoti Singh (u541024, id: 2) as Admin
    await userRepository.updateRole(2, 'admin');

    const jyotiLogin = await authService.login('u541024', 'Password@123');
    const jyotiToken = jyotiLogin.token;

    // Reset access requests & notifications for clean test
    await accessRequestRepository.reset();
    await userRepository.setRequestAccess(3, false);
    await userRepository.updateRole(3, 'user');

    const vivekLogin = await authService.login('u541025', 'Password@123');
    const vivekToken = vivekLogin.token;

    // Vivek submits access request
    const reqRes = await fetch(`${baseUrl}/api/v1/access-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vivekToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert.equal(reqRes.status, 201);
    const reqData = (await reqRes.json()).data;
    assert.equal(reqData.userId, 3);
    assert.equal(reqData.status, 'pending');

    // 1. Vivek receives submission confirmation notification
    const vivekNotifsRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${vivekToken}` }
    });
    assert.equal(vivekNotifsRes.status, 200);
    const vivekNotifs = (await vivekNotifsRes.json()).data;
    const submittedNotif = vivekNotifs.find((n) => n.type === 'access_request_submitted');
    assert.ok(submittedNotif, 'Requester must receive confirmation notification');
    assert.equal(submittedNotif.message, 'Your admin access request has been submitted for review.');

    // 2. Jyoti (appointed Admin) receives bell notification
    const jyotiNotifsRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${jyotiToken}` }
    });
    assert.equal(jyotiNotifsRes.status, 200);
    const jyotiNotifs = (await jyotiNotifsRes.json()).data;
    const jyotiReqNotif = jyotiNotifs.find((n) => n.type === 'access_request');
    assert.ok(jyotiReqNotif, 'Appointed Admin Jyoti must receive access request notification');
    assert.ok(jyotiReqNotif.message.includes('Vivek Kumar'));

    // 3. Super Admin also receives bell notification
    const superNotifsRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const superNotifs = (await superNotifsRes.json()).data;
    const superReqNotif = superNotifs.find((n) => n.type === 'access_request');
    assert.ok(superReqNotif, 'Super Admin must also receive notification');

    // 4. Jyoti can view pending requests
    const jyotiPendingRes = await fetch(`${baseUrl}/api/v1/access-requests/pending`, {
      headers: { Authorization: `Bearer ${jyotiToken}` }
    });
    assert.equal(jyotiPendingRes.status, 200);
    const jyotiPending = (await jyotiPendingRes.json()).data;
    assert.ok(jyotiPending.some((r) => r.id === reqData.id));

    // 5. Jyoti can approve the request
    const jyotiApproveRes = await fetch(`${baseUrl}/api/v1/access-requests/${reqData.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jyotiToken}` }
    });
    assert.equal(jyotiApproveRes.status, 200);

    // Verify Vivek is now admin
    const updatedVivek = await userRepository.findById(3);
    assert.equal(updatedVivek.role, 'admin');
  });

  it('Vivek can cancel his own pending request, receives confirmation, and unauthorized cancel is rejected', async () => {
    // Reset Vivek back to regular user
    await userRepository.updateRole(3, 'user');
    await userRepository.setRequestAccess(3, false);
    await accessRequestRepository.reset();

    const vivekLogin = await authService.login('u541025', 'Password@123');
    const vivekToken = vivekLogin.token;

    // Vivek submits request
    const reqRes = await fetch(`${baseUrl}/api/v1/access-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vivekToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert.equal(reqRes.status, 201);
    const reqData = (await reqRes.json()).data;
    assert.equal(reqData.status, 'pending');

    // Verify Vivek accessRequested is true
    assert.equal((await userRepository.findById(3)).accessRequested, true);

    // 1. Unauthenticated cancel attempt is rejected with 401
    const unauthCancelRes = await fetch(`${baseUrl}/api/v1/access-requests/my`, {
      method: 'DELETE'
    });
    assert.equal(unauthCancelRes.status, 401);

    // 2. Another regular user (Nikitha, id: 4) attempting to cancel Vivek's request is rejected with 403
    const nikithaLogin = await authService.login('u541026', 'Password@123');
    const nikithaToken = nikithaLogin.token;
    const forbiddenCancelRes = await fetch(`${baseUrl}/api/v1/access-requests/${reqData.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${nikithaToken}` }
    });
    assert.equal(forbiddenCancelRes.status, 403);

    // 3. Vivek cancels his own request via DELETE /my
    const cancelRes = await fetch(`${baseUrl}/api/v1/access-requests/my`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vivekToken}` }
    });
    assert.equal(cancelRes.status, 200);
    const cancelBody = await cancelRes.json();
    assert.equal(cancelBody.data.cancelled, true);

    // 4. Verify user record has accessRequested = false
    const vivekAfterCancel = await userRepository.findById(3);
    assert.equal(vivekAfterCancel.accessRequested, false);

    // 5. Verify pending request is no longer returned in findPending
    const pendingRequests = await accessRequestRepository.findPending();
    assert.equal(pendingRequests.filter((r) => r.userId === 3).length, 0);

    // 6. Verify Vivek received cancellation confirmation notification
    const notifsRes = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${vivekToken}` }
    });
    const notifs = (await notifsRes.json()).data;
    const cancelNotif = notifs.find((n) => n.type === 'access_request_cancelled');
    assert.ok(cancelNotif, 'Requester must receive cancellation notification');
    assert.equal(cancelNotif.message, 'Your admin access request has been cancelled.');
  });
});

