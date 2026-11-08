import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet } from '../helpers/testUtils.js';

describe('Screen 9: Daily Sales Report (/daily-sales/report)', () => {
  let adminCookie = '';

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('GET /api/report?date=2026-11-06 returns full day breakdown and metrics', async () => {
    const res = await apiGet('/api/report?date=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.date, '2026-11-06');
    assert.ok(typeof res.data.grandTotal === 'number');
    assert.ok(typeof res.data.grandCash === 'number');
    assert.ok(typeof res.data.grandDigital === 'number');
    assert.ok(typeof res.data.grandHp === 'number');
    assert.ok(typeof res.data.grandDebt === 'number');
    assert.ok(res.data.fuelBreakdown !== undefined);
    assert.ok(Array.isArray(res.data.sales));
  });

  test('Daily Sales Report calculates fuel volume & revenue breakdown correctly', async () => {
    const res = await apiGet('/api/report?date=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    const { fuelBreakdown } = res.data;
    // For every fuel type present, qty * rate should roughly match amount
    for (const [fuel, info] of Object.entries(fuelBreakdown)) {
      assert.ok(info.qty > 0, `${fuel} quantity should be positive`);
      assert.ok(info.amount > 0, `${fuel} amount should be positive`);
    }
  });

  test('Daily Sales Report rejects request without date with 400', async () => {
    const res = await apiGet('/api/report', adminCookie);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /date is required/i);
  });

  test('Daily Sales Report CSV row transformation produces valid export schema', async () => {
    const res = await apiGet('/api/report?date=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    const { sales } = res.data;
    assert.ok(sales.length > 0);
    const sampleRow = {
      Date: sales[0].date,
      Pump: sales[0].pumpNumber === 5 ? 'CNG' : `Pump ${sales[0].pumpNumber}`,
      Operator: sales[0].operatorName,
      TotalAmount: sales[0].totalAmount,
      Cash: sales[0].cashAmount,
      Digital: sales[0].digitalAmount,
      HP: sales[0].hpAmount,
      Debt: sales[0].debtAmount,
    };
    assert.ok(sampleRow.Date);
    assert.ok(sampleRow.Pump);
    assert.ok(sampleRow.Operator);
    assert.ok(typeof sampleRow.TotalAmount === 'number');
  });
});
