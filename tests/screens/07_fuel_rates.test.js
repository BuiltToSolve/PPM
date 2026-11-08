import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost, apiPut } from '../helpers/testUtils.js';

describe('Screen 7: Fuel Rates Configuration (/fuel-rates)', () => {
  let adminCookie = '';
  let managerCookie = '';
  let petrolRateId = '';

  test('Authenticate as admin and manager', async () => {
    const admin = await loginAs('admin', 'RV@321');
    const mgr = await loginAs('manager', 'Manager@123');
    assert.equal(admin.status, 200);
    assert.equal(mgr.status, 200);
    adminCookie = admin.cookie;
    managerCookie = mgr.cookie;
  });

  test('GET /api/fuel-rates returns active fuel rates with prices', async () => {
    const res = await apiGet('/api/fuel-rates', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
    const petrol = res.data.find((f) => f.fuelType === 'Petrol');
    assert.ok(petrol);
    assert.ok(typeof petrol.rate === 'number');
    petrolRateId = petrol._id;
  });

  test('POST /api/fuel-rates upserts fuel rate successfully (Admin only)', async () => {
    const payload = {
      fuelType: 'CNG',
      rate: 89.5,
    };
    const res = await apiPost('/api/fuel-rates', payload, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.rate, 89.5);
  });

  test('PUT /api/fuel-rates/:id updates existing rate (Admin only)', async () => {
    assert.ok(petrolRateId);
    const res = await apiPut(`/api/fuel-rates/${petrolRateId}`, { rate: 104.5 }, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.rate, 104.5);
  });

  test('POST /api/fuel-rates rejects non-admin (Manager) with 403 Forbidden', async () => {
    const payload = { fuelType: 'Diesel', rate: 95.0 };
    const res = await apiPost('/api/fuel-rates', payload, managerCookie);
    assert.equal(res.status, 403);
  });

  test('POST /api/fuel-rates rejects invalid payload missing fuelType with 400', async () => {
    const res = await apiPost('/api/fuel-rates', { rate: 100 }, adminCookie);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /required/i);
  });
});
