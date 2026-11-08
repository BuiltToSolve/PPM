import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost, apiPut, apiDelete } from '../helpers/testUtils.js';

describe('Screen 8: All Debts Management (/debts)', () => {
  let adminCookie = '';
  let managerCookie = '';
  let sampleDebtSaleId = '';

  test('Authenticate as admin and manager', async () => {
    const admin = await loginAs('admin', 'RV@321');
    const mgr = await loginAs('manager', 'Manager@123');
    assert.equal(admin.status, 200);
    assert.equal(mgr.status, 200);
    adminCookie = admin.cookie;
    managerCookie = mgr.cookie;
  });

  test('Create a test sale with multiple client debt entries', async () => {
    const sale = {
      saleType: 'fuel',
      date: '2026-11-08',
      operatorId: '507f1f77bcf86cd799439011',
      operatorName: 'Debt Test Operator',
      pumpNumber: 2,
      fuels: [
        {
          fuelType: 'Diesel',
          openingReading: 2000,
          closingReading: 2050,
          testingQty: 0,
          saleQty: 50,
          rate: 90,
          totalQty: 50,
          totalAmount: 4500,
        },
      ],
      cashAmount: 1500,
      digitalAmount: 0,
      hpAmount: 0,
      debtAmount: 3000,
      debtSettled: false,
      debtEntries: [
        { clientName: 'Fleet A', amount: 1000, settled: false },
        { clientName: 'Fleet B', amount: 2000, settled: false },
      ],
      extraIncome: 0,
      expensesTotal: 0,
      totalAmount: 4500,
    };

    const res = await apiPost('/api/daily-sales', sale, adminCookie);
    assert.equal(res.status, 201);
    sampleDebtSaleId = res.data._id;
  });

  test('GET /api/debts lists debt records', async () => {
    const res = await apiGet('/api/debts?status=all', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    const found = res.data.find((d) => d._id === sampleDebtSaleId);
    assert.ok(found);
  });

  test('GET /api/debts?status=unsettled returns pending debt records', async () => {
    const res = await apiGet('/api/debts?status=unsettled', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(res.data.every((d) => d.debtSettled !== true));
  });

  test('PUT /api/daily-sales/:id settles single debt entry (Manager allowed)', async () => {
    assert.ok(sampleDebtSaleId);
    // Settle entry index 0 ('Fleet A')
    const res = await apiPut(`/api/daily-sales/${sampleDebtSaleId}`, { settleDebtEntryIndex: 0 }, managerCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.debtEntries[0].settled, true);
    assert.equal(res.data.debtEntries[1].settled, false);
    assert.equal(res.data.debtSettled, false); // Entry 1 still unsettled
  });

  test('PUT /api/daily-sales/:id settles entire remaining debt slip', async () => {
    assert.ok(sampleDebtSaleId);
    const res = await apiPut(`/api/daily-sales/${sampleDebtSaleId}`, { debtSettled: true }, managerCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.debtSettled, true);
    assert.ok(res.data.debtEntries.every((e) => e.settled === true));
  });

  test('GET /api/debts?status=settled includes the settled sale', async () => {
    const res = await apiGet('/api/debts?status=settled', adminCookie);
    assert.equal(res.status, 200);
    const found = res.data.find((d) => d._id === sampleDebtSaleId);
    assert.ok(found);
    assert.equal(found.debtSettled, true);
  });

  test('Clean up test debt sale', async () => {
    assert.ok(sampleDebtSaleId);
    const res = await apiDelete(`/api/daily-sales/${sampleDebtSaleId}`, adminCookie);
    assert.equal(res.status, 200);
  });
});
