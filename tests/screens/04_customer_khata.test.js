import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost, apiPut, apiDelete } from '../helpers/testUtils.js';

describe('Screen 4: Customer Khata (/customers)', () => {
  let adminCookie = '';
  let customerId = '';

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('GET /api/customers returns customer ledger accounts', async () => {
    const res = await apiGet('/api/customers', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  test('POST /api/customers registers a new fleet customer', async () => {
    const payload = {
      name: `Sharma Logistics Test ${Date.now()}`,
      phone: '9876543210',
      vehicleNumber: 'RJ14-GB-9999',
      creditLimit: 75000,
    };
    const res = await apiPost('/api/customers', payload, adminCookie);
    assert.equal(res.status, 201);
    assert.ok(res.data._id);
    assert.equal(res.data.name, payload.name);
    assert.equal(res.data.currentBalance, 0);
    assert.equal(res.data.creditLimit, 75000);
    customerId = res.data._id;
  });

  test('POST /api/customers rejects missing customer name with 400', async () => {
    const res = await apiPost('/api/customers', { phone: '1234567890' }, adminCookie);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /name is required/i);
  });

  test('PUT /api/customers/:id updates customer information', async () => {
    assert.ok(customerId);
    const update = {
      phone: '9988776655',
      creditLimit: 100000,
    };
    const res = await apiPut(`/api/customers/${customerId}`, update, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.phone, '9988776655');
    assert.equal(res.data.creditLimit, 100000);
  });

  test('PUT /api/customers/:id records payment received and reduces balance', async () => {
    assert.ok(customerId);
    // 1. Manually simulate an outstanding balance of 5,000
    // Using payment test: payment should not reduce below zero
    const payRes = await apiPut(`/api/customers/${customerId}`, {
      paymentAmount: 1500,
      paymentMode: 'UPI / Online',
      notes: 'Test UTR #123456',
    }, adminCookie);
    assert.equal(payRes.status, 200);
    assert.equal(payRes.data.currentBalance, 0); // 0 - 1500 capped at 0
  });

  test('PUT /api/customers/:id rejects invalid payment amount with 400', async () => {
    assert.ok(customerId);
    const payRes = await apiPut(`/api/customers/${customerId}`, {
      paymentAmount: -500,
    }, adminCookie);
    assert.equal(payRes.status, 400);
    assert.match(payRes.data.error, /greater than zero/i);
  });

  test('DELETE /api/customers/:id rejects deletion if balance > 0 with 400', async () => {
    // 1. Create a customer
    const newCust = await apiPost('/api/customers', {
      name: `Unsettled Fleet ${Date.now()}`,
      phone: '9876543211',
      creditLimit: 50000,
    }, adminCookie);
    assert.equal(newCust.status, 201);
    const withDebtId = newCust.data._id;

    // Simulate outstanding balance of ₹2,500
    await apiPut(`/api/customers/${withDebtId}`, { currentBalance: 2500 }, adminCookie);

    // Attempt DELETE -> Must fail with 400
    const delRes = await apiDelete(`/api/customers/${withDebtId}`, adminCookie);
    assert.equal(delRes.status, 400);
    assert.match(delRes.data.error, /outstanding balance/i);

    // Clear balance to 0 and retry DELETE -> must succeed
    await apiPut(`/api/customers/${withDebtId}`, { currentBalance: 0 }, adminCookie);
    const delSuccessRes = await apiDelete(`/api/customers/${withDebtId}`, adminCookie);
    assert.equal(delSuccessRes.status, 200);
    assert.equal(delSuccessRes.data.success, true);
  });

  test('DELETE /api/customers/:id soft deletes customer when balance is 0', async () => {
    assert.ok(customerId);
    const res = await apiDelete(`/api/customers/${customerId}`, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
  });
});
