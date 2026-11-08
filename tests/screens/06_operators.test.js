import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost, apiPut, apiDelete } from '../helpers/testUtils.js';
import { operatorSchema } from '../../src/lib/validations.js';

describe('Screen 6: Pump Operators (/operators)', () => {
  let adminCookie = '';
  let operatorId = '';

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('Zod Unit Validation: valid operator payload passes', () => {
    const valid = { name: 'Mohan Lal', phone: '9829012345' };
    const parsed = operatorSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.name, 'Mohan Lal');
  });

  test('Zod Unit Validation: empty operator name is rejected', () => {
    const invalid = { name: '', phone: '9829012345' };
    const parsed = operatorSchema.safeParse(invalid);
    assert.equal(parsed.success, false);
    assert.match(parsed.error.issues[0].message, /at least 2 characters/i);
  });

  test('GET /api/operators returns active and registered operators', async () => {
    const res = await apiGet('/api/operators', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  test('POST /api/operators adds a new operator successfully', async () => {
    const payload = {
      name: `Test Operator ${Date.now()}`,
      phone: '9876543210',
    };
    const res = await apiPost('/api/operators', payload, adminCookie);
    assert.equal(res.status, 201);
    assert.ok(res.data._id);
    assert.equal(res.data.name, payload.name);
    assert.equal(res.data.active, true);
    operatorId = res.data._id;
  });

  test('PUT /api/operators/:id updates operator details', async () => {
    assert.ok(operatorId);
    const update = {
      name: 'Updated Operator Name',
      phone: '9123456780',
    };
    const res = await apiPut(`/api/operators/${operatorId}`, update, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.name, 'Updated Operator Name');
    assert.equal(res.data.phone, '9123456780');
  });

  test('DELETE /api/operators/:id soft-deactivates operator (active: false)', async () => {
    assert.ok(operatorId);
    const res = await apiDelete(`/api/operators/${operatorId}`, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.active, false);
  });
});
