import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost, apiPut, apiDelete } from '../helpers/testUtils.js';
import { dailySaleSchema } from '../../src/lib/validations.js';

describe('Screen 3: Daily Sales Management (/daily-sales)', () => {
  let adminCookie = '';
  let managerCookie = '';
  let createdSaleId = '';

  test('Authenticate as admin and manager', async () => {
    const admin = await loginAs('admin', 'RV@321');
    const mgr = await loginAs('manager', 'Manager@123');
    assert.equal(admin.status, 200);
    assert.equal(mgr.status, 200);
    adminCookie = admin.cookie;
    managerCookie = mgr.cookie;
  });

  test('Zod Unit Validation: valid fuel sale payload parses correctly', () => {
    const payload = {
      saleType: 'fuel',
      date: '2026-11-08',
      operatorId: '507f1f77bcf86cd799439011',
      operatorName: 'Ramesh Kumar',
      pumpNumber: 1,
      fuels: [
        {
          fuelType: 'Petrol',
          openingReading: 1000,
          closingReading: 1200,
          testingQty: 5,
          saleQty: 195,
          rate: 100,
          totalQty: 195,
          totalAmount: 19500,
        },
      ],
      cashAmount: 10000,
      digitalAmount: 9500,
      hpAmount: 0,
      debtAmount: 0,
      extraIncome: 0,
      expensesTotal: 0,
      totalAmount: 19500,
    };
    const parsed = dailySaleSchema.safeParse(payload);
    assert.equal(parsed.success, true);
  });

  test('Zod Unit Validation: closing reading < opening reading is rejected', () => {
    const invalidPayload = {
      saleType: 'fuel',
      date: '2026-11-08',
      operatorId: '507f1f77bcf86cd799439011',
      operatorName: 'Ramesh Kumar',
      pumpNumber: 1,
      fuels: [
        {
          fuelType: 'Petrol',
          openingReading: 1500,
          closingReading: 1200, // Invalid: closing < opening
          testingQty: 0,
          saleQty: 300,
          rate: 100,
          totalQty: 300,
          totalAmount: 30000,
        },
      ],
      cashAmount: 30000,
      totalAmount: 30000,
    };
    const parsed = dailySaleSchema.safeParse(invalidPayload);
    assert.equal(parsed.success, false);
    assert.match(parsed.error.issues[0].message, /cannot be less than/i);
  });

  test('GET /api/daily-sales returns sales list for a given date', async () => {
    const res = await apiGet('/api/daily-sales?date=2026-11-06', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  test('POST /api/daily-sales creates a new sale record', async () => {
    const newSale = {
      saleType: 'fuel',
      date: '2026-11-08',
      operatorId: '507f1f77bcf86cd799439011',
      operatorName: 'Unit Test Operator',
      pumpNumber: 1,
      fuels: [
        {
          fuelType: 'Petrol',
          openingReading: 5000,
          closingReading: 5050,
          testingQty: 5,
          saleQty: 45,
          rate: 100,
          totalQty: 45,
          totalAmount: 4500,
        },
      ],
      cashAmount: 2000,
      digitalAmount: 2000,
      hpAmount: 0,
      debtAmount: 500,
      debtSettled: false,
      debtEntries: [
        { clientName: 'Fleet Test 1', amount: 500, settled: false },
      ],
      extraIncome: 0,
      expensesTotal: 0,
      totalAmount: 4500,
    };

    const res = await apiPost('/api/daily-sales', newSale, adminCookie);
    assert.equal(res.status, 201);
    assert.ok(res.data._id);
    assert.equal(res.data.totalAmount, 4500);
    assert.equal(res.data.operatorName, 'Unit Test Operator');
    createdSaleId = res.data._id;
  });

  test('PUT /api/daily-sales/:id updates an existing sale record', async () => {
    assert.ok(createdSaleId, 'Sale ID must exist');
    const updatePayload = {
      cashAmount: 2500,
      digitalAmount: 2000,
      hpAmount: 0,
      debtAmount: 0,
      debtSettled: true,
      totalAmount: 4500,
    };
    const res = await apiPut(`/api/daily-sales/${createdSaleId}`, updatePayload, adminCookie);
    assert.equal(res.status, 200);
  });

  test('DELETE /api/daily-sales/:id removes the test sale (Admin only)', async () => {
    assert.ok(createdSaleId, 'Sale ID must exist');
    const res = await apiDelete(`/api/daily-sales/${createdSaleId}`, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
  });
});
