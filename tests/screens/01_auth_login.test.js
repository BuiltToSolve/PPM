import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost } from '../helpers/testUtils.js';

describe('Screen 1: Authentication & Login (/login)', () => {
  test('Admin login with valid credentials succeeds and returns role', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.username, 'admin');
    assert.equal(res.data.role, 'admin');
    assert.ok(res.cookie.startsWith('auth_token='));
  });

  test('Manager login with valid credentials succeeds and returns role', async () => {
    const res = await loginAs('manager', 'Manager@123');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.username, 'manager');
    assert.equal(res.data.role, 'manager');
    assert.ok(res.cookie.startsWith('auth_token='));
  });

  test('Viewer login with valid credentials succeeds and returns role', async () => {
    const res = await loginAs('viewer', 'Viewer@123');
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.username, 'viewer');
    assert.equal(res.data.role, 'viewer');
    assert.ok(res.cookie.startsWith('auth_token='));
  });

  test('Login with incorrect password fails with 401 Unauthorized', async () => {
    const res = await loginAs('admin', 'WrongPassword123');
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'Invalid credentials');
    assert.equal(res.cookie, '');
  });

  test('Login with nonexistent user fails with 401 Unauthorized', async () => {
    const res = await loginAs('nonexistent_user', 'AnyPassword123');
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'Invalid credentials');
  });

  test('Login with empty username or password returns 400 Bad Request', async () => {
    const res = await apiPost('/api/auth/login', { username: '', password: '' });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /required/i);
  });

  test('/api/auth/me returns current user identity when authenticated', async () => {
    const { cookie } = await loginAs('admin', 'RV@321');
    const res = await apiGet('/api/auth/me', cookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.username, 'admin');
    assert.equal(res.data.role, 'admin');
  });

  test('/api/auth/me returns 401 when no session cookie is provided', async () => {
    const res = await apiGet('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('/api/auth/logout invalidates session and clears cookie', async () => {
    const res = await apiPost('/api/auth/logout', {});
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
  });
});
