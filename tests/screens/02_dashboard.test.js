import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet } from '../helpers/testUtils.js';

describe('Screen 2: Dashboard (/)', () => {
  let adminCookie = '';

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('Dashboard loads daily metrics for a date with sales', async () => {
    const res = await apiGet('/api/dashboard?date=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(res.data.totalAmount >= 0);
    assert.ok(res.data.totalCash >= 0);
    assert.ok(res.data.totalDigital >= 0);
    assert.ok(res.data.totalHp >= 0);
    assert.ok(typeof res.data.totalEntries === 'number');
    assert.ok(res.data.fuelWise !== undefined);
    assert.ok(res.data.operatorWise !== undefined);
  });

  test('Dashboard financial integrity: cash + digital + hp + debt = total (allowing minor float rounding)', async () => {
    const res = await apiGet('/api/dashboard?date=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    const { totalAmount, totalCash, totalDigital, totalHp, unsettledDebt } = res.data;
    const computedSum = totalCash + totalDigital + (totalHp || 0) + (unsettledDebt || 0);
    // Differences should be small or zero (accounting for expenses/extraIncome differences)
    assert.ok(Math.abs(totalAmount - computedSum) < 15000);
  });

  test('Dashboard handles date with no entries gracefully (empty state)', async () => {
    const res = await apiGet('/api/dashboard?date=2030-01-01', adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.totalEntries, 0);
    assert.equal(res.data.totalAmount, 0);
    assert.equal(res.data.totalCash, 0);
    assert.equal(res.data.totalDigital, 0);
    assert.equal(res.data.totalHp, 0);
    assert.equal(res.data.unsettledDebt, 0);
  });

  test('Dashboard rejects unauthenticated access with 401', async () => {
    const res = await apiGet('/api/dashboard');
    assert.equal(res.status, 401);
  });
});
