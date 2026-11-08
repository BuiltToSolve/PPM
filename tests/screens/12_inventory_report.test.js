import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet } from '../helpers/testUtils.js';

describe('Screen 12: Lubes Sales Report (/inventory/report)', () => {
  let adminCookie = '';

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('GET /api/inventory-report returns inventory sales metrics', async () => {
    const res = await apiGet('/api/inventory-report?startDate=2026-11-01&endDate=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.startDate, '2026-11-01');
    assert.equal(res.data.endDate, '2026-11-06');
    assert.ok(typeof res.data.grandTotal === 'number');
    assert.ok(typeof res.data.grandCash === 'number');
    assert.ok(typeof res.data.grandDigital === 'number');
    assert.ok(typeof res.data.grandHp === 'number');
    assert.ok(typeof res.data.grandDebt === 'number');
    assert.ok(res.data.itemBreakdown !== undefined);
  });

  test('GET /api/inventory-report rejects missing date range with 400', async () => {
    const res = await apiGet('/api/inventory-report', adminCookie);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /required/i);
  });

  test('Lubes Report CSV row transformation formats correctly', async () => {
    const res = await apiGet('/api/inventory-report?startDate=2026-11-01&endDate=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    const { itemBreakdown } = res.data;
    const sampleRow = Object.entries(itemBreakdown).map(([name, info]) => ({
      Period: '2026-11-01 to 2026-11-06',
      ItemName: name,
      QuantitySold: info.qty,
      Rate: info.rate,
      TotalAmount: info.amount,
    }));
    // Check that if items exist, schema is valid
    if (sampleRow.length > 0) {
      assert.ok(sampleRow[0].ItemName);
      assert.ok(typeof sampleRow[0].QuantitySold === 'number');
    }
  });
});
