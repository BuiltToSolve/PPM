import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost, apiPut, apiDelete } from '../helpers/testUtils.js';
import { inventoryItemSchema } from '../../src/lib/validations.js';

describe('Screen 11: Packaged Lubes & Inventory (/inventory)', () => {
  let adminCookie = '';
  let itemId = '';

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('Zod Unit Validation: valid lubricant item passes', () => {
    const valid = {
      name: 'Castrol Activ 4T 20W-40 1L',
      category: 'Engine Oil',
      stock: 50,
      price: 380,
    };
    const parsed = inventoryItemSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.price, 380);
  });

  test('Zod Unit Validation: negative stock or price is rejected', () => {
    const invalid = {
      name: 'Engine Oil',
      category: 'Engine Oil',
      stock: -10,
      price: 200,
    };
    const parsed = inventoryItemSchema.safeParse(invalid);
    assert.equal(parsed.success, false);
    assert.match(parsed.error.issues[0].message, /cannot be negative/i);
  });

  test('GET /api/inventory lists current lube inventory', async () => {
    const res = await apiGet('/api/inventory', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  test('POST /api/inventory adds a new lubricant item', async () => {
    const payload = {
      name: `Servo 4T Super Test ${Date.now()}`,
      category: 'Engine Oil',
      stock: 24,
      price: 360,
    };
    const res = await apiPost('/api/inventory', payload, adminCookie);
    assert.equal(res.status, 201);
    assert.ok(res.data._id);
    assert.equal(res.data.name, payload.name);
    assert.equal(res.data.stock, 24);
    assert.equal(res.data.price, 360);
    itemId = res.data._id;
  });

  test('PUT /api/inventory/:id updates stock count and price', async () => {
    assert.ok(itemId);
    const update = { stock: 30, price: 375 };
    const res = await apiPut(`/api/inventory/${itemId}`, update, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.stock, 30);
    assert.equal(res.data.price, 375);
  });

  test('DELETE /api/inventory/:id deletes the test item (Admin only)', async () => {
    assert.ok(itemId);
    const res = await apiDelete(`/api/inventory/${itemId}`, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
  });
});
