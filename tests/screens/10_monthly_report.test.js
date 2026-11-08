import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet } from '../helpers/testUtils.js';

describe('Screen 10: Custom & Monthly Report (/monthly-report)', () => {
  let adminCookie = '';

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('GET /api/monthly-report aggregates multi-day sales metrics', async () => {
    const res = await apiGet('/api/monthly-report?startDate=2026-11-01&endDate=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.startDate, '2026-11-01');
    assert.equal(res.data.endDate, '2026-11-06');
    assert.ok(res.data.daysRecorded > 0);
    assert.ok(res.data.grandTotal > 0);
    assert.ok(Array.isArray(res.data.dailyStats));
    assert.equal(res.data.dailyStats.length, res.data.daysRecorded);
  });

  test('Monthly Report dailyStats contains accurate payment breakdowns for CSV export', async () => {
    const res = await apiGet('/api/monthly-report?startDate=2026-11-01&endDate=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    const firstDay = res.data.dailyStats[0];
    assert.ok(firstDay.date);
    assert.ok(typeof firstDay.totalAmount === 'number');
    assert.ok(typeof firstDay.cashAmount === 'number');
    assert.ok(typeof firstDay.digitalAmount === 'number');
    assert.ok(typeof firstDay.hpAmount === 'number');
    assert.ok(typeof firstDay.debtAmount === 'number');
  });

  test('Monthly Report rejects missing date range with 400', async () => {
    const res = await apiGet('/api/monthly-report', adminCookie);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /startDate and endDate are required/i);
  });
});
