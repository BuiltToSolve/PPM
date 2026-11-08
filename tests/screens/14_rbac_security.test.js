import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loginAs, apiGet, apiPost, apiPut, apiDelete } from '../helpers/testUtils.js';

describe('Screen 14: Role-Based Access Control (RBAC) & Security Enforcement', () => {
  let viewerCookie = '';
  let managerCookie = '';
  let adminCookie = '';

  test('Authenticate as admin, manager, and viewer', async () => {
    const admin = await loginAs('admin', 'RV@321');
    const mgr = await loginAs('manager', 'Manager@123');
    const vwr = await loginAs('viewer', 'Viewer@123');
    assert.equal(admin.status, 200);
    assert.equal(mgr.status, 200);
    assert.equal(vwr.status, 200);
    adminCookie = admin.cookie;
    managerCookie = mgr.cookie;
    viewerCookie = vwr.cookie;
  });

  test('Viewer has read access (200 OK) across all resource endpoints', async () => {
    const [sales, inv, cust, tanks, ops, rates, debts, dash] = await Promise.all([
      apiGet('/api/daily-sales', viewerCookie),
      apiGet('/api/inventory', viewerCookie),
      apiGet('/api/customers', viewerCookie),
      apiGet('/api/tanks', viewerCookie),
      apiGet('/api/operators', viewerCookie),
      apiGet('/api/fuel-rates', viewerCookie),
      apiGet('/api/debts', viewerCookie),
      apiGet('/api/dashboard', viewerCookie),
    ]);

    assert.equal(sales.status, 200);
    assert.equal(inv.status, 200);
    assert.equal(cust.status, 200);
    assert.equal(tanks.status, 200);
    assert.equal(ops.status, 200);
    assert.equal(rates.status, 200);
    assert.equal(debts.status, 200);
    assert.equal(dash.status, 200);
  });

  test('Viewer is rejected with 403 Forbidden on Daily Sales POST', async () => {
    const res = await apiPost('/api/daily-sales', { saleType: 'fuel' }, viewerCookie);
    assert.equal(res.status, 403);
    assert.match(res.data.error, /forbidden/i);
  });

  test('Viewer is rejected with 403 Forbidden on Customer registration POST', async () => {
    const res = await apiPost('/api/customers', { name: 'Unauthorized Customer' }, viewerCookie);
    assert.equal(res.status, 403);
    assert.match(res.data.error, /forbidden/i);
  });

  test('Viewer is rejected with 403 Forbidden on Tank Dip Log POST', async () => {
    const res = await apiPost('/api/tanks/dip-log', { dipCm: 100 }, viewerCookie);
    assert.equal(res.status, 403);
    assert.match(res.data.error, /forbidden/i);
  });

  test('Viewer is rejected with 403 Forbidden on Operators POST', async () => {
    const res = await apiPost('/api/operators', { name: 'Unauthorized' }, viewerCookie);
    assert.equal(res.status, 403);
    assert.match(res.data.error, /forbidden/i);
  });

  test('Viewer is rejected with 403 Forbidden on Inventory POST', async () => {
    const res = await apiPost('/api/inventory', { name: 'Unauthorized Lube' }, viewerCookie);
    assert.equal(res.status, 403);
    assert.match(res.data.error, /forbidden/i);
  });

  test('Viewer is rejected with 403 Forbidden on Fuel Rates POST', async () => {
    const res = await apiPost('/api/fuel-rates', { fuelType: 'Diesel', rate: 90 }, viewerCookie);
    assert.equal(res.status, 403);
    assert.match(res.data.error, /forbidden/i);
  });

  test('Manager is rejected with 403 Forbidden when attempting to DELETE records', async () => {
    const dummyId = '65f123456789012345678901';
    const [salesDel, opsDel, invDel, custDel] = await Promise.all([
      apiDelete(`/api/daily-sales/${dummyId}`, managerCookie),
      apiDelete(`/api/operators/${dummyId}`, managerCookie),
      apiDelete(`/api/inventory/${dummyId}`, managerCookie),
      apiDelete(`/api/customers/${dummyId}`, managerCookie),
    ]);

    assert.equal(salesDel.status, 403);
    assert.equal(opsDel.status, 403);
    assert.equal(invDel.status, 403);
    assert.equal(custDel.status, 403);
  });

  test('Manager is rejected with 403 Forbidden when attempting to edit sales details (non-debt)', async () => {
    const dummyId = '65f123456789012345678901';
    const res = await apiPut(`/api/daily-sales/${dummyId}`, {
      cashAmount: 1000,
      totalAmount: 1000,
      fuels: [],
    }, managerCookie);
    assert.equal(res.status, 403);
    assert.match(res.data.error, /managers cannot edit sales details/i);
  });
});
