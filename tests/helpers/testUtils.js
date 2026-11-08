/**
 * Test utilities and helper functions for screen and API integration testing.
 */

export const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * Log in with credentials and return the cookie header string.
 */
export async function loginAs(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  let cookieHeader = '';

  if (setCookie) {
    // Extract auth_token=...; portion
    const match = setCookie.match(/auth_token=([^;]+)/);
    if (match) {
      cookieHeader = `auth_token=${match[1]}`;
    }
  }

  return { status: res.status, data, cookie: cookieHeader };
}

/**
 * Perform authenticated GET request.
 */
export async function apiGet(path, cookie = '') {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

/**
 * Perform authenticated POST request.
 */
export async function apiPost(path, body, cookie = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

/**
 * Perform authenticated PUT request.
 */
export async function apiPut(path, body, cookie = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

/**
 * Perform authenticated DELETE request.
 */
export async function apiDelete(path, cookie = '') {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}
