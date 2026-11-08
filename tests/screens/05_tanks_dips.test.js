import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost } from '../helpers/testUtils.js';

describe('Screen 5: Underground Tanks & Dips (/tanks)', () => {
  let adminCookie = '';
  let tankId = '';
  let tankNumber = 1;

  test('Authenticate as admin', async () => {
    const res = await loginAs('admin', 'RV@321');
    assert.equal(res.status, 200);
    adminCookie = res.cookie;
  });

  test('GET /api/tanks returns seeded or active underground tanks', async () => {
    const res = await apiGet('/api/tanks', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
    const tank = res.data[0];
    assert.ok(tank._id);
    assert.ok(tank.tankNumber);
    assert.ok(tank.fuelType);
    assert.ok(tank.capacityLiters > 0);
    tankId = tank._id;
    tankNumber = tank.tankNumber;
  });

  test('POST /api/tanks/dip-log records dip rod reading and physical stock', async () => {
    assert.ok(tankId);
    const payload = {
      tankId,
      tankNumber,
      fuelType: 'Petrol',
      date: '2026-11-08',
      shift: 'Morning',
      dipCm: 145.5,
      waterDipCm: 0,
      physicalStockLiters: 14200,
    };
    const res = await apiPost('/api/tanks/dip-log', payload, adminCookie);
    assert.equal(res.status, 201);
    assert.ok(res.data._id);
    assert.equal(res.data.dipCm, 145.5);
    assert.equal(res.data.physicalStockLiters, 14200);
    assert.equal(res.data.waterDipCm, 0);
  });

  test('POST /api/tanks/dip-log logs water contamination dip height', async () => {
    assert.ok(tankId);
    const payload = {
      tankId,
      tankNumber,
      fuelType: 'Petrol',
      date: '2026-11-08',
      shift: 'Evening',
      dipCm: 144.0,
      waterDipCm: 1.2, // 1.2 cm water detected
      physicalStockLiters: 14050,
    };
    const res = await apiPost('/api/tanks/dip-log', payload, adminCookie);
    assert.equal(res.status, 201);
    assert.equal(res.data.waterDipCm, 1.2);
  });

  test('POST /api/tanks/dip-log rejects payload missing physical stock with 400', async () => {
    assert.ok(tankId);
    const invalidPayload = {
      tankId,
      date: '2026-11-08',
      dipCm: 140,
    };
    const res = await apiPost('/api/tanks/dip-log', invalidPayload, adminCookie);
    assert.equal(res.status, 400);
    assert.match(res.data.error, /required/i);
  });

  test('GET /api/tanks/dip-log returns chronological dip readings', async () => {
    const res = await apiGet('/api/tanks/dip-log', adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
  });
});
